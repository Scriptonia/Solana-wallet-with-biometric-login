# Prisma Migrations for Secure Solana Wallet

## Overview

This document outlines the Prisma migration strategy and history for the Secure Solana Wallet project, a web application built with Next.js (frontend), Node.js/Express (backend), and PostgreSQL as the primary database using Prisma ORM. The database schema evolves to support core features including biometric-authenticated user sessions (via WebAuthn tokens), Safe Mode transaction flagging (based on amount thresholds, address history, instruction anomalies, and behavioral deviations), phishing prevention integrations (e.g., threat database caches), and Solana ecosystem support (e.g., SPL tokens, NFTs, DeFi transaction logs).

Migrations are designed to be incremental, reversible, and non-disruptive to ensure zero-downtime deployments in production (e.g., via AWS Fargate or Vercel). We use Prisma's declarative schema approach in `prisma/schema.prisma` and generate migrations with `npx prisma migrate dev` for development, `npx prisma migrate deploy` for production, and `npx prisma db push` for rapid prototyping.

**Key Principles:**
- **Data Privacy Compliance:** No storage of raw biometric data (e.g., fingerprints or FaceID templates); instead, store hashed WebAuthn credentials and session tokens. Comply with GDPR/CCPA for user wallet data.
- **Scalability:** Use PostgreSQL indexes on high-query fields (e.g., user_id, transaction_hash) to handle Solana's high TPS (up to 65,000). Partition transaction logs by date for long-term retention.
- **Feature Alignment:** Migrations tie directly to project requirements:
  - Biometric login: User sessions and auth challenges.
  - Safe Mode: Flagging rules, behavioral profiles, and blocked transaction audits.
  - Phishing Prevention: Cached threat lists and validation logs.
  - Solana Integration: Wallet addresses, transaction simulations, and asset metadata.
- **Version Control:** Each migration is tagged with a semantic version (e.g., v1.0.0) and includes SQL previews for manual review. Rollbacks are supported via `npx prisma migrate resolve --rolled-back <migration_name>`.
- **Testing:** Post-migration scripts run automated tests (e.g., via Jest) to verify data integrity, especially for Solana-derived data like PDAs or SPL token balances.

**Environment-Specific Notes:**
- Development: Local PostgreSQL (Dockerized via `docker-compose.yml` in the db directory).
- Production: AWS RDS PostgreSQL with read replicas for query-heavy Safe Mode analytics.
- Migration Tooling: Integrate with CI/CD (e.g., GitHub Actions) to apply migrations on deploy.

## Migration Strategy

1. **Initial Setup (Baseline):** Create foundational tables for users, wallets, and sessions.
2. **Feature Iterations:** Add tables/models incrementally based on user stories:
   - Authentication and Security (Steps 1-2).
   - Transaction Monitoring and Safe Mode (Steps 3-4).
   - Phishing and External Integrations (Step 5).
   - Solana Asset Support (Step 6).
3. **Optimizations:** Indexes, constraints, and views for performance (e.g., query user behavior deviations without full scans).
4. **Data Seeding:** Use Prisma's seed script (`prisma/seed.ts`) to populate initial data like default Safe Mode thresholds (e.g., large amount > 10 SOL) or blacklisted address seeds from PhishTank APIs.
5. **Rollback and Auditing:** All migrations include `@map` directives for legacy field compatibility. Audit logs table tracks migration runs.

