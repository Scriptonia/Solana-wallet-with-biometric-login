# Secrets Management in Secure Solana Wallet Infrastructure

## Overview

In the Secure Solana Wallet project, secrets management is a critical component of our infrastructure to ensure the confidentiality and integrity of sensitive data such as database credentials, API keys for external threat databases (e.g., PhishTank integrations for phishing prevention), Solana RPC endpoints, and any backend service tokens used for transaction simulation previews or DeFi protocol interactions. Given the high-security nature of a biometric-enabled Solana wallet with Safe Mode features, we prioritize secure handling to mitigate risks like credential exposure in logs, unauthorized access to wallet-related operations, or compromise of biometric/WebAuthn session keys.

This document outlines the identification, storage, injection, rotation, and auditing of secrets across development, staging, and production environments. Our approach leverages AWS Secrets Manager as the primary vault for cloud deployments (aligned with AWS Fargate/Lambda hosting), with fallback to HashiCorp Vault for on-premises or hybrid setups. For local development, we use `.env` files managed via `dotenv`. All practices comply with zero-trust principles, ensuring secrets are never committed to version control (e.g., via `.gitignore` exclusions).

Secrets are injected dynamically during container startup in Dockerized environments, supporting our Node.js/Express backend and Next.js frontend deployments. This setup coordinates with BackendDev for seamless integration into CI/CD pipelines (e.g., GitHub Actions or AWS CodePipeline), where secrets are fetched via IAM roles rather than direct exposure.

## Identified Secrets

Based on the project's technical requirements—integrating Solana RPC for wallet operations, WebAuthn for biometric authentication, rule-based transaction flagging, and external API checks—we categorize secrets as follows. These are tailored to our web application platform, focusing on backend services that handle non-wallet-core logic (e.g., threat database queries to support Safe Mode's phishing prevention).

### Database and Infrastructure Secrets
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://user:password@host:5432/solana_wallet_db`). Used by Prisma ORM for storing user behavior analytics (e.g., deviation tracking for Safe Mode flags) and transaction history metadata.
- `REDIS_URL`: Redis connection for caching Solana transaction simulations (to avoid RPC rate limits during Safe Mode previews). Example: `redis://host:6379`.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: For S3 storage of NFT metadata or biometric enrollment artifacts (if offloaded from client-side secure enclaves).

### Solana Blockchain and Wallet Integration Secrets
- `SOLANA_RPC_URL`: Endpoint for Solana RPC (e.g., mainnet-beta or devnet via Alchemy or QuickNode). Includes API key suffix: `https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY`.
- `SOLANA_PROGRAM_ID`: Derived address (PDA) keys for custom Safe Mode programs (e.g., for on-chain transaction validation rules). Stored as encrypted base58 strings.
- `HARDWARE_WALLET_SECRET`: Shared secret for optional Ledger/YubiKey integration via WebUSB/WebHID (backend proxy for cross-origin requests). Rotated per user session.

### External Service and Security Secrets
- `PHISHTANK_API_KEY`: For real-time phishing domain validation in Safe Mode (integrates with PhishTank or similar blockchain threat feeds).
- `THREAT_DB_API_KEY`: API key for external databases checking blacklisted addresses or unusual instructions (e.g., integration with Chainalysis or custom Solana-specific feeds).
- `WEB_AUTHN_CHALLENGE_SECRET`: Server-side secret for generating WebAuthn challenges during biometric login (e.g., FaceID or TouchID verification). Hashed with PBKDF2 for storage.
- `JWT_SECRET`: For signing session tokens in backend auth flows (post-biometric login, to secure DeFi protocol interactions or SPL token transfers).

### Application-Specific Secrets
- `ENCRYPTION_KEY`: AES-256 key for encrypting local storage of user-derived keys (e.g., in browser extension for transaction decoding previews).
- `LOGGING_SINK_KEY`: For secure logging to AWS CloudWatch (excludes any PII or wallet addresses to prevent exposure in Safe Mode alerts).

**Note**: Client-side wallet private keys (e.g., for signing SPL tokens or NFTs) are never stored as backend secrets; they remain in browser secure contexts (e.g., WebCrypto API) or hardware wallets. Backend secrets focus on service-level protections.

## Storage and Access Strategies

### Development Environment
- Use `.env.local` files (ignored in Git) loaded via `dotenv` in Node.js/Next.js.
- Example structure:
  ```
  DATABASE_URL=postgresql://devuser:devpass@localhost:5432/solana_wallet_dev
  SOLANA_RPC_URL=https://api.devnet.solana.com
  PHISHTANK_API_KEY=dev_phishtank_key_123
  ```
- For biometric testing, mock WebAuthn secrets with a dev-only `MOCK_BIOMETRIC_SECRET`.
- Access: Local `dotenv` loading in `package.json` scripts (e.g., `npm run dev`).

### Staging and Production Environments
- **Primary Vault: AWS Secrets Manager**
  - Secrets are stored as JSON objects for structured access (e.g., `{"SOLANA_RPC_URL": "https://...", "PHISHTANK_API_KEY": "..."}`).
  - Creation via AWS CLI or Terraform (see `infra/terraform/secrets.tf` for provisioning):
    ```hcl
    resource "aws_secretsmanager_secret" "solana_wallet_secrets" {
      name = "secure-solana-wallet/prod-secrets"
      description = "Secrets for Safe Mode and biometric backend services"
    }

    resource "aws_secretsmanager_secret_version" "solana_secrets_version" {
      secret_id     = aws_secretsmanager_secret.solana_wallet_secrets.id
      secret_string = jsonencode({
        DATABASE_URL      = "postgresql://produser:${var.db_password}@prod-host:5432/solana_wallet_prod"
        SOLANA_RPC_URL    = "https://solana-mainnet.g.alchemy.com/v2/${var.alchemy_key}"
        WEB_AUTHN_CHALLENGE_SECRET = var.webauthn_secret
      })
    }
    ```
  - Access Control: IAM roles for ECS Fargate tasks (e.g., `arn:aws:iam::account:role/solana-backend-role`) with `secretsmanager:GetSecretValue` policy limited to specific ARNs. No static credentials in task definitions.
  - Rotation: Automated via AWS Lambda functions (e.g., rotate `DATABASE_URL` every 90 days, excluding immutable keys like `SOLANA_PROGRAM_ID`).

