# Backend Services Architecture

## Overview

The backend services for the Secure Solana Wallet application form a modular, scalable architecture designed to support secure wallet operations, biometric authentication, and advanced safety features like Safe Mode and phishing prevention. Built primarily on Node.js with Express.js for API routing and orchestration, the services leverage PostgreSQL as the primary database (managed via Prisma ORM) for user data, transaction histories, and behavioral analytics. Optional integrations with NestJS modules are used for complex business logic in services like Safe Mode, ensuring type safety with TypeScript.

This architecture emphasizes security through JWT-based session management (post-biometric auth), rate limiting, and encryption for sensitive data (e.g., using AES-256 for stored keys and WebAuthn credentials). Services communicate internally via RESTful APIs or message queues (e.g., Redis for caching and BullMQ for async tasks like transaction simulations). External integrations include Solana RPC endpoints (e.g., via `@solana/web3.js`), threat databases (PhishTank API, Solana-specific feeds like Solana Labs' security alerts), and hardware wallet protocols (WebUSB for Ledger).

Key principles:
- **Modularity**: Each service is isolated but composable, allowing independent scaling (e.g., via Docker containers on AWS Fargate).
- **Security-First**: All services enforce CORS policies tailored to the web app and browser extension, with input validation using Joi schemas.
- **Performance**: Async processing for blockchain interactions to minimize latency; caching with Redis for frequent queries like address blacklists.
- **Observability**: Integrated logging with Winston and metrics via Prometheus for monitoring transaction flagging accuracy.

Services are deployed as a monorepo structure under `/backend/services/`, with shared utilities in `/backend/common/` for Solana helpers, biometric token handling, and error responses.

## Core Services

### 1. Authentication Service (`/services/auth`)

**Purpose**: Manages user onboarding, biometric login, and session lifecycle, integrating WebAuthn for cross-platform biometrics (fingerprint, FaceID/Face Unlock, TouchID, Windows Hello). This service ensures secure, passwordless access while storing minimal user data to comply with privacy standards.

**Responsibilities**:
- Register new users by generating and storing WebAuthn public keys in PostgreSQL (table: `user_authenticators`).
- Handle biometric challenges: Create server-side challenges, verify authenticator responses, and issue JWT tokens.
- Session management: Refresh tokens, logout, and revoke sessions on suspicious activity (e.g., multiple failed biometrics).
- Hardware wallet pairing: Optional Ledger/YubiKey registration via WebUSB attestation.

**Technologies**:
- Express.js routes for `/api/auth/register`, `/api/auth/login`, `/api/auth/challenge`.
- WebAuthn library: `@simplewebauthn/server`.
- Database: Prisma models for `User` (id, email_opt_in) and `Authenticator` (user_id, credential_id, public_key).
- Security: Argon2 for challenge salting; rate limiting on login endpoints (max 5 attempts/minute).

**API Contracts** (for FrontendDev coordination):
- `POST /api/auth/register`: Body `{ challenge: string, publicKey: object }` → Returns `{ sessionToken: string, userId: uuid }`.
- `POST /api/auth/login`: Body `{ credential: object }` → Returns `{ jwt: string, expiresIn: number }`.
- Error Responses: Standardized `{ error: 'InvalidBiometric', code: 401 }`.

**Interactions**:
- Calls User Service for profile creation.
- Integrates with Safe Mode Service to flag anomalous login patterns (e.g., new device from unusual IP).
- Async: Stores login events for behavioral analytics.

**Example Implementation Snippet** (Express route):
```typescript
app.post('/api/auth/login', async (req, res) => {
  const { credential } = req.body;
  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge: req.session.challenge,
    expectedOrigin: process.env.ALLOWED_ORIGIN,
    expectedRPID: process.env.RP_ID,
  });
  if (verification.verified) {
    const token = jwt.sign({ userId: verification.userId }, process.env.JWT_SECRET);
    await prisma.user.update({ where: { id: verification.userId }, data: { lastLogin: new Date() } });
    res.json({ jwt: token, expiresIn: 3600 });
  } else {
    res.status(401).json({ error: 'BiometricVerificationFailed' });
  }
});
```

### 2. Wallet Service (`/services/wallet`)

**Purpose**: Core blockchain interaction layer for Solana wallet management, supporting SPL tokens, NFTs, DeFi protocols, and transaction decoding. Handles key generation, balance queries, and optional hardware wallet signing.

**Responsibilities**:
- Wallet creation/recovery: Generate mnemonic seeds (encrypted storage) or import from hardware.
- Asset management: Fetch balances, NFT metadata (via Metaplex SDK), and SPL token accounts.
- Transaction building: Decode instructions using `@solana/web3.js` and prepare for simulation.
- Hardware integration: Proxy WebUSB calls for Ledger signing, ensuring no private keys touch the server.

**Technologies**:
- Solana SDK: `@solana/web3.js`, `@metaplex-foundation/js` for NFTs.
- Database: Prisma for `Wallet` (user_id, public_key, encrypted_seed) and `Asset` (wallet_id, token_mint, balance).
- Caching: Redis for recent balances to reduce RPC calls.

**API Contracts**:
- `GET /api/wallet/balance/:publicKey`: Query param `includeTokens=true` → Returns `{ sol: number, tokens: array }`.
- `POST /api/wallet/transaction`: Body `{ instructions: array, signers: array }` → Returns `{ transaction: base58, signature: string }`.
- Supports PDA derivation for DeFi protocols (e.g., Serum, Raydium).

**Interactions**:
- Collaborates with Transaction Service for signing previews.
- Feeds data to Safe Mode Service for risk flagging (e.g., first-time address transfers).
- External: Solana RPC (e.g., `https://api.mainnet-beta.solana.com`); Helius API for NFT metadata.

**Unique Handling**: For DeFi, decodes custom instructions (e.g., swap amounts) and simulates via `connection.simulateTransaction()` before API response.

### 3. Safe Mode Service (`/services/safe-mode`)

**Purpose**: Implements the flagship Safe Mode feature, using rule-based heuristics and machine learning lite (threshold-based) to flag and block suspicious transactions. Flags trigger on large amounts (> user-defined threshold, e.g., 10 SOL), first-time/blacklisted addresses, unusual instructions (e.g., non-standard SPL transfers), and behavioral deviations (e.g., sudden high-volume activity).

**Responsibilities**:
- Risk assessment: Evaluate transactions against user profiles (e.g., average tx volume).
- Auto-blocking: Reject or queue risky txs for manual review; send warnings via WebSocket.
- Behavior analytics: Track patterns using session data (e.g., deviation score > 0.8 blocks tx).
- Configurable rules: User toggles (e.g., enable/disable large amount flags).

**Technologies**:
- NestJS for rule engine (custom decorators for flagging logic).
- Database: Prisma `TransactionFlag` (tx_id, risk_level: 'low'|'medium'|'high', reasons: array) and `UserBehavior` (user_id, avg_tx_amount, recent_patterns).
- ML Lite: Simple anomaly detection with `@tensorflow/tfjs-node` for deviation scoring.

**API Contracts**:
- `POST /api/safe-mode/assess`: Body `{ transaction: base58, userId: uuid }` → Returns `{ risk: 'high', block: true, warnings: ['LargeAmount', 'BlacklistedAddress'] }`.
- `GET /api/safe-mode/config/:userId`: Returns user-specific thresholds.

**Interactions**:
- Invoked by Transaction Service pre-signing.
- Integrates with Phishing Prevention for combined risk scores.
- Async Jobs: BullMQ queues for post-tx analysis (e.g., update behavior profiles).

**Example Logic** (Pseudocode):
```typescript
function assessRisk(tx: Transaction, userProfile: UserBehavior): RiskAssessment {
  let score = 0;
  if (tx.amount > userProfile.avg_tx_amount * 5) score += 0.4; // Large amount flag
  if (blacklist.includes(tx.destination)) score += 0.3; // Blacklisted address
  if (deviationScore(tx.instructions, userProfile.patterns) > 0.5) score += 0.3; // Behavior deviation
  return { risk: score > 0.6 ? 'high' : 'low', block: score > 0.8 };
}
```

### 4. Phishing Prevention Service (`/services/phishing`)

**Purpose**: Protects against scams via URL/domain validation, transaction simulation previews, and real-time checks against external threat databases. Ensures users see full previews before signing risky actions.

**Responsibilities**:
- Domain validation: Check dApp URLs against PhishTank and Solana phishing feeds.
- Simulation: Run `simulateTransaction` to preview effects (e.g., token burns).
- Threat integration: Query APIs for address/URL reputation; cache results.
- Preview generation: Decode tx for human-readable warnings (e.g., "This swaps 50% of your USDC").

**Technologies**:
- External APIs: PhishTank REST, Solana Beach API for malicious contracts.
- Solana: `simulateTransaction` with error parsing.
- Database: Prisma `ThreatCache` (url: string, is_phishy: boolean, expires: timestamp).

**API Contracts**:
- `POST /api/phishing/validate-url`: Body `{ url: string }` → Returns `{ safe: true, score: 0.95 }`.
- `POST /api/phishing/simulate`: Body `{ transaction: base58 }` → Returns `{ preview: { changes: array }, warnings: array }`.

**Interactions**:
- Called by Wallet/Transaction Services during tx prep.
- Feeds flags to Safe Mode for holistic blocking.
- WebSocket: Push real-time alerts to frontend for unsigned txs.

### 5. User Service (`/services/user`)

**Purpose**: Manages user profiles, preferences, and analytics for personalized safety (e.g., custom Safe Mode thresholds).

**Responsibilities**:
- Profile CRUD: Update biometrics, wallet links, behavior baselines.
- Analytics: Aggregate tx history for deviation models.
- Notifications: Queue warnings for risky signs.

**Technologies**:
- Prisma for core models: `User` (id, safe_mode_enabled: boolean, thresholds: json).
- Redis for session storage.

**API Contracts**:
- `PUT /api/user/preferences`: Body `{ thresholds: { max_amount: 10 } }` → Returns updated profile.

**Interactions**: Central hub for all services; ensures data consistency via transactions in Prisma.

## Service Orchestration and Deployment

- **Internal Communication**: gRPC for high-throughput (e.g., Safe Mode to Wallet) or Express proxies.
- **Error Handling**: Global middleware for 5xx retries; Sentry integration for alerts.
- **Testing**: Jest for unit/integration; mock Solana RPC with `solana-test-validator`.
- **Deployment**: Docker Compose for local dev; AWS Fargate for prod with auto-scaling based on tx volume. Environment vars for RPC endpoints and API keys (e.g., `PHISHTANK_API_KEY`).
- **Scalability Notes**: Safe Mode and Phishing services scale horizontally; use AWS Lambda for infrequent simulations.

This architecture aligns with ProductManager requirements for secure, feature-rich Solana interactions while providing robust APIs for FrontendDev (e.g., Next.js consumption). Future expansions (e.g., desktop app) can extend via shared Prisma migrations.

*Generated Uniquely for BackendDev - ID: 1763624900453_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__backend_services_md_wil8gm*