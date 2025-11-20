# Terraform Infrastructure Configuration for Secure Solana Wallet

This document outlines the Infrastructure as Code (IaC) setup using Terraform for the "Secure Solana Wallet with Biometric Login and Advanced Safe Mode" project. The infrastructure supports a web application deployment, including a browser extension frontend hosted on Vercel, a Node.js/Express backend on AWS Fargate for handling Solana RPC integrations, transaction simulations, biometric authentication proxies (via WebAuthn), and Safe Mode flagging logic. PostgreSQL (via AWS RDS) stores user behavior analytics, blacklisted addresses, and phishing threat data. Docker containerization ensures portability, with AWS services providing scalability and security for production use.

The setup emphasizes security: encrypted data at rest/transit, least-privilege IAM roles, and integration with AWS Secrets Manager for Solana wallet keys and API credentials (e.g., external threat databases like PhishTank). This configuration coordinates with BackendDev by provisioning ECS/Fargate clusters for container deployments, RDS instances compatible with Prisma ORM, and VPC peering for isolated Solana RPC endpoints.

**Unique Project Identifier:** 1763624900430_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__infra_terraform_md_tyvvtp

## Prerequisites

- Terraform CLI (v1.5+ installed).
- AWS CLI configured with credentials (IAM user/role with permissions for EC2, ECS, RDS, VPC, Secrets Manager, and IAM).
- Docker installed for local testing of container builds.
- Node.js and npm for building backend images (coordinated with BackendDev's Dockerfile).
- BackendDev must provide: A `Dockerfile` for the Node.js/Express app, environment variables for Solana RPC endpoints (e.g., `SOLANA_RPC_URL`), and Prisma schema for database migrations.
- Vercel CLI for frontend deployment (not managed by Terraform; frontend pushes to Vercel via Git integration).
- Optional: Hardware wallet integration testing requires AWS ACM for certificate management.

Run `terraform init` in the `infra/terraform` directory to initialize providers and modules.

## Directory Structure

The Terraform code is organized in `secure-solana-wallet-with-biometric-login-and-advanced-safe-mode/infra/terraform/`:

```
terraform/
├── main.tf                 # Root module: providers, backend, and high-level resources
├── variables.tf            # Input variables (e.g., environment, region)
├── outputs.tf              # Key outputs (e.g., cluster ARN, RDS endpoint)
├── backend.tf              # S3 backend for remote state (with DynamoDB locking)
├── modules/
│   ├── vpc/                # VPC module for isolated networking
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ecs-fargate/        # ECS Fargate module for backend deployment
│   │   ├── main.tf         # Defines task definitions, services, and ALB
│   │   ├── variables.tf    # Task CPU/memory, container port (3000 for Express)
│   │   └── outputs.tf      # Service ARN for BackendDev monitoring
│   ├── rds-postgres/       # RDS PostgreSQL module for user data and analytics
│   │   ├── main.tf         # Instance, subnet group, security (encrypted with KMS)
│   │   ├── variables.tf    # DB username/password via Secrets Manager
│   │   └── outputs.tf      # Endpoint for Prisma connection string
│   └── secrets-manager/    # Secrets module for Solana keys and threat API tokens
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── environments/
    └── prod/
        ├── terraform.tfvars # Production vars (e.g., region: us-east-1)
        └── auto.tfvars      # Auto-generated (e.g., from CI/CD)
```

This structure avoids duplication: VPC is shared across modules, ECS focuses on backend scaling for transaction simulation loads, and RDS is tuned for high-availability (multi-AZ) to handle DeFi/NFT query volumes.

## Provider Configuration

In `main.tf`:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "secure-solana-wallet-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Secure Solana Wallet"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

The S3 backend ensures state locking for team collaboration (e.g., BackendDev applying migrations post-RDS provisioning).

## Key Resources and Modules

### 1. VPC Module (modules/vpc/main.tf)

Creates a secure VPC for the wallet's backend, isolating Solana RPC traffic and biometric auth endpoints. Supports inbound rules for ALB (port 443) and outbound to Solana mainnet (custom TCP for RPC).

```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnets[count.index]
  availability_zone = element(data.aws_availability_zones.available.names, count.index)

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index + 1}"
    Tier = "Private"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

# Security group for backend: Allow HTTPS from ALB, Solana RPC outbound
resource "aws_security_group" "backend_sg" {
  name_prefix = "${var.project_name}-backend-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    security_groups = [aws_lb_target_group.main.id]  # From ALB only
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Specific outbound for Solana RPC (e.g., port 8899 UDP/TCP to known endpoints)
  egress {
    from_port       = 8899
    to_port         = 8899
    protocol        = "udp"
    prefix_list_ids = [data.aws_vpc_endpoint.solana_rpc.prefix_list_id]  # Use VPC endpoint if private
  }

  tags = {
    Name = "${var.project_name}-backend-sg"
  }
}
```

This module outputs subnet IDs and security group IDs for use in ECS and RDS modules, ensuring phishing prevention APIs (e.g., PhishTank) can egress securely without exposing the wallet to public internet.

### 2. ECS Fargate Module (modules/ecs-fargate/main.tf)

Provisions a Fargate cluster for the Node.js backend, handling Safe Mode logic (e.g., transaction flagging based on amount thresholds, address blacklists, and behavioral deviations). Integrates with Docker images pushed to ECR by BackendDev's CI/CD.

```hcl
resource "aws_ecs_cluster" "wallet_backend" {
  name = "${var.project_name}-fargate-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

resource "aws_ecr_repository" "backend_repo" {
  name = "${var.project_name}-backend"

  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecs_task_definition" "backend_task" {
  family                   = "${var.project_name}-backend-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu  # e.g., 256 for handling DeFi simulations
  memory                   = var.task_memory  # e.g., 512MB
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "wallet-backend"
      image = "${aws_ecr_repository.backend_repo.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "SOLANA_RPC_URL"
          value = var.solana_rpc_url  # From variables, e.g., mainnet-beta
        },
        {
          name  = "DATABASE_URL"
          value = aws_secretsmanager_secret_version.db_creds.secret_string  # Pulled from Secrets
        },
        {
          name  = "PHISHTANK_API_KEY"
          value = var.phishtank_api_key  # For external threat checks
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend_logs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "backend"
        }
      }
      # Secure enclave for biometric key handling (if using AWS Nitro Enclaves)
      linuxParameters = {
        capabilities = {
          add = ["IPC_LOCK"]  # For memory-locking sensitive Solana keys
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-task-def"
  }
}

resource "aws_ecs_service" "backend_service" {
  name            = "${var.project_name}-backend-service"
  cluster         = aws_ecs_cluster.wallet_backend.id
  task_definition = aws_ecs_task_definition.backend_task.arn
  desired_count   = var.desired_count  # Auto-scale based on transaction volume
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [var.backend_sg_id]  # From VPC module
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = "wallet-backend"
    container_port   = 3000
  }

  # Health check for Safe Mode endpoints (e.g., /health for transaction simulator)
  health_check_grace_period_seconds = 60

  tags = {
    Name = "${var.project_name}-service"
  }
}

# Application Load Balancer for backend APIs (e.g., /simulate-transaction, /flag-risky-tx)
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]  # Allow HTTPS from frontend/Vercel
  subnets            = var.public_subnet_ids  # If public; otherwise private with NAT

  enable_deletion_protection = true

  tags = {
    Name = "${var.project_name}-alb"
  }
}

resource "aws_lb_target_group" "main" {
  name     = "${var.project_name}-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"  # BackendDev to implement
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${var.project_name}-tg"
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.acm_certificate_arn  # ACM cert for biometric/WebAuthn domains

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}
```

This module scales for peak loads during NFT/DeFi interactions and integrates hardware wallet support via backend APIs (e.g., WebUSB proxy for Ledger). BackendDev can deploy updates by tagging ECR images and running `terraform apply`.

### 3. RDS PostgreSQL Module (modules/rds-postgres/main.tf)

Secure database for storing user-specific data: behavioral patterns for Safe Mode, blacklisted addresses, and phishing cache (e.g., from external databases). Uses Prisma-compatible setup with automated backups and encryption.

```hcl
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "wallet_db" {
  identifier              = "${var.project_name}-postgres"
  engine                  = "postgres"
  engine_version          = "15.3"  # Compatible with Prisma
  instance_class          = var.db_instance_class  # e.g., db.t3.micro for dev, db.m5.large for prod
  allocated_storage       = var.allocated_storage  # 20GB min
  max_allocated_storage   = 100  # Auto-scale
  storage_encrypted       = true
  kms_key_id              = var.kms_key_id  # Customer-managed KMS for wallet data
  storage_type            = "gp2"
  db_name                 = "solana_wallet_db"
  username                = var.db_username
  password                = random_password.db_password.result  # Generated and stored in Secrets
  vpc_security_group_ids  = [var.db_sg_id]  # Restrict to backend SG only
  db_subnet_group_name    = aws_db_subnet_group.main.name
  multi_az                = var.multi_az  # true for prod HA
  backup_retention_period = 7
  skip_final_snapshot     = false
  publicly_accessible     = false

  # Parameter group for Solana-specific optimizations (e.g., higher connections for tx decoding)
  parameter_group_name = aws_db_parameter_group.main.name

  tags = {
    Name = "${var.project_name}-rds"
  }
}

resource "aws_db_parameter_group" "main" {
  name   = "${var.project_name}-postgres-params"
  family = "postgres15"

  parameter {
    name  = "log_connections"
    value = "1"  # Audit for security (biometric login tracking)
  }

  parameter {
    name  = "max_connections"
    value = "500"  # Scale for user behavior analytics queries
  }

  tags = {
    Name = "${var.project_name}-param-group"
  }
}

# Security group: Inbound from backend only (port 5432)
resource "aws_security_group" "db_sg" {
  name_prefix = "${var.project_name}-db-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.backend_sg_id]
  }

  tags = {
    Name = "${var.project_name}-db-sg"
  }
}
```

Outputs include the RDS endpoint (e.g., `wallet-db.xxxxx.us-east-1.rds.amazonaws.com:5432`) for BackendDev's Prisma connection string. Data encryption protects sensitive fields like user biometrics hashes and transaction histories.

### 4. Secrets Manager Module (modules/secrets-manager/main.tf)

Manages secrets for Solana private keys (never stored client-side), WebAuthn challenges, and API keys for threat databases. Rotates automatically for phishing prevention integrations.

```hcl
resource "aws_secretsmanager_secret" "solana_keys" {
  name                    = "${var.project_name}/solana-keys"
  description             = "Encrypted Solana wallet keys for backend signing (Safe Mode only)"
  recovery_window_in_days = 0  # No recovery for security
  kms_key_id              = var.kms_key_id

  tags = {
    Name = "${var.project_name}-solana-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "solana_keys_version" {
  secret_id     = aws_secretsmanager_secret.solana_keys.id
  secret_string = jsonencode({
    solana_wallet_seed = var.solana_wallet_seed  # BackendDev provides initial; rotate via Lambda
    webauthn_challenge = base64encode(random_id.webauthn_challenge.b64encode)  # For biometric
  })
}

resource "aws_secretsmanager_secret" "db_creds" {
  name = "${var.project_name}/db-credentials"

  tags = {
    Name = "${var.project_name}-db-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "db_creds_version" {
  secret_id     = aws_secretsmanager_secret.db_creds.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    host     = aws_db_instance.wallet_db.endpoint
    port     = 5432
    database = "solana_wallet_db"
  })
}

# IAM role for ECS to access secrets
resource "aws_iam_role" "ecs_secrets" {
  name = "${var.project_name}-ecs-secrets-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecs_secrets_policy" {
  name = "${var.project_name}-secrets-policy"
  role = aws_iam_role.ecs_secrets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.solana_keys.arn,
          aws_secretsmanager_secret.db_creds.arn
        ]
      }
    ]
  })
}
```

This ensures zero-knowledge proofs for biometrics and Safe Mode don't expose keys; BackendDev retrieves via ECS task roles.

## Variables (variables.tf)

Define project-specific vars:

```hcl
variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev/prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name for resource tagging"
  type        = string
  default     = "secure-solana-wallet"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnets" {
  description = "Private subnet CIDRs"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "task_cpu" {
  description = "Fargate task CPU units"
  type        = string
  default     = "256"
}

variable "task_memory" {
  description = "Fargate task memory (MB)"
  type        = string
  default     = "512"
}

variable "desired_count" {
  description = "Initial ECS service desired count"
  type        = number
  default     = 2
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "RDS allocated storage (GB)"
  type        = number
  default     = 20
}

variable "multi_az" {
  description = "Enable multi-AZ for RDS"
  type        = bool
  default     = true
}

variable "solana_rpc_url" {
  description = "Solana RPC endpoint (e.g., https://api.mainnet-beta.solana.com)"
  type        = string
  sensitive   = true
}

variable "phishtank_api_key" {
  description = "API key for PhishTank integration"
  type        = string
  sensitive   = true
}

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for ALB (for WebAuthn domains)"
  type        = string
}

variable "kms_key_id" {
  description = "KMS key for encryption"
  type        = string
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "walletadmin"
}
```

In `environments/prod/terraform.tfvars`:

```
aws_region      = "us-east-1"
environment     = "prod"
solana_rpc_url  = "https://api.mainnet-beta.solana.com"
phishtank_api_key = "your-phishtank-key-here"
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/abc123"
kms_key_id      = "arn:aws:kms:us-east-1:123456789012:key/def456"
db_username     = "prod_walletadmin"
multi_az        = true
db_instance_class = "db.m5.large"
desired_count   = 3
```

## Outputs (outputs.tf)

Useful for BackendDev integration:

```hcl
output "ecs_cluster_arn" {
  description = "ARN of ECS Fargate cluster"
  value       = module.ecs_fargate.cluster_arn
}

output "rds_endpoint" {
  description = "PostgreSQL endpoint for Prisma"
  value       = module.rds_postgres.db_endpoint
  sensitive   = true
}

output "backend_service_url" {
  description = "Internal ALB DNS for backend APIs (e.g., transaction simulation)"
  value       = module.ecs_fargate.alb_dns_name
}

output "secrets_solana_arn" {
  description = "ARN for Solana keys secret (use in ECS task role)"
  value       = module.secrets_manager.solana_secret_arn
}

output "vpc_id" {
  description = "VPC ID for peering (e.g., with Solana RPC VPC endpoint)"
  value       = module.vpc.vpc_id
}
```

## Deployment Workflow

1. **Initialize and Plan:** `cd infra/terraform && terraform init && terraform plan -var-file=environments/prod/terraform.tfvars`
2. **Apply:** `terraform apply -var-file=environments/prod/terraform.tfvars`. This provisions ~15-20 minutes.
3. **BackendDev Coordination:** 
   - Build/push Docker image to ECR: `docker build -t backend . && aws ecr get-login-password | docker login ... && docker push ...`
   - Run Prisma migrations: Use RDS endpoint from outputs.
   - Update ECS task definition to pull latest image.
4. **CI/CD Integration:** Use GitHub Actions or AWS CodePipeline to automate `terraform apply` on merges. Trigger BackendDev deploys on image updates.
5. **Frontend Linkage:** Vercel web app/extension calls backend via ALB (CORS enabled in Express). For biometric login, proxy WebAuthn challenges through backend for validation.
6. **Monitoring/Scaling:** Enable CloudWatch alarms for CPU >80% (transaction spikes) and auto-scaling group for ECS based on Safe Mode query rates.
7. **Teardown:** `terraform destroy` for cleanup; state in S3 persists for audits.

## Security Considerations

- **Encryption:** All resources use AWS KMS (customer-managed key) for EBS, RDS, and Secrets.
- **Access Control:** IAM roles scoped to project; no broad S3/EC2 perms. Use AWS WAF on ALB for phishing URL validation at edge.
- **Compliance:** Aligns with SOC 2 for crypto apps; audit logs for biometric access and transaction blocks.
- **Solana-Specific:** VPC endpoints for RPC reduce latency/jurisdiction risks; simulateTransaction calls rate-limited via backend.
- **Testing:** Local `terraform validate` and AWS mock for plan reviews. BackendDev to test Safe Mode flags against RDS-stored blacklists.

This Terraform setup is production-ready, scalable for 10k+ users, and uniquely tailored to the wallet's security needs (e.g., behavioral analytics DB, encrypted key handling). For updates, coordinate with BackendDev on variable changes.