- **Alternative: HashiCorp Vault** (for multi-cloud or air-gapped deploys)
  - Path: `secret/solana-wallet/prod`.
  - KV v2 engine for versioning: `vault kv put secret/solana-wallet/prod database_url="..." solana_rpc_url="..."`.
  - Authentication: AppRole for Docker containers, with dynamic credentials for PostgreSQL.

- **Browser Extension Considerations**: For web extension deploys (e.g., Chrome Web Store), embed no secrets; fetch backend-configured values via authenticated API calls post-biometric login.

## Injection into Applications

### Docker Integration
- Secrets are mounted as volumes or injected via environment variables at runtime.
- Example `Dockerfile` snippet for backend (Node.js/Express):
  ```dockerfile
  # Build stage
  FROM node:18-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production

  # Runtime stage
  FROM node:18-alpine
  WORKDIR /app
  COPY --from=builder /app/node_modules ./node_modules
  COPY . .

  # Fetch secrets at runtime (AWS example)
  ENV AWS_REGION=us-east-1
  CMD ["sh", "-c", "aws secretsmanager get-secret-value --secret-id secure-solana-wallet/prod-secrets --query SecretString | jq -r '.DATABASE_URL' > .env && npm start"]
  ```
- For frontend (Next.js on Vercel): Use Vercel Environment Variables dashboard, synced from AWS Secrets Manager via API hooks in CI/CD.

### CI/CD Pipeline Integration
- In GitHub Actions (or AWS CodePipeline), use OIDC for secretless auth:
  ```yaml
  # .github/workflows/deploy.yml
  jobs:
    deploy:
      runs-on: ubuntu-latest
      permissions:
        id-token: write
        contents: read
      steps:
        - uses: aws-actions/configure-aws-credentials@v4
          with:
            role-to-assume: arn:aws:iam::account:role/github-actions-role
            aws-region: us-east-1
        - run: aws secretsmanager get-secret-value --secret-id secure-solana-wallet/staging-secrets --query SecretString --output text > secrets.json
        - run: docker build --build-arg SECRET_JSON=$(cat secrets.json) -t solana-backend .
        - run: aws ecr get-login-password | docker login --username AWS --password-stdin account.dkr.ecr.us-east-1.amazonaws.com
        - run: docker push solana-backend:latest
  ```
- BackendDev Coordination: Expose secrets via `process.env` in Express middleware (e.g., `app.use((req, res, next) => { const rpcUrl = process.env.SOLANA_RPC_URL; /* Use for transaction simulation */ })`), ensuring validation for Safe Mode flags.

### Vercel-Specific Handling
- For web app deploys: Define env vars in Vercel project settings, pulled from AWS Secrets Manager using Vercel's integration or custom scripts. Example for biometric challenges: Link `WEB_AUTHN_CHALLENGE_SECRET` to preview branches for testing FaceID simulations.

## Security Best Practices and Auditing

- **Least Privilege**: Secrets ARNs are scoped (e.g., `arn:aws:secretsmanager:us-east-1:account:secret:secure-solana-wallet/prod-*`), with rotation policies excluding high-entropy keys like `ENCRYPTION_KEY`.
- **Encryption in Transit/Rest**: All secrets use AWS KMS (customer-managed keys) for envelope encryption. Transit via HTTPS/TLS 1.3.
- **Monitoring and Auditing**: Enable AWS CloudTrail for Secrets Manager API calls. Integrate with Sentry for leak detection in logs (e.g., mask `SOLANA_RPC_URL` in error outputs). Use Prisma's query logging with secret redaction for database ops.
- **Rotation and Revocation**: Automate rotation for volatile secrets (e.g., API keys) using AWS Secrets Manager rotation lambdas. For Solana-specific, monitor RPC key usage via provider dashboards and revoke on anomaly detection (ties into Safe Mode behavioral flags).
- **Incident Response**: In case of breach (e.g., compromised `PHISHTANK_API_KEY` affecting phishing prevention), use Vault's soft-delete or AWS versioning to rollback. Notify via Slack webhook integrated in CI/CD.
- **Compliance**: Aligns with SOC 2 and GDPR for user data (e.g., no biometric raw data in secrets; only derived challenges). Regular audits via `aws secretsmanager describe-secret --secret-id ...` in maintenance scripts.

## Troubleshooting and Maintenance

- **Common Issues**:
  - Injection Failure: Check IAM permissions if `AccessDenied` on `GetSecretValue`.
  - Rotation Breaks: Test in staging; use canary deploys for backend services handling SPL token validations.
  - Local Dev Sync: Script to pull staging secrets (redacted) for e2e testing of transaction decoding.

- **Updates**: Review this doc quarterly or on major releases (e.g., adding Ledger support). Reference unique ID: `1763624900488_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__infra_secrets_management_md_afbngr` for versioning.

For BackendDev: Ensure all secret-dependent endpoints (e.g., `/api/threat-check` for blacklisted addresses) handle missing env vars with graceful fallbacks to mock data in dev.

This configuration ensures our Solana wallet's infrastructure remains robust against threats, directly supporting the biometric login and Safe Mode features without exposing user assets.