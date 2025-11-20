# Node.js Express Backend for Secure Solana Wallet

## Overview

This document outlines the Express.js backend structure for the "Secure Solana Wallet with Biometric Login and Advanced Safe Mode" project. The backend serves as a secure API layer to support web application and browser extension clients, handling user session management, wallet operations on the Solana blockchain, transaction risk assessments for Safe Mode, phishing prevention checks, and integration with external threat databases. It integrates with PostgreSQL via Prisma ORM for user data persistence (e.g., wallet metadata, behavioral profiles for anomaly detection) and proxies Solana RPC calls for enhanced security and rate limiting.

Key responsibilities:
- Verify WebAuthn-based biometric authentication challenges (post-client assertion).
- Manage encrypted wallet metadata without storing private keys (client-side derivation).
- Perform server-side transaction simulations and risk flagging based on heuristics (e.g., amount thresholds > 10 SOL, blacklisted addresses from integrated feeds, instruction anomalies via Solana program analysis, and user behavior deviations tracked via session history).
- Integrate with external APIs like PhishTank for domain validation and Solana-specific threat databases (e.g., via Solana Labs feeds or custom blockchain scanners).
- Support SPL tokens, NFTs (via Metaplex metadata), and DeFi protocol interactions (e.g., Jupiter swaps simulation).
- Optional hardware wallet verification endpoints for Ledger/YubiKey session bridging.

The API is designed for cross-platform compatibility, emphasizing security with JWT sessions, input sanitization, and HTTPS enforcement. It complements the Next.js frontend by providing RESTful endpoints (with WebSocket support for real-time Safe Mode alerts) and aligns with ProductManager requirements for beginner-friendly error messages and audit logs.

**Unique Project Identifier:** 1763624900430_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__backend_node_express_md_95rn65

## Prerequisites

- Node.js >= 18.0.0 (LTS recommended for stability).
- PostgreSQL 14+ with Prisma CLI installed globally (`npm install -g prisma`).
- Solana CLI tools for local testing (optional, for RPC endpoint validation).
- API keys for external services: Solana RPC (e.g., Helius or QuickNode), PhishTank, and blockchain threat feeds (e.g., Chainalysis or custom Solana explorer APIs).
- Docker for containerized deployment.

## Project Structure

The backend is organized under the `backend/` directory for modularity, separating concerns like routes, services, and Solana integrations. Here's the structure:

