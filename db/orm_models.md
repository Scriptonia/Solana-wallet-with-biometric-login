# Secure Solana Wallet: ORM Models Documentation

This document defines the Prisma ORM schema models for the backend database in the Secure Solana Wallet project. The schema is designed to support user account management, transaction history for behavioral analysis in Safe Mode, risk assessment data for automated blocking and warnings, phishing threat caching, and asset metadata storage for SPL tokens, NFTs, and DeFi interactions. All models are tailored to the Solana ecosystem, using string types for Solana public keys (base58-encoded), timestamps for audit trails, and relations to enable efficient querying for features like deviation detection from normal user behavior.

The database uses PostgreSQL, with Prisma as the ORM for type-safe migrations and queries. Models incorporate security best practices: no storage of private keys or biometric secrets (biometrics rely on WebAuthn public key challenges handled client-side). Sensitive fields like user email use hashing where applicable. Indexes are defined for high-query fields (e.g., wallet addresses, transaction signatures) to support real-time Safe Mode flagging.

This schema complements the backend API endpoints (e.g., for transaction simulation and threat checks) and frontend state management (Zustand/Redux Toolkit for local caching). It does not duplicate on-chain data; instead, it stores off-chain metadata for performance and user-specific analytics. Future extensions (e.g., desktop app sync) can leverage these models via API.

## Prisma Schema Overview

The full Prisma schema (`prisma/schema.prisma`) should include the following datasource and generator blocks:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Models are grouped logically: core user/wallet entities, transaction and risk management, threat and phishing data, and asset support.

## Model Definitions

### User Model
Represents a registered user account for multi-device sync, recovery phrases (encrypted), and personalized Safe Mode settings. Biometric login is device-bound via WebAuthn; this model stores only the public key credential IDs for verification.

```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique // Hashed for privacy if needed
  emailVerified     Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  isActive          Boolean  @default(true)
  safeModeEnabled   Boolean  @default(true)
  riskThreshold     Float    @default(0.5) // Customizable threshold for blocking (0-1 scale)
  behaviorBaseline  Json?    // Serialized baseline patterns (e.g., avg tx amount, frequency) for deviation detection
  recoveryPhraseHash String? // Encrypted hash of mnemonic for recovery (never store plaintext)
  
  // WebAuthn relations for biometric devices
  authenticators    Authenticator[]
  
  // Wallet relations
  wallets           Wallet[]
  
  // Transaction history (for behavioral analysis)
  transactions      Transaction[]
  
  // Risk flags and phishing reports tied to user
  userRiskFlags     RiskFlag[]
  phishingReports   PhishingReport[]
  
  @@map("users")
  @@index([email])
}
```

**Key Relations and Usage:**
- One-to-many with `Authenticator` for cross-device biometric support (e.g., FaceID on iOS, Windows Hello on desktop).
- Ties into Safe Mode: `behaviorBaseline` stores anonymized JSON of user patterns (e.g., typical tx amounts >$100 flagged as deviation).
- User stories supported: As a user, I want to enable Safe Mode with custom thresholds so that my wallet blocks high-risk txs automatically.

### Authenticator Model
Stores WebAuthn credential metadata for biometric login. No secrets are stored; challenges are generated per login via backend API.

```prisma
model Authenticator {
  id                 String   @id @default(cuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  credentialId       String   @unique // Base64-encoded credential ID from WebAuthn
  publicKey          Bytes    // COSE public key (encrypted in transit)
  signCount          Int      @default(0) // Counter for replay attack prevention
  transports         String[] // e.g., ["usb", "internal"] for device types
  createdAt          DateTime @default(now())
  lastUsedAt         DateTime @updatedAt
  
  @@map("authenticators")
  @@index([userId, credentialId])
  @@index([lastUsedAt]) // For cleanup of inactive devices
}
```

**Key Relations and Usage:**
- Supports fingerprint, FaceID, TouchID, and Windows Hello via WebAuthn API integration.
- Backend flow: During login, simulate challenge and verify signature against stored public key.
- Complements frontend: Next.js app router handles credential creation; this model enables server-side verification for web app sessions.

