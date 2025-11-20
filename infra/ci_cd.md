# CI/CD Pipeline Configuration for Secure Solana Wallet

## Overview

This document outlines the comprehensive CI/CD pipeline for the "Secure Solana Wallet with Biometric Login and Advanced Safe Mode" project. The pipeline is designed to ensure secure, automated, and reliable deployment of the web application, browser extension, and supporting backend services. Leveraging the project's focus on Solana blockchain integration, biometric authentication (via WebAuthn for fingerprint, FaceID, TouchID, and Windows Hello), and advanced Safe Mode features (transaction flagging for large amounts, blacklisted addresses, unusual instructions, and behavioral deviations), the pipeline emphasizes security scans, thorough testing of Solana-specific operations, and phishing prevention validations.

The pipeline supports:
- **Primary Platforms**: Web app (Next.js) and browser extension (Chrome/Firefox manifests).
- **Backend**: Node.js + Express for handling Solana RPC interactions, transaction simulations, external threat database integrations (e.g., PhishTank APIs), and user behavior analytics.
- **Database**: PostgreSQL with Prisma ORM for storing user preferences, transaction histories, and blacklisted address caches.
- **Hosting**: Vercel for frontend/web app, AWS Fargate for backend containers, and Docker for containerization.
- **Key Integrations**: Solana RPC for wallet operations, SPL token/NFT support, DeFi protocol decoding, and optional hardware wallet (Ledger/YubiKey) via WebUSB/WebHID.

The CI/CD strategy uses **GitHub Actions** as the orchestration tool, with Docker for builds, Jest/Vitest for testing, and Terraform for infrastructure provisioning. Pipelines trigger on pull requests (PRs), merges to `main`, and scheduled security audits. All deployments include multi-stage approvals for production releases to align with the project's security-first ethos.

Coordination Note: This pipeline provides deployment artifacts (e.g., Docker images, built extensions) for BackendDev to consume in their API endpoints and Solana program deployments. BackendDev can reference the `backend-deploy` job outputs for AWS Fargate task definitions.

## Tools and Dependencies

- **CI/CD Orchestrator**: GitHub Actions (workflows in `.github/workflows/`).
- **Build & Packaging**: Docker (multi-stage builds), npm/yarn for Node.js/Next.js.
- **Testing**: 
  - Unit/Integration: Jest with @solana/web3.js mocks for transaction simulations.
  - E2E: Cypress for web app flows (biometric login simulations, Safe Mode triggers).
  - Security: Snyk for vulnerability scans, Solana-specific linting via `solana-program-library` tools.
- **Linting/Formatting**: ESLint, Prettier, TypeScript checks.
- **Deployment**:
  - Frontend: Vercel CLI integration.
  - Backend: AWS CLI for Fargate, ECR for image registry.
  - Infrastructure: Terraform for AWS resources (e.g., RDS for PostgreSQL, Lambda for phishing API proxies).
- **Secrets Management**: GitHub Secrets for Solana RPC endpoints, AWS credentials, WebAuthn test keys, and external API tokens (e.g., PhishTank).
- **Monitoring**: Integrates with Datadog for pipeline metrics and Solana transaction alerts.

## Pipeline Structure

The project uses three main workflows:
1. **CI Pipeline** (`ci.yml`): Runs on every PR and push to feature branches. Focuses on build, test, and validation.
2. **CD Pipeline** (`cd.yml`): Deploys to staging on `main` merges; requires manual approval for production.
3. **Security & Infra Pipeline** (`security-infra.yml`): Scheduled weekly, plus on-demand for infra changes.

### 1. CI Pipeline (`ci.yml`)

This workflow ensures code quality before merging. It runs in parallel for frontend, backend, and extension components.

#### Jobs:
- **Checkout & Setup**:
  - Checks out code with full history for Git blame in tests.
  - Sets up Node.js (v20), Rust (for Solana CLI tools), and Docker.
  - Installs dependencies: `npm ci` for frontend/backend, `cargo install solana-cli` for Solana validations.

- **Lint & Format** (`lint-job`):
  - Runs `npm run lint` (ESLint for TypeScript, includes Solana anchor rules for any PDA interactions).
  - Prettier formatting check.
  - Specific to project: Validates biometric WebAuthn implementations against W3C standards; flags insecure key storage in localStorage mocks.

- **Unit & Integration Tests** (`test-job`):
  - **Frontend Tests**: Jest for Next.js components (e.g., biometric login UI, Safe Mode warning modals). Mocks Solana wallet connections using `@solana/wallet-adapter-react`.
  - **Backend Tests**: Jest for Express routes (e.g., transaction flagging endpoint: simulates large-amount transfers to blacklisted addresses, checks URL validation against PhishTank).
  - **Solana-Specific Tests**:
    - Uses `solana-test-validator` in Docker to spin up a local cluster.
    - Tests SPL token transfers, NFT metadata fetches, and DeFi protocol simulations (e.g., via Jupiter API mocks).
    - Behavioral deviation checks: Analyzes mock transaction histories for anomalies (e.g., unusual instruction patterns).
  - Coverage threshold: >85% for core security modules (biometric auth, Safe Mode).
  - Hardware Wallet Mocks: Simulates Ledger/YubiKey via `ledgerjs` stubs for signing flows.

- **E2E Tests** (`e2e-job`):
  - Cypress runs in headless mode on a Chrome instance.
  - Scenarios:
    - Biometric login flow: Mocks FaceID/TouchID via browser APIs; verifies session tokens.
    - Safe Mode activation: Triggers phishing URL entry, validates simulation preview blocks risky tx (e.g., first-time address with high SOL amount).
    - Cross-browser: Tests extension popup for Chrome/Firefox, including WebAuthn credential assertions.
  - Runs against a staging Solana devnet RPC.