```
backend/
├── src/
│   ├── config/          # Environment configs and Solana RPC setup
│   │   ├── database.ts  # Prisma client initialization
│   │   └── solana.ts    # Solana connection factory with custom RPC
│   ├── controllers/     # Request handlers for API endpoints
│   │   ├── authController.ts    # Biometric verification and session management
│   │   ├── walletController.ts  # Wallet creation, balance, and asset queries
│   │   ├── transactionController.ts # Simulation, risk assessment, and signing previews
│   │   └── safeModeController.ts # Phishing checks and behavioral anomaly detection
│   ├── middleware/      # Custom middleware for security and validation
│   │   ├── auth.ts      # JWT verification for protected routes
│   │   ├── rateLimit.ts # Express-rate-limit for API throttling
│   │   ├── validateTransaction.ts # Solana-specific input validation (e.g., PDA checks)
│   │   └── cors.ts      # CORS setup for browser extension and web app
│   ├── models/          # Prisma schema extensions and custom types
│   │   └── user.ts      # User model with wallet metadata and behavior logs
│   ├── routes/          # Express router definitions
│   │   ├── authRoutes.ts
│   │   ├── walletRoutes.ts
│   │   ├── transactionRoutes.ts
│   │   └── safeModeRoutes.ts
│   ├── services/        # Business logic layers
│   │   ├── biometricService.ts  # WebAuthn challenge generation and assertion verification
│   │   ├── solanaService.ts     # @solana/web3.js wrappers for RPC calls
│   │   ├── riskService.ts       # Heuristic-based transaction flagging
│   │   └── phishingService.ts   # External API integrations for threat checks
│   ├── utils/           # Helpers like error handling and logging
│   │   ├── logger.ts    # Winston-based structured logging
│   │   └── encryption.ts # AES-256 for metadata (never keys)
│   └── app.ts           # Main Express app setup with middleware stacking
├── prisma/
│   └── schema.prisma    # Database schema (detailed below)
├── tests/               # Jest unit/integration tests
│   ├── auth.test.ts
│   └── transaction.test.ts
├── Dockerfile           # For AWS Fargate/Lambda deployment
├── docker-compose.yml   # Local dev with PostgreSQL
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

This structure ensures scalability, with services decoupling Solana logic from Express routes for easier testing and maintenance.

## Installation

1. Clone the repository and navigate to `backend/`.
2. Run `npm install` to install dependencies (see below).
3. Set up environment variables in a `.env` file:
   ```
   DATABASE_URL="postgresql://user:pass@localhost:5432/solana_wallet_db"
   SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"  # Or custom endpoint
   JWT_SECRET="your-secure-jwt-secret-key-min-32-chars"
   PHISHTANK_API_KEY="your-phishtank-key"
   THREAT_DB_API_KEY="your-blockchain-threat-feed-key"
   PORT=3001  # Backend port to avoid frontend conflicts
   NODE_ENV="development|production"
   ```
4. Initialize the database:
   ```
   npx prisma generate
   npx prisma db push  # Or migrate for production
   ```
5. Start the development server: `npm run dev` (uses Nodemon for hot reloads).
6. For production: `npm run build && npm start`.

## Dependencies

Core packages in `package.json`:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "@solana/web3.js": "^1.78.0",
    "@solana/spl-token": "^0.3.7",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "axios": "^1.5.0",  // For external API calls (PhishTank, etc.)
    "express-rate-limit": "^6.10.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",  // Security headers
    "winston": "^3.10.0",  // Logging
    "web-authn": "^1.0.0"  // Simplified WebAuthn helpers (custom implementation)
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/jsonwebtoken": "^9.0.2",
    "typescript": "^5.1.6",
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "@types/jest": "^29.5.3",
    "ts-jest": "^29.1.0"
  },
  "scripts": {
    "dev": "nodemon src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "test": "jest",
    "prisma:studio": "npx prisma studio"
  }
}
```

## Configuration

- **Database Connection**: Handled in `src/config/database.ts` using Prisma. Supports connection pooling for high-traffic DeFi queries.
- **Solana RPC**: `src/config/solana.ts` creates a `Connection` instance with retry logic and custom endpoints for mainnet/devnet. Includes failover to multiple RPC providers for reliability during network congestion.
- **Security Config**: Helmet middleware enforces CSP, HSTS, and referrer policies. All endpoints require HTTPS in production.
- **Logging**: Winston logger categorizes logs (e.g., `wallet:balance-fetch-success`) with rotation for audit compliance.

## Database Schema

Prisma schema (`prisma/schema.prisma`) is tailored for user privacy and performance. No private keys are stored; only hashed derivations and metadata.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String   @id @default(cuid())
  email             String   @unique  // Optional for recovery
  walletAddress     String   @unique  // Derived public key hash
  behaviorProfile   Json?    // Session-based anomaly data (e.g., avg tx amount, frequency)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  sessions          Session[]
  riskFlags         RiskFlag[]

  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  jwtToken  String   // Encrypted JWT
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, jwtToken])
  @@map("sessions")
}

model RiskFlag {
  id          String   @id @default(cuid())
  userId      String
  transaction String   // Base58 encoded tx signature
  riskType    String   // e.g., "high-amount", "blacklisted-address", "phishing-url"
  severity    Int      // 1-10 scale
  mitigated   Boolean  @default(false)
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("risk_flags")
}

