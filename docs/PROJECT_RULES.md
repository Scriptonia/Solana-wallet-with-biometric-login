# Secure Solana Wallet with Biometric Login and Advanced Safe Mode

## Project Rules and Guidelines

### 1. Introduction
This document outlines the mandatory rules and guidelines for developing, contributing to, and maintaining the **Secure Solana Wallet with Biometric Login and Advanced Safe Mode** project. As a web application focused on enhancing user security in the Solana ecosystem, all work must prioritize security, usability, and compliance with blockchain best practices. These rules ensure the project's integrity, especially given its handling of sensitive operations like biometric authentication, transaction signing, and Safe Mode protections against phishing and suspicious activities.

The project targets Solana users (beginners, DeFi/NFT traders, and security-conscious individuals) via a primary web browser extension and web app deployment, with optional future desktop support. All rules are derived from the core idea of providing biometric login (fingerprint, FaceID/Face Unlock, WebAuthn for TouchID/Windows Hello) and an advanced Safe Mode that flags and blocks risks based on transaction amounts, address history, instructions, user behavior, URL validation, simulation previews, and external threat database checks. Support for SPL tokens, NFTs, DeFi protocols, transaction decoding, and hardware wallets (Ledger/YubiKey) is integral.

Violation of these rules may result in code rejection, feature delays, or project-wide reviews. These guidelines complement the project README (for overview), database schema (for data structures), and migrations (for DB evolution) but focus exclusively on operational, security, and collaborative standards.

### 2. Security Rules
Security is paramount for a Solana wallet handling private keys, biometrics, and real-time transaction safeguards. All code must adhere to the following:

- **Key Management**: Never store private keys in plain text or unencrypted local storage. Use secure enclaves (e.g., Web Crypto API) or encrypted IndexedDB for browser storage. For hardware wallet integration (Ledger/YubiKey via WebUSB/WebHID), implement challenge-response verification without exposing keys.
  
- **Biometric Authentication**: WebAuthn implementation must enforce platform-specific biometrics (e.g., fingerprint on Android, FaceID on iOS, TouchID/Windows Hello via cross-platform APIs). Require re-authentication for high-risk actions like signing transactions over a configurable threshold (default: 1 SOL equivalent). Prohibit fallback to passwords; biometrics only.

- **Safe Mode Enforcement**: 
  - Automatically enable Safe Mode on first login; users cannot disable it without biometric confirmation.
  - Flagging logic must use heuristics: Block transactions if amount > user-defined threshold (default: 5 SOL), recipient is first-time or blacklisted (via integrated threat feeds like PhishTank or Solana-specific databases), instructions include unusual Solana program calls (e.g., non-standard SPL token transfers), or behavior deviates (e.g., >3x average transaction frequency via anonymized user analytics stored in PostgreSQL).
  - Phishing prevention: Validate all dApp URLs against external databases before iframe embedding or link navigation. Mandate full transaction simulation using Solana's `simulateTransaction` RPC, displaying decoded previews (SPL tokens, NFTs, DeFi interactions) with risk scores (low/medium/high) before signing.

- **Input Validation and Sanitization**: All user inputs (e.g., addresses, amounts) must be validated against Solana standards (e.g., base-58 encoding for pubkeys). Sanitize all external data from RPC calls or threat APIs to prevent injection attacks.

- **Audit Requirements**: Every feature touching transactions or biometrics requires a third-party security audit before merge. Use tools like Solana's Anchor framework for program verification if custom PDAs are involved.

- **Incident Reporting**: Any potential vulnerability (e.g., biometric bypass or false Safe Mode negatives) must be reported immediately via a private GitHub issue flagged as "security" and triaged within 24 hours.

### 3. Development Guidelines
Development must align with the selected tech stack (Next.js App Router for frontend, TailwindCSS/TypeScript/Zustand for state, Node.js/Express for backend, PostgreSQL/Prisma for DB) to ensure scalability and maintainability.

- **Code Style and Standards**:
  - Use TypeScript exclusively for type safety, especially in Solana integrations (e.g., `@solana/web3.js` for RPC/transaction handling).
  - Follow ESLint/Prettier rules: Enforce 2-space indentation, single quotes, and semi-colons. No inline styles; use TailwindCSS classes only.
  - Modularize code: Separate concerns into directories like `/src/features/biometrics`, `/src/features/safe-mode`, `/src/integrations/solana`, and `/src/integrations/hardware-wallets`.
  - For browser extension: Use Manifest V3; inject content scripts securely without exposing wallet state to untrusted pages.