- **Build Artifacts** (`build-job`):
  - **Frontend**: `next build` for web app; zips browser extension (manifest v3 with content scripts for dApp injections).
  - **Backend**: Builds Docker image (`node:20-alpine` base) with Prisma migrations baked in.
  - **Database**: Runs `prisma generate` and `prisma db push` on a test PostgreSQL container.
  - Outputs: Docker tags (e.g., `secure-wallet-backend:${{ github.sha }}`), Vercel preview URLs.

- **Security Scans** (`security-job`):
  - Snyk test on dependencies (alerts on crypto libs like `@solana/web3.js` vulnerabilities).
  - Solana transaction simulator audit: Runs `simulateTransaction` RPC on sample risky txs to ensure Safe Mode flags trigger.
  - Phishing DB Integration Check: Validates API calls to external feeds don't expose secrets.
  - If failures, blocks merge.

#### Triggers & Matrix:
- Triggers: `pull_request`, `push` to non-main branches.
- Matrix: OS (ubuntu-latest), Node versions (20, 18 for compatibility).

#### Example YAML Snippet (Unique to Solana Security):
```yaml
test-solana:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Start Solana Validator
      run: docker run -d -p 8899:8899 solanalabs/solana:test-validator
    - name: Run Safe Mode Tests
      run: npm run test:solana -- --grep="SafeMode|Phishing|Biometric"
      env:
        SOLANA_RPC: http://localhost:8899
        PHISHTANK_API_KEY: ${{ secrets.PHISHTANK_KEY }}
```

### 2. CD Pipeline (`cd.yml`)

Deploys validated code to environments. Staging auto-deploys; production requires GitHub Environments with approvals (e.g., from BackendDev).

#### Jobs:
- **Staging Deployment**:
  - **Frontend**: Deploys to Vercel preview (`vercel --prod --token ${{ secrets.VERCEL_TOKEN }}`); updates browser extension store drafts.
  - **Backend**: Pushes Docker image to AWS ECR; deploys to Fargate cluster (task definition includes env vars for Solana mainnet RPC, PostgreSQL connection strings).
  - **Database**: Applies Prisma migrations via AWS RDS proxy.
  - Post-Deploy: Runs smoke tests (e.g., biometric login endpoint health, transaction simulation latency <500ms).

- **Production Deployment**:
  - Manual approval step (notify BackendDev via Slack integration for API endpoint verification).
  - Blue-green deployment on AWS Fargate: Rolls out new backend containers with zero downtime.
  - Vercel production deploy with alias (`secure-solana-wallet.vercel.app`).
  - Extension: Publishes to Chrome Web Store/Firefox Add-ons (automated via API keys in secrets).
  - Rollback: If Safe Mode e2e tests fail post-deploy, triggers auto-rollback using GitHub Actions.

- **Infra Coordination**:
  - Calls Terraform apply for AWS resources (e.g., scales Fargate based on Solana network load).
  - BackendDev Hook: Exports deployment manifests (e.g., Kubernetes YAML if migrating from Fargate) to `backend-deploy/artifacts/` for their Ledger integration pipelines.

#### Triggers:
- `push` to `main` (staging); `release` tag (production).

#### Example YAML Snippet (Deployment with Solana Focus):
```yaml
deploy-backend:
  needs: ci
  runs-on: ubuntu-latest
  environment: production
  steps:
    - name: Deploy to Fargate
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: aws-task-def.json  # Includes Solana RPC env, Prisma DB URL
        service: secure-wallet-service
        cluster: solana-wallet-cluster
        wait-for-service-stability: true
    - name: Verify Transaction Flagging
      run: |
        curl -X POST ${{ secrets.BACKEND_STAGING_URL }}/flag-tx \
          -H "Content-Type: application/json" \
          -d '{"amount": 1000, "address": "blacklisted_addr"}' | jq '.blocked'  # Expect true
```

### 3. Security & Infra Pipeline (`security-infra.yml`)

#### Jobs:
- **Vulnerability Scan**: Weekly Snyk monitor; scans for WebAuthn exploits or Solana key derivation weaknesses.
- **Infra Provisioning**: Terraform plan/apply on PRs to `infra/` dir (e.g., provisions AWS Lambda for real-time phishing URL checks).
- **Compliance Audit**: Validates against Solana security best practices (e.g., no hard-coded PDAs); tests hardware wallet compatibility in a sandbox.
- **Behavioral Analytics Update**: Deploys ML model updates (if using for deviation detection) to backend, with A/B testing on staging.

#### Triggers: `schedule` (cron: '0 2 * * 1'), `pull_request` to `infra/*`.

## Best Practices & Monitoring

- **Security Gates**: All pipelines halt on high-severity vulns; secrets rotation enforced quarterly.
- **Performance**: Solana RPC calls cached in tests; deploy alerts if simulation times exceed 2s.
- **Rollback Strategy**: Git tags for quick reverts; database snapshots pre-migration.
- **Cost Optimization**: Vercel hobby for previews; AWS spot instances for CI runners.
- **Unique Project Tailoring**: Pipelines include custom jobs for biometric credential rotation tests and Safe Mode rule updates (e.g., integrating new blacklisted address feeds from user reports).
- **Metrics**: Track deployment success rate (>99%), test flakiness (<1%), and Solana tx block rate in Safe Mode.

For BackendDev: Use the ECR image tags from CI outputs for custom Solana program deploys. Contact for custom workflow forks if adding desktop app (Electron) support.

*Last Updated: Timestamp based on build ID 1763624900453*  
*Version: 1.0.0 (Aligned with project key features: Biometric auth, Safe Mode, Solana ecosystem support)*