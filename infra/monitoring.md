# Monitoring and Logging Setup for Secure Solana Wallet

## Overview

This document outlines the comprehensive monitoring and logging strategy for the Secure Solana Wallet project, a web application featuring biometric authentication, advanced Safe Mode for transaction protection, phishing prevention, and integration with the Solana blockchain. The setup focuses on infrastructure-level observability to ensure high availability, security, and performance across the backend (Node.js + Express), database (PostgreSQL with Prisma ORM), and Solana RPC integrations. Monitoring is critical for detecting anomalies in biometric logins (e.g., failed FaceID attempts), Safe Mode triggers (e.g., flagged large transactions to blacklisted addresses), phishing validations (e.g., URL checks against PhishTank), and blockchain operations (e.g., transaction simulations via Solana's `simulateTransaction` RPC).

The strategy leverages AWS services (given the hosting on Fargate/Lambda and Vercel for frontend), with Dockerized components for consistency. Key goals include:
- **Real-time visibility** into application health, user behavior, and security events.
- **Structured logging** for auditability, especially for compliance with crypto security standards.
- **Alerting** for production incidents, such as deviations in user transaction patterns or biometric auth failures exceeding thresholds.
- **Scalability** to handle Solana's high-throughput ecosystem, including SPL tokens, NFTs, and DeFi protocol interactions.

This setup complements backend deployment configurations by providing hooks for CI/CD pipelines (e.g., integrating logs into AWS CloudWatch during Vercel/AWS deployments) and does not overlap with backend-specific API logging, which BackendDev will handle in service-level implementations.

## Logging Configuration

Logging is implemented using structured formats (JSON) to facilitate parsing, querying, and integration with external tools. We use Winston for Node.js backend logging, with levels aligned to project needs: `error` for critical failures (e.g., Solana RPC timeouts), `warn` for Safe Mode blocks, `info` for successful biometric logins, and `debug` for transaction decoding details.

### Backend Logging (Node.js + Express)

1. **Winston Setup**:
   - Install via npm: `npm install winston winston-daily-rotate-file`.
   - Configuration in `src/config/logger.ts`:
     ```typescript
     import winston from 'winston';
     import DailyRotateFile from 'winston-daily-rotate-file';

     const logger = winston.createLogger({
       level: process.env.LOG_LEVEL || 'info',
       format: winston.format.combine(
         winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
         winston.format.errors({ stack: true }),
         winston.format.json()
       ),
       transports: [
         new winston.transports.Console({
           format: winston.format.simple()
         }),
         new DailyRotateFile({
           filename: 'logs/error-%DATE%.log',
           datePattern: 'YYYY-MM-DD',
           zippedArchive: true,
           maxSize: '20m',
           maxFiles: '14d',
           level: 'error'
         }),
         new DailyRotateFile({
           filename: 'logs/combined-%DATE%.log',
           datePattern: 'YYYY-MM-DD',
           zippedArchive: true,
           maxSize: '20m',
           maxFiles: '14d'
         })
       ]
     });

     // Project-specific enhancers
     logger.defaultMeta = { service: 'secure-solana-wallet-backend', version: process.env.APP_VERSION || '1.0.0' };

     export default logger;
     ```
   - Environment variables: Set `LOG_LEVEL=debug` in development; `info` in production.

2. **Security-Focused Logging**:
   - **Biometric Auth**: Log WebAuthn events without sensitive data (e.g., `{ event: 'biometric_challenge', success: true, method: 'FaceID', timestamp: '...' }`).
   - **Safe Mode**: Capture flags like `{ event: 'transaction_flagged', reason: 'large_amount', threshold: 1000, address: 'blacklisted_pda', userId: 'anon_hash' }`.
   - **Phishing Prevention**: Log validations `{ event: 'phishing_check', url: 'example.com', database: 'PhishTank', result: 'safe', threatScore: 0.2 }`.
   - **Solana Integrations**: Log RPC calls `{ event: 'solana_rpc', method: 'simulateTransaction', duration_ms: 150, error: null, program: 'SPL_token' }`.
   - Avoid logging private keys or full transaction payloads; use hashes for references (e.g., `txHash: sha256(fullTx)`).

3. **Database Logging (PostgreSQL)**:
   - Enable Prisma query logging in `prisma/schema.prisma` with `log: ['query', 'info', 'warn', 'error']`.
   - Custom middleware for wallet queries: Log access to user wallets or NFT metadata without exposing data.
   - Integrate with AWS RDS logging: Stream PostgreSQL logs to CloudWatch Logs via parameter groups.

4. **Frontend Logging (Next.js)**:
   - Use console-based logging routed to backend via API (e.g., `/api/log` endpoint).
   - For browser extension: Implement a secure logger that batches events (e.g., auth failures) and sends to backend without blocking UI.
   - Vercel-specific: Leverage Vercel Logs for frontend errors, filtering for biometric/WebAuthn issues.

### Log Aggregation and Forwarding

- **Centralized Logging**: Use AWS CloudWatch Logs Agent in Docker containers to forward logs from Fargate/Lambda.
  - Docker Compose snippet (in `docker-compose.yml` for local dev):
    ```yaml
    services:
      backend:
        image: secure-solana-wallet-backend
        logging:
          driver: awslogs
          options:
            awslogs-group: /aws/ecs/secure-solana-wallet
            awslogs-region: us-east-1
            awslogs-stream-prefix: backend
    ```
- **Retention**: 30 days for production logs; auto-archive older data to S3.
- **PII Handling**: Scrub logs of sensitive info (e.g., biometric data hashes only) using Winston's redaction filters.

## Monitoring Metrics and Dashboards

Metrics collection ensures proactive detection of issues like increased Safe Mode activations during phishing campaigns or Solana network congestion affecting transaction simulations.

### Tools and Setup

1. **Prometheus + Grafana** (for metrics in AWS/ECS Fargate):
   - Deploy Prometheus as a sidecar in Fargate tasks.
   - Expose backend metrics via Prometheus client: `npm install prom-client`.
     ```typescript
     import client from 'prom-client';
     import express from 'express';

     const app = express();
     app.get('/metrics', async (req, res) => {
       res.set('Content-Type', client.register.contentType);
       res.end(await client.register.metrics());
     });

     // Custom metrics
     const biometricLoginCounter = new client.Counter({
       name: 'biometric_login_attempts_total',
       help: 'Total biometric login attempts',
       labelNames: ['method', 'success']
     });

     const safeModeBlocks = new client.Histogram({
       name: 'safe_mode_transaction_blocks',
       help: 'Safe Mode transaction blocks by reason',
       labelNames: ['reason'] // e.g., 'large_amount', 'blacklisted_address'
     });

     // In auth handler:
     biometricLoginCounter.inc({ method: 'FaceID', success: 'true' });
     ```
   - Grafana Dashboard Queries:
     - Biometric Auth Rate: `rate(biometric_login_attempts_total[5m])`.
     - Safe Mode Efficiency: `sum(increase(safe_mode_transaction_blocks{reason="phishing"}[1h]))`.
     - Solana RPC Latency: Integrate with Solana RPC provider metrics (e.g., Helius or QuickNode APIs if used).

2. **AWS X-Ray for Tracing**:
   - Enable in Node.js: `npm install aws-xray-sdk`.
   - Trace end-to-end flows: Biometric login → Safe Mode check → Solana transaction simulation → Signing.
     ```typescript
     import AWSXRay from 'aws-xray-sdk-core';
     import { Express } from 'express';

     AWSXRay.middleware('secure-solana-wallet', app as Express);
     // Segment for Solana ops: AWSXRay.captureAsync('solanaSimulateTx', callback);
     ```
   - Focus on high-risk traces: Phishing API calls to external databases.

3. **Database Monitoring**:
   - AWS RDS Performance Insights: Monitor query latency for Prisma operations on wallet balances or NFT fetches.
   - Custom Alerts: Query volume spikes for DeFi protocol interactions.

4. **Infrastructure Health**:
   - AWS CloudWatch Alarms: CPU/Memory on Fargate >80%, Lambda duration >2s for transaction decoding.
   - Solana-Specific: Custom metric for RPC endpoint uptime (e.g., ping Solana mainnet every 30s).

### Dashboards

- **Grafana Setup**: Deploy via AWS ECS; import dashboards for:
  - Security Overview: Visuals for auth failures, Safe Mode triggers, phishing hits.
  - Performance: Transaction simulation times, WebAuthn challenge latencies.
  - User Behavior: Anomalies in login patterns (e.g., via behavioral deviation logs).
- **Vercel Integration**: For frontend, use Vercel Analytics to monitor extension loads and web app errors, correlated with backend logs.

## Alerting and Incident Response

Alerts are configured to notify via Slack/Email/PagerDuty for critical events, ensuring rapid response to security threats in the Solana ecosystem.

1. **CloudWatch Alarms**:
   - **Security Alerts**:
     - High Failed Biometrics: `SUM([biometric_login_attempts_total{method="TouchID", success="false"}]) > 5` in 5min → Alert on potential brute-force.
     - Safe Mode Surge: `rate(safe_mode_transaction_blocks[1h]) > 10` → Investigate phishing wave.
     - Phishing Database Failures: Custom metric for PhishTank API errors >20%.
   - **Availability**:
     - Solana RPC Downtime: Latency >500ms averaged over 1min.
     - Database Connection Pool Exhaustion: RDS connections >80%.
   - Thresholds: Tuned based on baseline from user behavior analytics (e.g., normal transaction volumes for SPL tokens/NFTs).

2. **Notification Setup**:
   - Integrate with AWS SNS: Topics for `security`, `performance`, `availability`.
   - Example Alarm Action:
     ```json
     {
       "AlarmName": "SafeMode-PhishingSurge",
       "ComparisonOperator": "GreaterThanThreshold",
       "EvaluationPeriods": 2,
       "MetricName": "safe_mode_transaction_blocks",
       "Namespace": "SecureSolanaWallet/Custom",
       "Period": 300,
       "Statistic": "Sum",
       "Threshold": 10,
       "AlarmActions": ["arn:aws:sns:us-east-1:123456789012:SecureWalletAlerts"]
     }
     ```
   - Escalation: Auto-scale Fargate tasks on high load; notify BackendDev for code deploys if patterns indicate bugs (e.g., false positives in address blacklisting).

3. **Incident Response Workflow**:
   - **Triage**: Use CloudWatch Logs Insights queries like `fields @timestamp, event, reason | filter reason = "blacklisted_address" | stats count(*) by bin(5m)`.
   - **Forensics**: Correlate logs with X-Ray traces for root cause (e.g., unusual instructions in PDA-derived addresses).
   - **Post-Incident**: Review hardware wallet compat (Ledger/YubiKey) sessions if auth issues arise.
   - Integrate with CI/CD: Pipeline stage to test alerting on deploy (e.g., simulate flagged transaction).

## Best Practices and Security Considerations

- **Compliance**: Logs audited for GDPR/CCPA; no storage of biometric raw data—only success/failure metadata.
- **Cost Optimization**: Sample low-severity logs (e.g., debug Solana decodes) in dev; full in prod.
- **Testing**: In CI/CD (GitHub Actions/AWS CodePipeline), run smoke tests: Simulate biometric login, trigger Safe Mode, verify logs in CloudWatch.
- **Future-Proofing**: Prepare for desktop app extension by abstracting logger to support Electron logging.
- **Unique Project Ties**: Monitor deviations from normal behavior using logged heuristics (e.g., first-time large SPL token transfers), alerting on >20% deviation.

This monitoring setup ensures the Secure Solana Wallet remains resilient against risks, with full traceability for biometric-secured, Safe Mode-protected operations. For deployment coordination, BackendDev should reference this in Dockerfile log drivers and ECS task definitions.

*Generated by DevOpsEngineer | Unique ID: 1763624900465_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__infra_monitoring_md_xwge3e*