// Indexes for performance
model _ {
  @@index([walletAddress], map: "idx_wallet_address")
  @@index([behaviorProfile], map: "idx_behavior_profile")
}
```

Run `npx prisma generate` after schema updates. This schema supports behavioral analytics for Safe Mode (e.g., flagging txs deviating >50% from user norms).

## API Endpoints

All endpoints are prefixed with `/api/v1`. Use JSON payloads with TypeScript interfaces for validation. Responses follow `{ success: boolean, data: any, error?: string }` format.

### Authentication Routes (`/api/v1/auth`)

- **POST /challenge**: Generate WebAuthn challenge for biometric login.
  - Body: `{ publicKey: { challenge: Uint8Array, rpId: string, userVerification: 'required' } }`
  - Logic: `biometricService.generateChallenge()` creates a random challenge, stores temporarily in Redis (for prod scalability), returns `{ challenge, rpId }`.
  - Response: 200 with challenge data.
  - Security: Rate-limited to 5/min per IP.

- **POST /verify**: Verify biometric assertion post-client WebAuthn.
  - Body: `{ assertion: { authenticatorData, clientDataJSON, signature, userHandle }, challengeId: string }`
  - Logic: Uses `crypto.subtle.verify()` to check assertion against stored challenge; issues JWT on success.
  - Response: 200 `{ token: string, expiresIn: 3600 }` or 401 unauthorized.
  - Ties to frontend: FrontendDev consumes this for session storage in Zustand.

### Wallet Routes (`/api/v1/wallet`)

- **POST /create**: Derive and register new wallet metadata (no key gen on server).
  - Headers: `Authorization: Bearer <jwt>`
  - Body: `{ mnemonicHash: string }` (client-derived).
  - Logic: `walletController.create()` inserts user record with PDA support; fetches initial balance via `solanaService.getBalance()`.
  - Response: 201 `{ walletAddress, balance: number }`.
  - Supports SPL/NFT: Queries token accounts using `@solana/spl-token`.

- **GET /:address/balance**: Fetch SOL/SPL/NFT balances.
  - Params: `address` (Solana public key).
  - Logic: Integrates Metaplex for NFT metadata; caches results in Prisma for 5min.
  - Response: 200 `{ sol: number, tokens: [{ mint: string, amount: number }], nfts: [{ name: string, uri: string }] }`.

- **GET /:address/history**: Paginated transaction history with decoding.
  - Query: `?limit=50&offset=0`.
  - Logic: Uses Solana `getSignaturesForAddress` + `getTransaction`; decodes instructions for DeFi (e.g., Serum swaps).

### Transaction Routes (`/api/v1/transactions`)

- **POST /simulate**: Simulate transaction for preview and risk preview.
  - Headers: Auth required.
  - Body: `{ transaction: string (base58), options: { simulationAccounts: boolean, replaceRecentBlockhash: boolean } }`.
  - Logic: `solanaService.simulateTransaction()` via RPC; then `riskService.assess()` flags risks (e.g., if amount > user avg * 2, or address in blacklist).
  - Response: 200 `{ simulationResult: { err: null, logs: string[] }, riskScore: { score: 7, flags: ['large-amount'] }, preview: { fee: number, changes: { lamportsDelta: number } } }`.
  - Unique to Safe Mode: Integrates behavioral check against user's `behaviorProfile`.

- **POST /sign-preview**: Generate user-friendly decoded preview before signing.
  - Body: `{ transaction: string }`.
  - Logic: Decodes via `@solana/web3.js`; highlights risky elements (e.g., "Transfer 5 SOL to unknown address").

### Safe Mode Routes (`/api/v1/safe-mode`)

- **POST /assess-risk**: Standalone risk evaluation for client-side flagging.
  - Body: `{ transaction: string, userId: string, context: { url?: string, device: string } }`.
  - Logic: `riskService.heuristicCheck()` + `phishingService.validate()` (URL check vs PhishTank; address vs threat DB).
  - Flags: Large amounts (>10 SOL default, configurable), first-time/blacklisted addresses (via on-chain history), unusual instructions (e.g., non-standard SPL transfers), behavior deviations (e.g., unusual time-of-day).
  - Response: 200 `{ blocked: boolean, warnings: ['phishing-risk'], mitigation: 'simulate-failed' }`.
  - WebSocket: `/ws/safe-alerts` for real-time phishing warnings (using `ws` package).

- **GET /threats/blacklist**: Fetch dynamic blacklisted addresses/domains.
  - Logic: Caches external feeds; updates every 15min.

## Middleware

- **Auth Middleware** (`middleware/auth.ts`): Validates JWT from `Authorization` header; attaches `req.user` with walletAddress. Uses `jsonwebtoken.verify()` with RS256 for prod.
- **Rate Limiting** (`middleware/rateLimit.ts`): 100 reqs/hour per IP for sensitive endpoints (e.g., simulate); windowMs: 3600000.
- **Transaction Validation** (`middleware/validateTransaction.ts`): Parses base58 tx; checks for valid Solana structure, simulates early for DoS prevention.
- **CORS** (`middleware/cors.ts`): Allows origins from frontend (e.g., `http://localhost:3000`, extension origins); credentials: true for auth cookies.
- **Error Handler** (global in `app.ts`): Catches Prisma/Solana errors; returns 500 with sanitized messages (no stack traces in prod).

