# Unit Test Structure for Secure Solana Wallet

## Overview

This document outlines the unit testing strategy for the Secure Solana Wallet project, a web application (with browser extension support) built on Next.js, TypeScript, and integrated with Solana blockchain features. Unit tests focus on isolating and verifying individual components, utilities, services, and business logic to ensure reliability, security, and adherence to key features like biometric authentication via WebAuthn, Safe Mode transaction flagging, phishing prevention, and Solana-specific operations (e.g., SPL tokens, NFTs, DeFi protocols).

The testing approach aligns with the project's technical requirements:
- **Frontend**: Next.js components, Zustand state management, and biometric/WebAuthn integrations.
- **Backend**: Node.js/Express services for Solana RPC interactions, rule-based flagging, and external API checks (e.g., phishing databases).
- **Shared Logic**: Utilities for transaction simulation, address validation, and behavioral analytics.
- **Database**: Prisma ORM interactions for user sessions, transaction history, and threat logs (complementing `db/schema.md` and `db/migrations.md` without duplicating schema definitions).

Unit tests are designed to be fast, deterministic, and mock-heavy to avoid real blockchain interactions or biometric hardware dependencies. They support the project's high complexity by covering edge cases in security-critical areas, such as flagging large transactions (>1 SOL threshold, customizable), blacklisted addresses, unusual instructions (e.g., non-standard SPL transfers), and user behavior deviations (e.g., sudden high-frequency signing).

**Test Framework**:
- **Primary**: Jest (with TypeScript support) for all layers.
- **Frontend-Specific**: React Testing Library (RTL) for component rendering and user interactions; `@testing-library/jest-dom` for assertions.
- **Backend-Specific**: Supertest for API endpoint mocking (though unit tests focus on services, not full integration).
- **Solana Integration**: `@solana/web3.js` mocks via `jest.mock` to simulate RPC calls without live network access.
- **Biometric Mocks**: Mock WebAuthn API using `navigator.credentials` overrides.
- **Coverage Tool**: Jest's built-in `--coverage` with thresholds: 90% statements, 80% branches for core modules; Istanbul reports in `coverage/` directory.
- **Running Tests**: `npm run test:unit` (or `yarn test:unit`) from project root; CI/CD integration via GitHub Actions or AWS CodeBuild for automated runs on PRs.

**General Guidelines**:
- Tests follow AAA pattern (Arrange, Act, Assert).
- Use descriptive names: e.g., `shouldFlagTransactionAsSuspiciousWhenAmountExceedsThreshold`.
- Mock external dependencies: Solana RPC, PhishTank API, hardware wallets (Ledger/YubiKey via WebUSB mocks).
- Security Focus: Test for false positives/negatives in Safe Mode (e.g., benign DeFi swaps vs. phishing drains).
- Isolation: No shared state between tests; reset mocks after each.
- Unique to Project: Tests incorporate Solana-specific data like Program Derived Addresses (PDAs), SPL token metadata, and transaction decoding via `simulateTransaction` RPC.

Test files are co-located with source files (e.g., `src/utils/transactionFlagger.test.ts`) or grouped in `__tests__/` directories. Aim for 1:1 test-to-function ratio for critical paths.

## Test Coverage by Module

