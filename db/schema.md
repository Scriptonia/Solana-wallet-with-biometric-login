# Database Schema Design for Secure Solana Wallet

## Overview

This document outlines the database schema for the Secure Solana Wallet application, a web-based Solana wallet emphasizing biometric authentication and advanced Safe Mode protections. The schema is designed for PostgreSQL using Prisma ORM, ensuring scalability, security, and alignment with the project's technical requirements. It supports user management, secure session handling for biometrics (via WebAuthn), transaction risk flagging, phishing prevention caches, and on-chain data synchronization without storing private keys (which are managed client-side).

Key design principles:
- **Security**: No storage of sensitive data like private keys or raw biometrics; instead, use hashed/public identifiers and encrypted fields where necessary (e.g., via Prisma's `@db.VarChar` with application-level encryption for optional user notes).
- **Performance**: Indexes on frequently queried fields (e.g., user IDs, transaction signatures) to support real-time Safe Mode checks and transaction simulations.
- **Solana Integration**: Tables for off-chain metadata (e.g., transaction histories, asset caches) to complement on-chain RPC calls, reducing latency for features like SPL token balances and NFT previews.
- **Safe Mode Support**: Dedicated tables for risk flagging (e.g., blacklisted addresses, behavioral patterns) to enable rule-based blocking of suspicious transactions based on amount thresholds, address novelty, instruction anomalies, and user deviations.
- **Phishing Prevention**: Caches for external threat data (e.g., from PhishTank or Solana-specific feeds) and URL validations to provide instant warnings during signing.
- **Scalability**: Relations for users, transactions, assets, and threats; supports future extensions like hardware wallet pairings (Ledger/YubiKey) via session tokens.
- **Compliance**: Timestamps for audits, soft deletes for GDPR, and enums for standardized states (e.g., transaction risk levels).

The schema assumes a multi-tenant setup where each user has a primary Solana wallet public key. Transaction data is logged post-simulation/preview for behavioral analysis, but only public details are stored. Estimated table growth: Users (~1M rows), Transactions (~10M rows/year for active users).

Prisma schema is provided below in a code block for direct implementation. This is version 1.0, aligned with project requirements for web app deployment on AWS Fargate with Docker.

## Entity-Relationship Diagram (High-Level)

- **Users** 1:N **Sessions** (biometric auth tracking)
- **Users** 1:N **Wallets** (multiple Solana-derived wallets per user)
- **Users** 1:N **Transactions** (signed/pending txns with risk flags)
- **Transactions** N:1 **RiskFlags** (embedded or related for Safe Mode)
- **Users** 1:N **BehaviorProfiles** (for deviation detection)
- **Global** : **ThreatCaches** (phishing URLs/domains, blacklisted addresses)
- **Wallets** 1:N **Assets** (SPL tokens, NFTs with metadata caches)
- **Transactions** N:1 **DeFiInteractions** (protocol-specific decoding)

(For visual ERD, generate via Prisma Studio or tools like dbdiagram.io based on this schema.)

## Prisma Schema

```prisma
// schema.prisma
// Generated for Secure Solana Wallet v1.0
// Database: PostgreSQL
// ORM: Prisma
// Focus: Biometric sessions, Safe Mode flagging, phishing caches, Solana asset support

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String   @id @default(cuid())
  email             String   @unique
  username          String?  @unique
  solanaPublicKey   String   @unique // Primary wallet pubkey; additional via Wallets
  safeModeEnabled   Boolean  @default(true)
  riskThreshold     Float    @default(0.5) // Customizable threshold for txn blocking (0-1 scale)
  biometricPrefs    Json?    // e.g., { "methods": ["fingerprint", "faceid"], "enabled": true }
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  lastActivity      DateTime @default(now()) @updatedAt // For behavioral deviation detection
  isActive          Boolean  @default(true) // Soft delete flag

  // Relations
  sessions          Session[]
  wallets           Wallet[]
  transactions      Transaction[]
  behaviorProfiles  BehaviorProfile[]
  assetCaches       AssetCache[]

  @@map("users")
  @@index([solanaPublicKey])
  @@index([email])
}

model Session {
  id               String   @id @default(cuid())
  userId           String
  authenticatorId  String   // WebAuthn credential ID (public, non-sensitive)
  authMethod       AuthMethod // Enum: FINGERPRINT, FACEID, WEBAUTHN, etc.
  challenge        String   // Hashed WebAuthn challenge for verification
  expiry           DateTime
  isValid          Boolean  @default(true)
  createdAt        DateTime @default(now())

  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, authenticatorId])
  @@map("sessions")
  @@index([userId])
  @@index([expiry]) // For cleanup of expired sessions
}

enum AuthMethod {
  FINGERPRINT
  FACEID
  WEBAUTHN_TOUCHID
  WEBAUTHN_WINDOWS_HELLO
  HARDWARE_LEDGER
  HARDWARE_YUBIKEY
}

model Wallet {
  id              String   @id @default(cuid())
  userId          String
  publicKey       String   @unique // Solana pubkey (PDA support via derivation flags)
  label           String?  // User-friendly name (e.g., "Main Wallet")
  isPrimary       Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions    Transaction[]
  assets          AssetCache[]

  @@map("wallets")
  @@index([userId])
  @@index([publicKey])
}

model Transaction {
  id                String         @id @default(cuid())
  signature         String         @unique // Solana txn signature (post-broadcast)
  walletId          String
  userId            String
  amount            Decimal?       // SOL or token amount; null for complex txns
  recipientAddress  String?        // Primary recipient; for multi-sig detection
  instructions      Json?          // Decoded Solana instructions (e.g., SPL transfer details)
  simulationResult  Json?          // From simulateTransaction RPC: { success: bool, logs: [] }
  riskScore         Float          @default(0.0) // 0-1; triggers Safe Mode block if > threshold
  riskFlags         RiskFlag[]     // Embedded flags for quick checks
  isSigned          Boolean        @default(false)
  isBlocked         Boolean        @default(false) // Safe Mode auto-block
  phishingWarning   Boolean        @default(false) // From URL/threat checks
  createdAt         DateTime       @default(now())
  signedAt          DateTime?
  broadcastAt       DateTime?

  wallet            Wallet         @relation(fields: [walletId], references: [id], onDelete: Cascade)
  user              User           @relation(fields: [userId], references: [id])
  defiInteractions  DeFiInteraction[]

  @@map("transactions")
  @@index([userId])
  @@index([walletId])
  @@index([signature])
  @@index([createdAt]) // For history pagination
  @@index([riskScore]) // For Safe Mode analytics
}

model RiskFlag {
  id               String      @id @default(cuid())
  transactionId    String
  flagType         FlagType    // Enum: LARGE_AMOUNT, NEW_ADDRESS, BLACKLISTED, INSTRUCTION_ANOMALY, BEHAVIOR_DEVIATION
  details          Json?       // e.g., { "threshold": 100, "actual": 150, "reason": "Exceeds user avg" }
  severity         Severity    @default(MEDIUM)
  createdAt        DateTime    @default(now())

  transaction      Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@map("risk_flags")
  @@index([transactionId])
}

enum FlagType {
  LARGE_AMOUNT
  FIRST_TIME_ADDRESS
  BLACKLISTED_ADDRESS
  UNUSUAL_INSTRUCTIONS
  BEHAVIOR_DEVIATION
}

enum Severity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model BehaviorProfile {
  id              String   @id @default(cuid())
  userId          String
  avgAmount       Decimal  @default(0)
  commonAddresses Json?    // Array of frequent pubkeys
  txnFrequency    Int      @default(0) // Avg txns per day
  deviationScore  Float    @default(0.0) // For Safe Mode behavioral checks
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId])
  @@map("behavior_profiles")
  @@index([userId])
}

model ThreatCache {
  id          String   @id @default(cuid())
  type        CacheType // Enum: PHISHING_URL, BLACKLISTED_DOMAIN, THREAT_ADDRESS
  value       String   @unique // e.g., "phishy.dapp", "bad-pubkey123"
  source      String   // e.g., "PhishTank", "Solana Security Feed"
  isActive    Boolean  @default(true)
  lastUpdated DateTime @default(now())
  expiresAt   DateTime // For periodic refresh from external APIs

  @@map("threat_caches")
  @@index([type])
  @@index([value])
  @@index([expiresAt]) // Auto-purge expired threats
}

enum CacheType {
  PHISHING_URL
  BLACKLISTED_DOMAIN
  THREAT_ADDRESS
  SUSPICIOUS_PROTOCOL
}

model AssetCache {
  id           String   @id @default(cuid())
  walletId     String
  mintAddress  String   // SPL token or NFT mint
  assetType    AssetType // Enum: SPL_TOKEN, NFT, DEFI_POSITION
  metadata     Json?    // Cached NFT metadata or token info (fetched via Solana RPC/Metaplex)
  balance      Decimal  @default(0)
  lastSync     DateTime @default(now())

  wallet       Wallet   @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@unique([walletId, mintAddress])
  @@map("asset_caches")
  @@index([walletId])
  @@index([mintAddress])
}

enum AssetType {
  SPL_TOKEN
  NFT
  DEFI_POSITION
}

model DeFiInteraction {
  id             String   @id @default(cuid())
  transactionId  String
  protocol       String   // e.g., "Raydium", "Jupiter"
  action         String   // e.g., "swap", "lend"
  decodedParams  Json?    // Parsed instruction data for previews
  riskNote       String?  // Safe Mode-specific warnings

  transaction    Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@map("defi_interactions")
  @@index([transactionId])
}
```

## Implementation Notes

### Migrations and Seeding
- Use `prisma migrate dev` for initial setup. Create migrations for adding indexes on high-traffic fields (e.g., `riskScore` for Safe Mode queries).
- Seed initial data: Populate `ThreatCache` with bootstrap blacklists (e.g., known Solana phishing domains from PhishTank API). Example seed script:
  ```prisma
  // prisma/seed.ts
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();
  async function main() {
    await prisma.threatCache.createMany({
      data: [
        { type: 'PHISHING_URL', value: 'fake-solana-sign.com', source: 'PhishTank', expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        // Add Solana-specific threats
      ],
    });
  }
  main();
  ```
- Enforce constraints: Unique indexes prevent duplicate sessions; foreign keys cascade deletes for cleanup.

### Security Considerations
- **Biometrics**: Store only public WebAuthn IDs and challenges (hashed with bcrypt in app layer). No raw biometric data.
- **Encryption**: For `Json` fields like `instructions` or `metadata`, apply field-level encryption in Node.js/Express middleware using `crypto` module before Prisma save.
- **Access Control**: Backend APIs (e.g., via NestJS) should use JWTs tied to `User.id` for row-level security. Example: Query transactions only for authenticated user's `solanaPublicKey`.
- **Auditing**: Add a separate `AuditLog` model (not included here for brevity) to track Safe Mode blocks and phishing warnings.

### Integration with Other Components
- **Frontend (Next.js/Zustand)**: Expose schemas via Prisma-generated types for TypeScript safety. APIs for fetching `Transaction.riskFlags` during signing previews.
- **Backend (Node.js/Express)**: Use Prisma Client for CRUD. Example endpoint: `POST /api/transactions/simulate` – simulates txn, computes `riskScore` using heuristics (e.g., compare `amount` to `BehaviorProfile.avgAmount`), checks `ThreatCache`, and returns preview with warnings.
- **Solana RPC**: On txn creation, sync `AssetCache.balance` via `@solana/web3.js` getTokenAccountsByOwner; store `simulationResult` for DeFi decoding.
- **External APIs**: Cron job (e.g., via AWS Lambda) to refresh `ThreatCache` from PhishTank/Solana feeds every 6 hours.
- **Hardware Wallets**: Extend `Session` with `authMethod` for Ledger/YubiKey; store pairing tokens (not keys) for WebUSB auth.

### Performance Optimizations
- **Queries**: Use Prisma's `include` for relations (e.g., `findMany({ where: { userId }, include: { riskFlags: true } })`) in Safe Mode checks to avoid N+1 issues.
- **Caching**: Redis for hot `ThreatCache` queries; Prisma Accelerate for global DB if scaling to multi-region.
- **Analytics**: Aggregate views for user behavior (e.g., `CREATE VIEW user_risk_summary AS SELECT userId, AVG(riskScore) FROM transactions GROUP BY userId`).

### Future Extensions
- Add `HardwarePairing` model for Ledger/YubiKey state.
- ML integration: Expand `BehaviorProfile` with vector embeddings for advanced deviation detection.
- Multi-chain: Generalize `Wallet.publicKey` for other blockchains.

This schema ensures the database supports all key features (biometric login, Safe Mode blocking, phishing prevention, Solana asset handling) while remaining lean and secure. For updates, reference PRs in the repo under `/db/migrations`. Unique ID: 1763624900451_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__db_schema_md_3sqdeh