### Wallet Model
Represents a user's Solana wallet instance, including derived addresses and metadata. Supports multiple wallets per user for portfolio management.

```prisma
model Wallet {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  publicKey         String   @unique // Solana base58 public key
  name              String   // User-friendly label (e.g., "Main Wallet")
  isHardware        Boolean  @default(false) // Flag for Ledger/YubiKey integration
  hardwareType      String?  // e.g., "ledger", "yubikey"
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  balance           Float?   // Cached SOL balance (updated via cron job or webhook)
  
  // Asset relations
  assets            Asset[]
  
  // Transaction relations
  transactions      Transaction[]
  
  // Risk and phishing
  riskFlags         RiskFlag[]
  
  @@map("wallets")
  @@index([userId])
  @@index([publicKey])
}
```

**Key Relations and Usage:**
- Integrates with Solana RPC for balance fetches; `publicKey` used in tx signing simulations.
- Hardware support: When `isHardware=true`, frontend uses WebUSB/WebHID to connect; model tracks prefs only.
- User story: As an experienced DeFi user, I want to link my Ledger wallet so that Safe Mode applies to hardware-signed txs.

### Transaction Model
Stores transaction history for auditing, behavioral analysis, and Safe Mode flagging. Includes simulation results for preview warnings.

```prisma
model Transaction {
  id                String   @id @default(cuid())
  userId            String
  walletId          String
  wallet            Wallet   @relation(fields: [walletId], references: [id], onDelete: Cascade)
  user              User     @relation(fields: [userId], references: [id])
  signature         String?  @unique // Solana tx signature (post-broadcast)
  rawTx             Bytes?   // Encoded transaction for simulation replay
  instructions      Json[]   // Decoded Solana instructions (e.g., SPL transfer details)
  amount            Float?   // Total SOL/SPL amount
  recipient         String?  // Base58 recipient address
  isSigned          Boolean  @default(false)
  simulationResult  Json?    // Output from Solana's simulateTransaction RPC (e.g., logs, errors)
  riskScore         Float?   // Computed risk (0-1) based on flags
  wasBlocked        Boolean  @default(false) // Safe Mode intervention
  status            String   @default("pending") // pending, confirmed, failed
  createdAt         DateTime @default(now())
  confirmedAt       DateTime?
  
  // Relations to risks
  riskFlags         RiskFlag[]
  
  @@map("transactions")
  @@index([walletId])
  @@index([signature])
  @@index([createdAt]) // For behavior baseline queries (e.g., last 30 days)
  @@index([riskScore]) // For dashboard analytics
}
```

**Key Relations and Usage:**
- Safe Mode: Query recent txs to detect deviations (e.g., unusual large amounts or first-time addresses).
- Supports SPL/NFT/DeFi: `instructions` JSON includes token mints, program IDs for decoding.
- Backend API: Endpoint `/api/transactions/simulate` uses this model to store previews before signing.

### RiskFlag Model
Captures heuristic flags for Safe Mode, such as large amounts (> user threshold), blacklisted addresses, or instruction anomalies. Enables automated blocking and user warnings.

```prisma
model RiskFlag {
  id                  String     @id @default(cuid())
  transactionId       String?
  transaction         Transaction? @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  walletId            String?
  wallet              Wallet?    @relation(fields: [walletId], references: [id], onDelete: SetNull)
  userId              String
  user                User       @relation(fields: [userId], references: [id])
  type                RiskType
  address             String?    // Flagged address (e.g., blacklisted recipient)
  amountThreshold     Float?     // Exceeded amount
  instructionAnomaly  String?    // e.g., "unexpected PDA derivation"
  behaviorDeviation   String?    // e.g., "tx frequency 3x above baseline"
  severity            Float      @default(0.3) // Contributes to overall riskScore
  source              String     // e.g., "internal-heuristic", "external-db"
  isActive            Boolean    @default(true)
  createdAt           DateTime   @default(now())
  
  @@map("risk_flags")
  @@index([userId])
  @@index([type])
  @@index([address])
}

enum RiskType {
  LARGE_AMOUNT
  FIRST_TIME_ADDRESS
  BLACKLISTED_ADDRESS
  INSTRUCTION_ANOMALY
  BEHAVIOR_DEVIATION
  PHISHING_LINK
}
```

