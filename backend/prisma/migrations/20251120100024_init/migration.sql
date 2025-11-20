-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('FINGERPRINT', 'FACEID', 'WEBAUTHN_TOUCHID', 'WEBAUTHN_WINDOWS_HELLO', 'HARDWARE_LEDGER', 'HARDWARE_YUBIKEY');

-- CreateEnum
CREATE TYPE "FlagType" AS ENUM ('LARGE_AMOUNT', 'FIRST_TIME_ADDRESS', 'BLACKLISTED_ADDRESS', 'UNUSUAL_INSTRUCTIONS', 'BEHAVIOR_DEVIATION', 'PHISHING_RISK');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CacheType" AS ENUM ('PHISHING_URL', 'BLACKLISTED_DOMAIN', 'THREAT_ADDRESS', 'SUSPICIOUS_PROTOCOL');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('SPL_TOKEN', 'NFT', 'DEFI_POSITION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "solanaPublicKey" TEXT NOT NULL,
    "safeModeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "riskThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "biometricPrefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authenticators" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "signCount" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authenticators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authenticatorId" TEXT,
    "authMethod" "AuthMethod" NOT NULL,
    "challenge" TEXT,
    "expiry" TIMESTAMP(3) NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "balance" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "signature" TEXT,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30),
    "recipientAddress" TEXT,
    "instructions" JSONB,
    "simulationResult" JSONB,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isSigned" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "phishingWarning" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedAt" TIMESTAMP(3),
    "broadcastAt" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_flags" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT,
    "flagType" "FlagType" NOT NULL,
    "details" JSONB,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavior_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avgAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "commonAddresses" JSONB,
    "txnFrequency" INTEGER NOT NULL DEFAULT 0,
    "deviationScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behavior_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threat_caches" (
    "id" TEXT NOT NULL,
    "type" "CacheType" NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threat_caches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_caches" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "metadata" JSONB,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lastSync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_caches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defi_interactions" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "decodedParams" JSONB,
    "riskNote" TEXT,

    CONSTRAINT "defi_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_solanaPublicKey_key" ON "users"("solanaPublicKey");

-- CreateIndex
CREATE INDEX "users_solanaPublicKey_idx" ON "users"("solanaPublicKey");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "authenticators_credentialId_key" ON "authenticators"("credentialId");

-- CreateIndex
CREATE INDEX "authenticators_userId_credentialId_idx" ON "authenticators"("userId", "credentialId");

-- CreateIndex
CREATE INDEX "authenticators_lastUsedAt_idx" ON "authenticators"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiry_idx" ON "sessions"("expiry");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_userId_authenticatorId_key" ON "sessions"("userId", "authenticatorId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_publicKey_key" ON "wallets"("publicKey");

-- CreateIndex
CREATE INDEX "wallets_userId_idx" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "wallets_publicKey_idx" ON "wallets"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_signature_key" ON "transactions"("signature");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_walletId_idx" ON "transactions"("walletId");

-- CreateIndex
CREATE INDEX "transactions_signature_idx" ON "transactions"("signature");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_riskScore_idx" ON "transactions"("riskScore");

-- CreateIndex
CREATE INDEX "risk_flags_transactionId_idx" ON "risk_flags"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "behavior_profiles_userId_key" ON "behavior_profiles"("userId");

-- CreateIndex
CREATE INDEX "behavior_profiles_userId_idx" ON "behavior_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "threat_caches_value_key" ON "threat_caches"("value");

-- CreateIndex
CREATE INDEX "threat_caches_type_idx" ON "threat_caches"("type");

-- CreateIndex
CREATE INDEX "threat_caches_value_idx" ON "threat_caches"("value");

-- CreateIndex
CREATE INDEX "threat_caches_expiresAt_idx" ON "threat_caches"("expiresAt");

-- CreateIndex
CREATE INDEX "asset_caches_walletId_idx" ON "asset_caches"("walletId");

-- CreateIndex
CREATE INDEX "asset_caches_mintAddress_idx" ON "asset_caches"("mintAddress");

-- CreateIndex
CREATE UNIQUE INDEX "asset_caches_walletId_mintAddress_key" ON "asset_caches"("walletId", "mintAddress");

-- CreateIndex
CREATE INDEX "defi_interactions_transactionId_idx" ON "defi_interactions"("transactionId");

-- AddForeignKey
ALTER TABLE "authenticators" ADD CONSTRAINT "authenticators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_profiles" ADD CONSTRAINT "behavior_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_caches" ADD CONSTRAINT "asset_caches_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defi_interactions" ADD CONSTRAINT "defi_interactions_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