**Tools and Commands:**
- Generate: `npx prisma migrate dev --name <description>`
- Preview SQL: `npx prisma migrate diff --from-empty --to-schema-datamodel`
- Lint: `npx prisma validate`
- Studio for Inspection: `npx prisma studio` (web UI at http://localhost:5555)

## Migration History

### Migration 1: v1.0.0 - Initial Schema (2023-10-15)
**Description:** Establishes core user and wallet entities to support biometric login and basic Solana wallet creation. Aligns with user story: "As a new user, I can create a wallet using device biometrics to secure my Solana address without exposing private keys."

**Changes:**
- Added `User` model: Stores user profiles with hashed WebAuthn credentials (no biometrics), email (optional for recovery), and preferences (e.g., safe_mode_enabled: boolean).
- Added `Wallet` model: Links to User, stores public Solana address, PDA support flag, and encrypted key derivation hints (using secure enclaves, not raw keys).
- Added `Session` model: For biometric auth sessions, including WebAuthn challenge tokens, expiration (TTL: 30 days), and device metadata (e.g., authenticator_type: 'fingerprint' | 'faceid' | 'touchid' | 'windows_hello').
- Indexes: Unique on user.email and wallet.address; composite on session.user_id + expires_at for cleanup queries.
- Constraints: Enforce wallet.address as Solana-compatible base58 string (length 32-44).

**Prisma Schema Snippet (schema.prisma):**
```prisma
model User {
  id                String   @id @default(cuid())
  email             String?  @unique
  webauthn_cred_id  String   // Hashed WebAuthn credential ID
  safe_mode_enabled Boolean  @default(true)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  wallets           Wallet[]
  sessions          Session[]
  behaviorProfiles  BehaviorProfile[] // Forward ref for later migrations
}

model Wallet {
  id         String   @id @default(cuid())
  address    String   @unique // Solana public key (base58)
  user_id    String
  pda_support Boolean  @default(false) // Program-Derived Addresses
  user       User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  transactions Transaction[] // Forward ref
  created_at DateTime @default(now())
}

model Session {
  id              String   @id @default(cuid())
  user_id         String
  authenticator_type String // Enum: 'fingerprint', 'faceid', etc.
  challenge_token Bytes   // Encrypted WebAuthn challenge
  expires_at      DateTime
  is_active       Boolean  @default(true)
  user            User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  @@unique([user_id, expires_at]) // Prevent duplicate active sessions
  @@index([expires_at]) // For TTL cleanup
}
```

**SQL Preview (Generated):**
```sql
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "webauthn_cred_id" TEXT NOT NULL,
    "safe_mode_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Additional tables and indexes...
```

**Rationale:** Supports biometric login without storing sensitive data; wallets enable Solana RPC interactions (e.g., via @solana/web3.js in backend).

**Post-Migration Actions:** Seed 1 test user with mock WebAuthn token. Test: Verify session creation via API endpoint `/api/auth/webauthn/register`.

### Migration 2: v1.1.0 - Safe Mode Foundations (2023-10-20)
**Description:** Introduces transaction flagging and behavioral profiling for Safe Mode. User story: "As a user, Safe Mode automatically flags and blocks suspicious transactions based on amount (>10 SOL), first-time addresses, unusual instructions, or behavior deviations."

**Changes:**
- Added `Transaction` model: Logs signed/submitted transactions with Solana hash, amount (in lamports), instructions (JSON-decoded), and simulation result (via Solana's simulateTransaction RPC).
- Added `TransactionFlag` model: Relations to Transaction; flags like 'large_amount', 'blacklisted_address', 'first_time', 'behavior_deviation', 'unusual_instruction'. Includes risk_score (0-100) and auto_blocked (boolean).
- Added `BehaviorProfile` model: Per-user analytics; tracks avg_tx_amount, freq_tx_per_day, common_recipients (array of addresses). Used for deviation detection (e.g., >2x avg amount flags deviation).
- Added `SafeModeRule` model: Customizable rules (e.g., threshold_amount: BigInt, blacklisted_addresses: String[] via JSON). Global and per-user.
- Views: `RiskyTransactions` view joining Transaction and Flag for dashboard queries.
- Indexes: On transaction.hash (Solana unique), behavior_profile.user_id + date_range for time-series analysis.

**Prisma Schema Snippet:**
```prisma
model Transaction {
  id            String         @id @default(cuid())
  hash          String         @unique // Solana tx signature
  wallet_id     String
  amount_lamports BigInt
  instructions  Json?          // Decoded Solana instructions
  simulation_result Json?      // Preview from simulateTransaction
  timestamp     DateTime       @default(now())
  wallet        Wallet         @relation(fields: [wallet_id], references: [id])
  flags         TransactionFlag[]
  created_at    DateTime       @default(now())
  @@index([hash])
}

model TransactionFlag {
  id                String       @id @default(cuid())
  transaction_id    String
  flag_type         FlagType     // Enum: LARGE_AMOUNT, BLACKLISTED_ADDRESS, etc.
  risk_score        Int          @default(50)
  auto_blocked      Boolean      @default(false)
  details           Json?        // e.g., {deviation_factor: 2.5}
  transaction       Transaction  @relation(fields: [transaction_id], references: [id], onDelete: Cascade)
  created_at        DateTime     @default(now())
}

enum FlagType {
  LARGE_AMOUNT
  FIRST_TIME_ADDRESS
  BLACKLISTED_ADDRESS
  UNUSUAL_INSTRUCTION
  BEHAVIOR_DEVIATION
  PHISHING_RISK  // Forward for next migration
}

model BehaviorProfile {
  id             String   @id @default(cuid())
  user_id        String   @unique
  avg_tx_amount  BigDecimal?
  freq_tx_day    Int      @default(0)
  common_recipients String[] // Solana addresses
  last_updated   DateTime @updatedAt
  user           User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
}

model SafeModeRule {
  id                  String   @id @default(cuid())
  user_id             String?
  threshold_amount    BigInt   @default(10000000000) // 10 SOL in lamports
  blacklisted_addresses String[] @default([])
  enabled             Boolean  @default(true)
  user                User?    @relation(fields: [user_id], references: [id])
  created_at          DateTime @default(now())
}
```

**SQL Preview:**
```sql
CREATE TYPE "FlagType" AS ENUM ('LARGE_AMOUNT', 'FIRST_TIME_ADDRESS', ...);

CREATE TABLE "Transaction" (
    -- Columns as above
);

-- Indexes and foreign keys...
```

**Rationale:** Enables backend logic for flagging (e.g., in Express route `/api/transactions/flag`); behavior profiles feed ML heuristics (future optional integration). Supports DeFi/NFT tx decoding via JSON fields.

**Post-Migration Actions:** Update seed script to add sample transactions with flags. Test: Simulate a large tx and verify auto-block via API.

### Migration 3: v1.2.0 - Phishing Prevention and Integrations (2023-10-25)
**Description:** Adds phishing detection caches and audit logs. User story: "As a user, the wallet validates URLs/domains, previews transactions, and checks against external databases before signing."

**Changes:**
- Added `PhishingCache` model: Stores fetched threats from PhishTank/blockchain feeds; includes domain, threat_level (low/medium/high), last_fetched (TTL: 1 hour).
- Added `ValidationLog` model: Records per-transaction validations (e.g., URL checks, simulation previews); links to Transaction.
- Extended `TransactionFlag` with PHISHING_RISK enum value.
- Added `ExternalIntegration` model: Config for APIs (e.g., PhishTank key, Solana RPC endpoint); per-environment.
- Indexes: Full-text search on PhishingCache.domain for quick lookups.

**Prisma Schema Snippet:**
```prisma
model PhishingCache {
  id          String   @id @default(cuid())
  domain      String   @unique
  threat_level ThreatLevel
  source      String   // e.g., 'phishtank', 'solana-threat-feed'
  last_fetched DateTime @default(now())
  expires_at  DateTime
  @@index([domain]) // For validation queries
}

enum ThreatLevel {
  LOW
  MEDIUM
  HIGH
}

model ValidationLog {
  id             String      @id @default(cuid())
  transaction_id String      @unique
  url_validated  String?
  simulation_preview Json?   // Full tx preview
  threat_check   Boolean     @default(false)
  passed         Boolean     @default(true)
  transaction    Transaction @relation(fields: [transaction_id], references: [id], onDelete: Cascade)
  created_at     DateTime    @default(now())
}

model ExternalIntegration {
  id         String @id @default(cuid())
  name       String @unique // e.g., 'phishtank_api'
  api_key    String // Encrypted
  endpoint   String
  enabled    Boolean @default(true)
  created_at DateTime @default(now())
}
```

**Rationale:** Backend can query PhishingCache in real-time during tx signing (e.g., `/api/phishing/validate` endpoint); logs enable user warnings and audits. Integrates with hardware wallet support (e.g., log YubiKey validations).

**Post-Migration Actions:** Seed with sample phishing domains. Test: API call to validate a mock URL and flag a tx.

### Migration 4: v1.3.0 - Asset Support and Optimizations (2023-11-01)
**Description:** Enhances for SPL tokens, NFTs, and DeFi. User story: "As a trader, I can manage SPL tokens and NFTs with Safe Mode protections."

**Changes:**
- Added `Asset` model: Tracks SPL tokens/NFTs per wallet; includes metadata (fetched via Solana RPC), balance, and risk_flags (e.g., scam NFT detection).
- Added `DeFiInteraction` model: Logs protocol interactions (e.g., swap on Jupiter); extends Transaction with decoded params.
- Optimizations: Add composite indexes on Asset.wallet_id + token_mint; migrate BigInt fields to use Prisma's supported types.
- Views: `UserPortfolio` aggregating wallet assets for frontend dashboards.

**Prisma Schema Snippet:**
```prisma
model Asset {
  id        String   @id @default(cuid())
  wallet_id String
  type      AssetType // Enum: SPL_TOKEN, NFT
  mint_address String // Solana mint
  balance   BigDecimal?
  metadata  Json?    // NFT/SPL details
  risk_flags Json[]  @default([]) // e.g., ['potential_scam']
  wallet    Wallet   @relation(fields: [wallet_id], references: [id])
  created_at DateTime @default(now())
  @@unique([wallet_id, mint_address])
}

enum AssetType {
  SPL_TOKEN
  NFT
  DEFI_POSITION
}

model DeFiInteraction {
  id           String     @id @default(cuid())
  transaction_id String   @unique
  protocol     String     // e.g., 'jupiter', 'raydium'
  action       String     // 'swap', 'lend'
  params       Json       // Decoded DeFi params
  transaction  Transaction @relation(fields: [transaction_id], references: [id], onDelete: Cascade)
  created_at   DateTime   @default(now())
}
```

**Rationale:** Supports optional hardware compatibility (e.g., Ledger signing logs); enables tx decoding for DeFi warnings. Portfolio view reduces frontend queries.

**Post-Migration Actions:** Seed assets for test wallet. Test: Fetch NFT metadata and flag risky ones.

## Future Migrations
- v1.4.0: Hardware Wallet Integration (add HardwareDevice model for Ledger/YubiKey pairings).
- v2.0.0: Analytics Enhancements (add ML-based behavior models; migrate to partitioned tables).
- Breaking Changes: Handle via data migration scripts (e.g., anonymize old sessions).

## Troubleshooting
- **Migration Conflicts:** Use `npx prisma migrate resolve --applied <name>` for skipped migrations.
- **Data Loss Prevention:** Always backup RDS before production deploys.
- **Performance Monitoring:** Integrate with Prisma Accelerate for query caching on high-traffic Safe Mode checks.

For schema updates, coordinate with BackendDev via PR reviews. FrontendDev can query these models via generated Prisma Client in API routes (e.g., `/api/user/[id]/transactions`).

*Last Updated: 2023-11-01 | Unique ID: 1763624900463_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__db_migrations_md_x5ddef*