**Key Relations and Usage:**
- Aggregates flags to compute `Transaction.riskScore`; if > threshold, block and warn via frontend preview.
- Integrates user answers: Flags for large amounts, first-time/blacklisted addresses, unusual instructions, behavior devs.
- Coordination: BackendDev uses this for `/api/risks/flag` endpoint; FrontendDev displays warnings in tx simulation UI.

### PhishingReport Model
Caches phishing/threat data from external APIs (e.g., PhishTank, Solana-specific feeds) for real-time URL/domain validation and tx warnings.

```prisma
model PhishingReport {
  id             String   @id @default(cuid())
  userId         String?
  user           User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  url            String   @unique
  domain         String
  threatType     String   // e.g., "phishing-site", "malicious-dapp"
  source         String   // e.g., "phishtank", "solana-threat-feed"
  isActive       Boolean  @default(true)
  lastChecked    DateTime @default(now())
  expiresAt      DateTime // TTL for cache invalidation
  
  // Relations to txs if flagged during signing
  transactions   Transaction[]
  
  @@map("phishing_reports")
  @@index([domain])
  @@index([expiresAt]) // For automated cleanup
  @@index([userId])
}
```

**Key Relations and Usage:**
- Safe Mode: During tx simulation, validate dApp URLs against this cache; warn if match.
- External integration: Cron job populates from APIs; supports user-reported phishing.
- User story: As a beginner user, I want phishing checks so that risky dApps are blocked before signing.

### Asset Model
Stores metadata for user assets (SPL tokens, NFTs) to enable portfolio views and risk assessments (e.g., high-value NFT transfers flagged).

```prisma
model Asset {
  id           String   @id @default(cuid())
  walletId     String
  wallet       Wallet   @relation(fields: [walletId], references: [id], onDelete: Cascade)
  mintAddress  String   // SPL token mint or NFT collection (base58)
  type         AssetType // TOKEN, NFT, DEFI_POSITION
  symbol       String?
  name         String?
  balance      Float    @default(0)
  metadataUri  String?  // For NFT fetching via Solana RPC
  valueUsd     Float?   // Cached approximate value for risk flagging
  updatedAt    DateTime @updatedAt
  
  @@map("assets")
  @@unique([walletId, mintAddress])
  @@index([walletId])
  @@index([mintAddress])
  @@index([type])
}

enum AssetType {
  TOKEN
  NFT
  DEFI_POSITION
}
```

**Key Relations and Usage:**
- Fetches via Solana RPC (e.g., getTokenAccountsByOwner); caches for performance.
- Safe Mode: High `valueUsd` in tx instructions triggers large-amount flags.
- Supports DeFi/NFT: Decodes txs involving associated token accounts (ATAs).

## Additional Schema Considerations

- **Migrations and Seeding:** Run `npx prisma migrate dev` after defining models. Seed initial data for threat databases via a script pulling from external APIs.
- **Security:** Use Prisma's raw queries sparingly; all access via API with JWT auth tied to `User.id`. Encrypt `recoveryPhraseHash` with user-derived keys.
- **Performance:** Composite indexes on transaction/wallet for queries like "recent txs per wallet". Use JSON fields for flexible Solana-specific data (e.g., instruction parsing).
- **Relations Integrity:** Cascade deletes on user/wallet removal to prevent orphans; soft-delete via `isActive` flags where needed.
- **Extensibility:** For optional desktop app, add a `deviceType` field to User. Hardware wallet txs can reference this model for session tracking.
- **Testing:** Unit tests for risk scoring logic; integration tests with mocked Solana RPC for transaction simulations.

This schema ensures the backend (Node.js/Express or NestJS) provides clear, implementable data structures for FrontendDev to consume via REST/GraphQL APIs, aligning with the project's high-complexity security focus. For updates, reference the unique identifier: 1763624900469_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__db_orm_models_md_5slb87.