### 1. Biometric Authentication Module (`src/auth/biometrics/`)
   This module handles WebAuthn-based login supporting fingerprint, FaceID/Face Unlock, TouchID, and Windows Hello. Tests verify credential creation/assertion without real hardware.

   **Key Test Suites**:
   - **WebAuthn Credential Creation**:
     - `shouldCreatePublicKeyCredentialOptionsForRegistration`: Mocks `navigator.credentials.create` with challenge generation; asserts options include user verification requirement and Solana-derived RP ID.
     - `shouldHandleUnsupportedBrowser`: Throws error when WebAuthn unavailable; tests fallback to password (project requires biometrics but allows graceful degradation).
     - Edge: Invalid challenge length (<32 bytes) rejects with validation error.
   
   - **Credential Assertion/Login**:
     - `shouldAuthenticateWithValidCredential`: Mocks successful assertion; verifies token generation and storage in secure localStorage (encrypted via Web Crypto API).
     - `shouldRejectInvalidSignature`: Simulates tampered authenticator data; asserts login failure and audit log entry (ties to DB schema for sessions).
     - Cross-Platform: Separate tests for desktop (Windows Hello mock) vs. mobile (FaceID simulation via user agent detection).
   
   - **Hardware Wallet Integration**:
     - `shouldPairWithLedgerViaWebUSB`: Mocks USB device connection; tests derivation path for Solana (m/44'/501'/0'/0') and signing preview.
     - `shouldFallbackToSoftwareWalletOnYubiKeyFailure`: Handles WebHID errors; ensures seamless switch without user data loss.
   
   **Mocks**: `global.navigator.credentials` polyfill; Jest spy on `crypto.subtle` for key derivation.
   **Coverage Goal**: 95% – Critical for user security; include fuzz tests for malformed credentials.

### 2. Safe Mode Transaction Flagger (`src/safeMode/flagger/`)
   Core logic for blocking suspicious transactions based on user answers: large amounts (> configurable SOL threshold, e.g., 5 SOL), first-time/blacklisted addresses, unusual instructions, and behavior deviations (e.g., >3 txns/min).

   **Key Test Suites**:
   - **Amount Threshold Flagging**:
     - `shouldFlagTransactionWhenAmountExceedsThreshold`: Input: Transaction with 10 SOL transfer; asserts flag with severity "HIGH" and block action.
     - `shouldNotFlagSmallAmounts`: 0.1 SOL txn passes; verifies no warning for habitual small NFT mints.
     - Configurable: Tests dynamic thresholds from user settings (mock Prisma query).
   
   - **Address Validation**:
     - `shouldFlagFirstTimeOrBlacklistedAddress`: New recipient address or PhishTank-listed domain; integrates mock external API call returning blacklist.
     - `shouldAllowWhitelistedAddresses`: Repeated DeFi protocol (e.g., Serum DEX) address skips flag; uses transaction history mock from DB.
     - PDA-Specific: Flags non-standard PDAs in unusual contexts (e.g., seed mismatch).
   
   - **Instruction and Behavior Analysis**:
     - `shouldFlagUnusualInstructions`: Detects non-SPL anomalies like custom program calls without preview; decodes via `@solana/web3.js` mock.
     - `shouldDetectBehaviorDeviations`: Simulates user pattern (e.g., avg 2 txns/day) vs. spike; uses simple ML-like heuristic (e.g., z-score >2).
     - `shouldBlockPhishingAttempts`: Validates URL in dApp redirects; mocks threat DB query for known scams.
   
   - **Overall Decision Engine**:
     - `shouldBlockHighRiskTransaction`: Combines flags (amount + blacklisted); asserts auto-block and user notification via Zustand store.
     - `shouldWarnMediumRisk`: Single flag (e.g., first-time addr); allows proceed with simulation preview.
   
   **Mocks**: `@solana/web3.js` Connection/simulateTransaction; external APIs via `nock` for PhishTank-like responses.
   **Coverage Goal**: 92% – Emphasize false negative prevention; include 20+ edge cases for Solana txn variants (e.g., vote txns, stake delegations).

### 3. Transaction Handling and Simulation (`src/transactions/`)
   Covers Solana RPC integration, SPL/NFT/DeFi support, decoding, and previews. Complements backend services without testing full API endpoints.

   **Key Test Suites**:
   - **Transaction Building**:
     - `shouldBuildSPLTokenTransferTransaction`: Inputs: Sender keypair mock, recipient, amount; asserts valid VersionedTransaction with SPL instructions.
     - `shouldIncludeNFTMetadataFetch`: For NFT transfers; mocks Helius API for metadata, verifies attachment in preview.
   
   - **Simulation and Preview**:
     - `shouldSimulateTransactionSuccessfully`: Mocks RPC `simulateTransaction`; asserts parsed logs show no errors for DeFi swap (e.g., Jupiter aggregator mock).
     - `shouldDecodeCustomInstructions`: Handles program-specific data (e.g., Raydium AMM); flags undecodable as risky.
     - Failure: Reverts on insufficient funds simulation; ties to Safe Mode for pre-sign warning.
   
   - **Signing and Broadcast**:
     - `shouldSignWithBiometricKey`: Post-auth; uses derived key from WebAuthn for ed25519 signature mock.
     - `shouldBroadcastToSolanaRPC`: Mocks `sendTransaction`; verifies commitment level ("confirmed").
   
   **Mocks**: Solana keypair from `bs58` encoding; RPC endpoints via `msw` for browser extension context.
   **Coverage Goal**: 88% – Focus on DeFi/NFT paths; test optional hardware signing flows.

