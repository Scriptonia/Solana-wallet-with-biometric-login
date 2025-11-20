# Secure Solana Wallet with Biometric Login and Advanced Safe Mode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14.x-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-1.18.x-purple?logo=solana&logoColor=white)](https://solana.com/)

## Overview

The **Secure Solana Wallet with Biometric Login and Advanced Safe Mode** is a cutting-edge, user-centric cryptocurrency wallet built exclusively for the Solana blockchain. Designed to empower Solana users—from crypto newcomers to seasoned DeFi and NFT enthusiasts—this web application prioritizes security without sacrificing usability. At its core, it leverages device-native biometric authentication for effortless logins and introduces an intelligent **Safe Mode** that proactively safeguards against common threats like suspicious transactions, phishing scams, and risky signing actions.

> **🔒 Open Source**: This project is open source. All sensitive information (API keys, database credentials, secrets) has been removed. You must provide your own credentials to run the application. See [OPEN_SOURCE_SETUP.md](./OPEN_SOURCE_SETUP.md) for setup instructions.

Whether you're trading SPL tokens, managing NFTs, or interacting with DeFi protocols, this wallet ensures your assets remain protected through automated risk detection, transaction previews, and seamless integration with Solana's high-speed ecosystem. Deployed as a browser extension (compatible with Chrome, Firefox, and Edge) and a companion web app, it supports cross-platform access on desktop and mobile browsers, with provisions for future desktop app expansion via Electron.

This project addresses the growing need for secure, intuitive tools in the Solana space, where rapid transaction speeds can amplify risks from scams and errors. By combining biometric security, AI-driven flagging, and external threat intelligence, it reduces user exposure to phishing (e.g., fake dApps) and anomalous behaviors (e.g., unusual token transfers), fostering confidence in blockchain interactions.

**Target Audience:**
- Beginner Solana users seeking a safe onboarding experience with built-in protections.
- Experienced traders handling high-volume DeFi and NFT activities who demand robust anti-phishing and risk mitigation.
- Security-focused individuals preferring biometric and hardware wallet integrations to minimize key management vulnerabilities.

**Unique Identifier:** 1763624900429_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode_README_md_mvtna

## Key Features

### Biometric Authentication
- **Seamless Login Options:** Supports fingerprint scanning (via WebAuthn on Android/Chrome), FaceID/Face Unlock (iOS/Safari), and cross-platform biometrics like TouchID (macOS) or Windows Hello (Windows Edge/Chrome).
- **Secure Key Derivation:** Biometric credentials derive wallet seeds stored in secure browser enclaves or encrypted local storage, ensuring no plain-text exposure. Fallback to mnemonic phrases for recovery.
- **Cross-Device Sync:** WebAuthn enables credential roaming across authenticated devices without manual seed import.