- **Feature-Specific Rules**:
  - **Biometric Login**: Implement as a reusable hook in Zustand/Redux Toolkit. Handle cross-browser compatibility (Chrome, Firefox, Safari) with fallbacks only for WebAuthn support checks.
  - **Safe Mode**: Backend must expose APIs (e.g., `/api/risk-assess` POST) for flagging, integrating with external databases. Frontend must render simulation previews using a custom UI component showing decoded transaction details (e.g., "Transfer 10 USDC to blacklisted address – BLOCKED").
  - **Solana Ecosystem Support**: All transactions must decode SPL tokens/NFTs via `@solana/spl-token` and fetch metadata from Metaplex standards. DeFi protocol integrations (e.g., Jupiter swaps) require Safe Mode overrides only after user biometric approval.
  - **Hardware Wallet Compatibility**: Optional feature gated behind a settings toggle; use WebHID for YubiKey without requiring browser permissions beyond initial setup.

- **API Design**: Backend APIs must use RESTful endpoints with JWT-based auth (biometric-derived tokens). Rate-limit all Solana RPC calls to prevent abuse (e.g., 100/min per user). Document all endpoints in OpenAPI format within the codebase.

- **Version Control**: Use semantic versioning (SemVer). Feature branches must prefix with `feat/biometrics-` or `feat/safe-mode-`. Pull requests require at least two approvals, including one from a security reviewer.

### 4. Testing Rules
Comprehensive testing is non-negotiable to validate Safe Mode accuracy and biometric reliability.

- **Unit and Integration Tests**: Achieve 90% coverage using Jest/Vitest. Test biometric flows with mocks (e.g., simulate WebAuthn credential creation). For Safe Mode, unit-test flagging logic with edge cases (e.g., 4.9 SOL transfer to known address – ALLOW; 5.1 SOL to blacklisted – BLOCK).
  
- **E2E Testing**: Use Cypress/Playwright for browser extension and web app. Simulate phishing attempts (mock malicious URLs) and transaction signing with hardware wallet stubs.

- **Security Testing**: Run OWASP ZAP scans weekly. Perform manual audits for Solana-specific risks like replay attacks or instruction overflows.

- **Performance Rules**: Ensure transaction simulations complete in <2 seconds (leverage Solana devnet for testing). Biometric login must not exceed 1 second on supported devices.

### 5. Contribution and Collaboration Rules
This project welcomes contributions but enforces strict protocols to maintain focus on Solana security.

- **Contribution Process**: Fork the repo, create a feature branch, and submit PRs with clear descriptions linking to user stories (e.g., "As a user, I want biometric re-auth for large transfers"). No direct pushes to main.

- **Coordination with Teams**:
  - **FrontendDev**: All UI components (e.g., Safe Mode warning modals) must be responsive (Tailwind mobile-first) and accessible (WCAG 2.1 AA, including screen reader support for transaction previews).
  - **BackendDev**: Ensure APIs are stateless where possible (e.g., no session storage for biometrics). Use Prisma migrations for any DB changes related to user behavior analytics (anonymized only).
  - Review cycles: ProductManager approves requirements; devs implement; mutual code reviews.

- **Documentation**: Every PR must update relevant docs (e.g., add examples for new flagging rules). Use JSDoc for TypeScript functions.

- **Ethical Guidelines**: Do not contribute code that could enable scams (e.g., no optional Safe Mode bypasses). All contributors must sign a CLA acknowledging Solana ecosystem compliance.

### 6. Deployment and Operations Rules
Deployments must be secure and automated for the web app and browser extension.

- **CI/CD Pipeline**: Use GitHub Actions with Docker for builds. Deploy to Vercel for frontend and AWS Fargate for backend. Include security scans (e.g., Dependabot) in every pipeline run.

- **Environment Management**: Separate dev/staging/prod with Solana testnet for non-prod. Secrets (e.g., threat API keys) via AWS Secrets Manager.

- **Monitoring and Logging**: Integrate Sentry for error tracking and Prometheus for metrics (e.g., Safe Mode block rates). Log all blocked transactions anonymously for UX improvements, but never store PII.

- **Updates and Maintenance**: Browser extension updates must follow Chrome Web Store policies. Hotfix critical security issues (e.g., biometric vuln) within 48 hours.

### 7. Compliance and Legal Rules
- **Regulatory Compliance**: Adhere to GDPR/CCPA for biometric data (store hashes only, no raw biometrics). Disclose all third-party integrations (e.g., PhishTank) in privacy policy.
- **Intellectual Property**: All code is MIT-licensed; attribute Solana libraries properly. No use of proprietary biometric SDKs without approval.
- **Dispute Resolution**: Issues resolved via project maintainer (ProductManager); escalate to community Discord if needed.

### Appendix: Unique Project Identifiers
- Project UID: 1763624939992_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode
- File UID: 1763624939992_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__docs_PROJECT_RULES_md_oki5j
- Last Updated: [Insert Date] – Review annually or post-major release.

For questions, contact the ProductManager. These rules evolve with project needs but always prioritize user safety in the Solana ecosystem.