### 4. Phishing Prevention Utilities (`src/security/phishing/`)
   Standalone checks for URL validation, domain blacklists, and threat integration.

   **Key Test Suites**:
   - `shouldValidateURLDomain`: Flags non-HTTPS or suspicious TLD (e.g., .xyz phishing clones); uses `url` module parse.
   - `shouldQueryExternalThreatDB`: Mock API response for known Solana dApp scams; caches results in Prisma (no DB tests here – see integration tests).
   - `shouldPreviewFullTransaction`: Renders simulation in user-readable format (e.g., "Transfer 5 SOL to unknown addr"); asserts warnings for hidden fees.
   
   **Mocks**: Axios for API calls; custom blacklist array for offline testing.
   **Coverage Goal**: 90% – Vital for user protection; include regex-based domain fuzzing.

### 5. State Management and UI Components (`src/store/` and `src/components/`)
   Zustand/Redux for wallet state; RTL for rendering.

   **Key Test Suites**:
   - **Zustand Store**:
     - `shouldUpdateWalletBalanceOnTransaction`: Mock Solana query; asserts state change and Safe Mode trigger.
     - `shouldPersistBiometricSession`: Encrypted storage; tests load on app init.
   
   - **Components** (e.g., TransactionPreview, SafeModeToggle):
     - `rendersTransactionPreviewWithWarnings`: RTL fireEvent on mock txn; asserts visible flags for risky elements.
     - `togglesSafeModeWithoutStateLeak`: User interaction; verifies no prop drilling issues in Next.js App Router.
     - Accessibility: `shouldAnnounceWarningsToScreenReaders` using `@testing-library/jest-dom`.
   
   **Mocks**: `@solana/wallet-adapter-react` for connection state; Tailwind classes via CSS-in-JS snapshot.
   **Coverage Goal**: 85% – Prioritize interactive security UIs.

### 6. Database Utilities (`src/db/utils/`)
   Prisma client wrappers for sessions, history, threats (references `db/schema.md` structures like `UserSession`, `TransactionLog`).

   **Key Test Suites**:
   - `shouldLogFlaggedTransaction`: Inserts with flags; mocks Prisma `create` without real DB.
   - `shouldQueryUserBehaviorHistory`: Aggregates txns for deviation calc; tests GROUP BY on timestamps.
   - `shouldHandleMigrationConflicts`: Post-`db/migrations.md` compatibility; verifies schema version checks.
   
   **Mocks**: `@prisma/client` extend with in-memory store (e.g., `prisma-mock`).
   **Coverage Goal**: 80% – Unit-level only; full DB tests in integration suite.

## Additional Considerations

- **Security Testing**: All tests scan for common vulns (e.g., no direct key exposure in mocks). Use `eslint-plugin-security` in test linting.
- **Performance**: Limit mocks to <100ms per test; benchmark flagging logic for 1k txns.
- **CI/CD Integration**: Tests run in Docker containers matching AWS Fargate hosting; fail builds on <80% coverage.
- **Extensibility**: Structure allows adding desktop app tests later (e.g., Electron mocks for native biometrics).
- **Unique Project ID**: Tests tagged with `#1763624940002` for traceability in reports.

This structure ensures comprehensive, implementable testing that coordinates with FrontendDev (UI/state) and BackendDev (services/RPC). Review with devs for refinements before implementation.