### Advanced Safe Mode
- **Automated Transaction Blocking:** Flags and halts suspicious activities based on customizable rules:
  - **Amount Thresholds:** Blocks transfers exceeding user-defined limits (e.g., >50 SOL) without explicit override.
  - **Address Validation:** Rejects first-time interactions with unknown or blacklisted addresses (sourced from community-curated lists like Solana's known scam feeds).
  - **Instruction Anomalies:** Detects unusual Solana program calls, such as hidden SPL token burns or unauthorized NFT metadata alterations.
  - **Behavioral Deviations:** Monitors user patterns (e.g., average transaction frequency/volume) via anonymized local analytics; alerts on deviations like sudden high-value outflows.
- **Phishing Prevention:** 
  - Real-time URL/domain validation against external databases (e.g., PhishTank, Solana-specific threat APIs).
  - Full transaction simulation using Solana's `simulateTransaction` RPC to preview outcomes before signing, highlighting hidden fees or asset drains.
  - Warns users via modal overlays for risky signatures, requiring biometric re-confirmation.
- **User Warnings and Overrides:** Non-blocking alerts for medium-risk actions (e.g., "This dApp domain matches a known phishing pattern—proceed with caution?"), with logging for post-incident review.

### Solana Ecosystem Support
- **Asset Management:** Full handling of SPL tokens (e.g., USDC, SRM), NFTs (via Metaplex standards), and DeFi interactions (e.g., Serum DEX swaps, Raydium liquidity pools).
- **Transaction Tools:** Advanced decoding of Solana instructions for readability (e.g., "Transfer 10 SOL to PDA-derived escrow"), with customizable filters for portfolio views.
- **Hardware Integration:** Optional compatibility with Ledger (via WebUSB) and YubiKey (via WebHID) for cold storage signing, bridging hot wallet convenience with offline security.

### Platform Deployment
- **Primary Interfaces:** Browser extension for in-dApp wallet access (e.g., injecting into Phantom-compatible sites) and a standalone web app for portfolio management.
- **Mobile Responsiveness:** Optimized for touch interactions on browser-based mobile access, with biometric prompts tailored to device capabilities.
- **Future-Proofing:** Modular design allows extension to a native desktop app without core refactoring.

## Technical Architecture

This project follows a modern, secure web application stack optimized for Solana's performance demands:

### Frontend
- **Framework:** Next.js (App Router) for server-side rendering and API routes, ensuring fast load times for transaction previews.
- **Styling & State:** TailwindCSS for responsive, themeable UI (dark/light modes); Zustand for lightweight, secure state management of wallet sessions (avoiding heavy Redux for biometric-derived keys).
- **Language:** TypeScript for type-safe Solana interactions (e.g., `@solana/web3.js` v1.87+).
- **Security Focus:** All private keys encrypted via Web Crypto API; biometric flows use WebAuthn v3 for FIDO2 compliance.

### Backend
- **Server:** Node.js with Express for lightweight RPC proxying to Solana clusters (mainnet/devnet); optional NestJS modules for scalable threat-checking services.
- **Database:** PostgreSQL with Prisma ORM to store user preferences (e.g., Safe Mode thresholds), anonymized behavior logs, and cached threat data—never wallet seeds.
- **Integrations:**
  - Solana RPC: Direct connections for balance queries, transaction simulation, and signing.
  - External APIs: PhishTank for domain checks; Solana Labs feeds for blacklisted addresses; optional Chainalysis for advanced risk scoring.
  - Hardware Support: WebUSB/WebHID polyfills for Ledger/YubiKey.

### Infrastructure
- **Containerization:** Docker for consistent builds; multi-stage Dockerfiles to separate frontend builds from backend services.
- **Hosting:** Vercel for frontend deployment (edge functions for low-latency simulations); AWS Fargate for backend (scalable RPC handling); optional AWS Lambda for event-driven threat alerts.
- **Security Best Practices:** Rate limiting on APIs, CORS policies for extension-web app communication, and audit logs for all Safe Mode interventions.

### Data Flow Example
1. User initiates login via biometric prompt → WebAuthn derives seed → Wallet connects to Solana RPC.
2. For a transaction (e.g., NFT mint): Extension simulates via backend proxy → Checks flags (amount > threshold? Domain safe?) → If risky, blocks and notifies.
3. Signing requires re-authentication; hardware fallback routes through WebUSB.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Yarn or npm
- PostgreSQL (v14+) for local dev
- Solana CLI for testing (optional)
- Browser with WebAuthn support (Chrome 67+, Firefox 60+, Safari 13+)
- Docker for containerized setup

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/your-org/secure-solana-wallet-with-biometric-login-and-advanced-safe-mode.git
   cd secure-solana-wallet-with-biometric-login-and-advanced-safe-mode
   ```
2. Install dependencies:
   - Frontend: `cd frontend && yarn install`
   - Backend: `cd backend && yarn install`
   - Database: Set up Prisma with `npx prisma migrate dev` (configure `.env` with DB_URL).
3. Build and run:
   - Backend: `yarn dev` (starts on port 3001)
   - Frontend: `yarn dev` (starts on port 3000; load extension via `chrome://extensions/` for dev build)
4. Environment Setup:
   - Copy `.env.example` to `.env` and add Solana RPC endpoint (e.g., `https://api.mainnet-beta.solana.com`).
   - For biometrics testing, enable device sensors in browser settings.
5. Docker Setup (Production):
   ```
   docker-compose up --build
   ```
   This spins up frontend, backend, and DB services.

### Browser Extension Build
- Use `yarn build:extension` to generate CRX/ZIP files.
- Load unpacked in Chrome: Navigate to `frontend/dist/extension` in developer mode.

## Usage

1. **Onboarding:** Access the web app or extension popup → Authenticate via biometric (e.g., "Scan fingerprint to create wallet") → Generate/import mnemonic securely.
2. **Daily Operations:**
   - View portfolio: SPL balances, NFT gallery with Metaplex metadata.
   - Initiate transaction (e.g., swap via Jupiter API): Safe Mode auto-flags if amount >5 SOL or to new address → Preview simulation shows "Potential 2% fee drain—review instructions."
   - Phishing Check: Connecting to a dApp triggers domain validation; blocked if matches threat DB.
3. **Safe Mode Customization:** In settings, adjust thresholds (e.g., "Block first-time addresses >1 SOL") or toggle hardware signing.
4. **Advanced:** Decode a complex tx: Extension highlights "SPL Transfer: 100 USDC to blacklisted PDA—blocked."

For API usage (backend), endpoints include `/simulate` (POST: { tx: base64 }) and `/threat-check` (GET: { url: string }).

## Contributing

We welcome contributions to enhance security and usability! Focus areas:
- New flagging heuristics (e.g., ML-based behavior models).
- Expanded hardware support (e.g., Trezor).
- UI improvements for mobile biometrics.

1. Fork the repo and create a feature branch (`git checkout -b feature/amazing-feature`).
2. Commit changes (`git commit -m 'Add biometric fallback for legacy devices'`).
3. Push to branch (`git push origin feature/amazing-feature`).
4. Open a Pull Request; ensure tests pass (add via Jest for frontend, Supertest for backend).

**Guidelines:**
- Adhere to TypeScript strict mode.
- Run `yarn lint` and `yarn test` before PRs.
- Security: All PRs scanned for vulnerabilities (e.g., via npm audit).
- Discussions: Use GitHub Issues for bugs (e.g., "Safe Mode false positive on Raydium") or features.

## Security Considerations

- **Audits:** This project incorporates best practices but recommends third-party audits (e.g., by Trail of Bits) before mainnet use.
- **Key Management:** Never store seeds server-side; rely on client-side encryption.
- **Incident Response:** Safe Mode logs exportable for forensics; report issues to security@secure-solana-wallet.org.
- **Compliance:** WebAuthn ensures GDPR-friendly biometrics; threat data anonymized.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap

- **v1.0:** Core biometric + Safe Mode launch.
- **v1.1:** Desktop app (Electron) and mobile PWA.
- **v2.0:** AI-enhanced flagging with on-chain behavior learning.

For support, join our Discord or file an issue. Built with Solana's speed in mind—secure your wallet today! 🚀