Example middleware usage in `app.ts`:

```typescript
import express from 'express';
import cors from './middleware/cors';
import rateLimit from './middleware/rateLimit';
import auth from './middleware/auth';
import authRoutes from './routes/authRoutes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));  // For large tx payloads
app.use(rateLimit);
app.use('/api/v1/auth', authRoutes);  // Public for challenge
app.use('/api/v1/wallet', auth, walletRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

export default app;
```

## Integration with Solana

All Solana operations use `@solana/web3.js` in `services/solanaService.ts`:

```typescript
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

export class SolanaService {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async simulateTransaction(txBase58: string, options?: any) {
    const tx = Transaction.from(Buffer.from(txBase58, 'base58'));
    const simulation = await this.connection.simulateTransaction(tx, options);
    if (simulation.value.err) {
      throw new Error(`Simulation failed: ${simulation.value.err}`);
    }
    return simulation.value;
  }

  // PDA support for DeFi
  async getPDA(seeds: Buffer[], programId: PublicKey) {
    return PublicKey.findProgramAddressSync(seeds, programId);
  }

  // SPL token balance
  async getTokenBalance(mint: string, owner: PublicKey) {
    // Implementation using getTokenAccountsByOwner
  }
}
```

For hardware wallets: Endpoints bridge via client-provided signatures (no server signing).

## Testing

Run `npm test` with Jest. Coverage targets >80% for controllers/services.

Example test (`tests/transaction.test.ts`):

```typescript
import request from 'supertest';
import app from '../../src/app';

describe('Transaction Simulation', () => {
  it('should flag high-risk tx', async () => {
    const res = await request(app)
      .post('/api/v1/transactions/simulate')
      .set('Authorization', 'Bearer valid-jwt')
      .send({ transaction: 'mock-base58-tx' });
    expect(res.body.riskScore.score).toBeGreaterThan(5);
    expect(res.body.blocked).toBe(true);
  });
});
```

Includes mocks for Solana RPC using `nock` for offline testing.

## Deployment Notes

- **Docker**: `Dockerfile` builds multi-stage (dev/prod); exposes port 3001.
  ```dockerfile
  FROM node:18-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production
  COPY . .
  RUN npm run build

  FROM node:18-alpine AS runtime
  WORKDIR /app
  COPY --from=builder /app/dist ./dist
  COPY --from=builder /app/node_modules ./node_modules
  COPY --from=builder /app/prisma ./prisma
  RUN npx prisma generate
  CMD ["node", "dist/app.js"]
  ```
- **AWS Fargate/Lambda**: Use `docker-compose.yml` for local; deploy via ECS with ALB for HTTPS. Secrets via AWS SSM.
- **Scaling**: Horizontal pod autoscaling based on CPU; Prisma Accelerate for global DB reads.
- **Monitoring**: Integrate Winston with AWS CloudWatch; alert on risk flag thresholds.
- **Security Audit**: Enforce OWASP top 10; regular Prisma schema migrations; Solana-specific: Validate all PDAs to prevent rug pulls.

This structure ensures the backend is robust, secure, and directly supports the project's Safe Mode and biometric features while coordinating seamlessly with FrontendDev for API contracts (e.g., TypeScript types shared via npm workspace). For updates, reference ProductManager for feature pivots.