# Next.js App Router Structure for Secure Solana Wallet

This document outlines the App Router structure for the frontend web application of the Secure Solana Wallet project. Built with Next.js 14+ using the App Router paradigm, this structure leverages file-based routing to organize pages, layouts, and components specific to a Solana blockchain wallet with biometric authentication and advanced Safe Mode features. The setup integrates TypeScript for type safety, TailwindCSS for responsive styling, and Zustand for lightweight state management (e.g., wallet state, user biometrics, and transaction flags).

The structure is designed for a secure, user-centric web app targeting Solana users, including beginners and DeFi traders. It supports cross-platform compatibility (desktop/mobile browsers) and prepares for optional browser extension integration via shared components. Key considerations include:
- **Security Focus**: Routes for biometric login (WebAuthn API) and Safe Mode transaction previews to prevent phishing and risky actions.
- **Solana Integration**: Pages for wallet operations like SPL token management, NFT viewing, and DeFi protocol interactions, using Solana RPC endpoints.
- **Unique Identifiers**: All routes and components incorporate project-specific hooks (e.g., `useSafeModeGuard` for transaction blocking based on amount thresholds, address blacklists, and behavioral heuristics).
- **Production Readiness**: Server-side rendering (SSR) for sensitive data (e.g., transaction simulations), dynamic imports for heavy Solana libraries (e.g., `@solana/web3.js`), and error boundaries for wallet recovery.

This structure is unique to the frontend web app and complements backend APIs (e.g., for phishing database checks) without duplicating extension-specific manifests or desktop Electron configs.

## Directory Structure

The root of the frontend (`app/` directory) follows Next.js App Router conventions, with folders acting as route segments. Here's the tailored structure for the Secure Solana Wallet:

```
app/
├── layout.tsx                  # Root layout: Global providers (Zustand, Theme, Biometric Auth)
├── page.tsx                    # Landing page: Intro to wallet features, biometric setup prompt
├── globals.css                 # TailwindCSS base styles with Solana-themed utilities (e.g., gradient wallets)
├── favicon.ico                 # Project icon: Secure lock with Solana logo
├── loading.tsx                 # Global loading spinner (e.g., animated Solana particle effect)
├── error.tsx                   # Global error boundary (handles wallet connection failures)
├── not-found.tsx               # 404 page: Friendly redirect to dashboard for invalid wallet states
├── api/                        # API routes (serverless functions for proxying Solana RPC and threat checks)
│   ├── phishing-check/
│   │   └── route.ts            # POST: Validate URLs/domains against PhishTank-like feeds (unique to Safe Mode)
│   ├── transaction-simulate/
│   │   └── route.ts            # POST: Simulate Solana transactions with risk flagging (integrates behavioral analytics)
│   └── biometric-init/
│       └── route.ts            # POST: Initialize WebAuthn credentials server-side (for cross-origin security)
├── (auth)/                     # Parallel route group for authentication flows (non-public)
│   ├── layout.tsx              # Auth-specific layout: Minimal UI with biometric prompts
│   ├── login/
│   │   ├── page.tsx            # Biometric login page: Supports Fingerprint, FaceID, WebAuthn (TouchID/Windows Hello)
│   │   └── loading.tsx         # Biometric scan animation
│   └── register/
│       └── page.tsx            # Onboarding: Wallet creation with biometric enrollment and Safe Mode opt-in
├── dashboard/                  # Main protected route: Requires biometric auth guard
│   ├── layout.tsx              # Dashboard layout: Sidebar for navigation (Wallet, Transactions, Settings)
│   ├── page.tsx                # Overview: Balance display, recent SPL tokens/NFTs, Safe Mode status toggle
│   ├── wallet/
│   │   ├── page.tsx            # Wallet management: Send/receive SOL/SPL tokens, PDA support
│   │   ├── [token]/            # Dynamic route: Token details (e.g., /dashboard/wallet/USDC for SPL token view)
│   │   │   └── page.tsx
│   │   └── hardware/           # Sub-route: Ledger/YubiKey integration via WebUSB/WebHID
│   │       └── page.tsx
│   ├── transactions/
│   │   ├── page.tsx            # Transaction history: Decoded logs, filters for risky flags
│   │   ├── sign/
│   │   │   ├── page.tsx        # Transaction signing: Full simulation preview with Safe Mode warnings (blocks suspicious txns)
│   │   │   └── [txId]/         # Dynamic: Preview specific txn (e.g., DeFi swap with anomaly detection)
│   │   │       └── page.tsx
│   │   └── safe-mode/
│   │       ├── page.tsx        # Safe Mode config: Set thresholds (e.g., >$1000 flags), blacklist addresses, behavior baselines
│   │       └── analytics/      # Sub-route: User behavior insights (e.g., deviation alerts)
│   │           └── page.tsx
│   └── assets/
│       ├── nfts/
│       │   └── page.tsx        # NFT gallery: Metadata fetching from Solana, phishing-safe image loading
│       └── defi/
│           └── page.tsx        # DeFi integrations: Connect to protocols (e.g., Jupiter swaps) with risk previews
├── settings/
│   ├── layout.tsx              # Settings layout: Secure backdrop for changes
│   ├── page.tsx                # General settings: Theme, notifications
│   ├── security/
│   │   ├── page.tsx            # Security: Biometric re-enrollment, hardware wallet pairing, threat database subscriptions
│   │   └── safe-mode/          # Nested: Advanced Safe Mode rules (e.g., instruction anomaly detection)
│   │       └── page.tsx
│   └── export/
│       └── page.tsx            # Wallet export: Encrypted backup with biometric confirmation
├── components/                 # Client-side components (outside app/ for reusability)
│   ├── ui/                     # Reusable UI: Buttons, Modals (Tailwind-styled for Solana aesthetics)
│   │   ├── SafeTransactionModal.tsx  # Unique: Warns on risky signs (e.g., "This txn deviates from your norm")
│   │   └── BiometricPrompt.tsx # WebAuthn wrapper: Handles FaceID fallback on web
│   ├── wallet/                 # Wallet-specific: Solana connection hooks
│   │   ├── WalletProvider.tsx  # Zustand store: Manages keypairs, encrypted storage
│   │   └── TransactionDecoder.tsx # Decodes Solana instructions for Safe Mode flags
│   └── safe-mode/              # Safe Mode components
│       ├── RiskFlagger.tsx     # Heuristics: Flags large amounts, blacklisted addresses, unusual behaviors
│       └── PhishingValidator.tsx # URL checks + external API integration (e.g., real-time threat feeds)
├── lib/                        # Utilities and hooks
│   ├── solana.ts               # Solana web3.js wrappers: RPC calls, simulation with unique error handling for Safe Mode
│   ├── webauthn.ts             # Biometric utils: Cross-platform WebAuthn (fingerprint/FaceID emulation on web)
│   ├── store.ts                # Zustand setup: Slices for auth, wallet, safeMode (e.g., { flags: { amountThreshold: 1000 } })
│   └── utils.ts                # Helpers: Transaction risk scoring, behavioral deviation calc (e.g., based on txn frequency)
├── types/                      # TypeScript definitions
│   ├── index.ts                # Core types: WalletState, SafeModeConfig, TransactionRisk (unique to project)
│   └── solana.ts               # Solana-specific: Extended PublicKey with risk metadata
└── styles/                     # Tailwind config extensions
    └── globals.css             # Custom classes: .safe-warning { background: gradient Solana purple-red }
```

## Key Routing and Layout Explanations

### Root Layout (`app/layout.tsx`)
- Wraps all pages with essential providers:
  - `WalletProvider` (Zustand): Persists wallet state securely (localStorage with encryption).
  - `BiometricAuthProvider`: Initializes WebAuthn on mount, redirects unauth users to `(auth)/login`.
  - ThemeProvider (Tailwind): Dark mode default for crypto users.
- Includes metadata: `<title>Secure Solana Wallet</title>` with OpenGraph for sharing safe txn previews.
- Unique Hook: `useSafeModeGuard` – Middleware-like check on route changes; blocks access if Safe Mode is active and user behavior deviates (e.g., unusual login time).

Example snippet (TypeScript):
```tsx
import { WalletProvider } from '@/components/wallet/WalletProvider';
import { BiometricAuthProvider } from '@/lib/webauthn';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-solana-purple to-gray-900">
        <BiometricAuthProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </BiometricAuthProvider>
      </body>
    </html>
  );
}
```

### Authentication Group (`(auth)/`)
- Parallel routes ensure auth pages don't interfere with public paths.
- `/login`: Prompts device biometrics; on success, derives Solana keypair from WebAuthn credential ID (unique secure enclave emulation).
- Error Handling: Fallback to PIN if biometrics fail, with Safe Mode warning: "Unusual login attempt detected."

### Dashboard Routes (`/dashboard`)
- Protected by layout middleware: Biometric re-verification for sensitive actions (e.g., signing).
- `/dashboard/transactions/sign`: Core Safe Mode page – Simulates txn via API route, flags risks (e.g., first-time address + large amount > user baseline), shows modal: "This could be phishing – simulate shows 20% deviation."
- Dynamic Segments: `[token]` fetches SPL metadata; integrates NFT previews with phishing validation (e.g., blocks suspicious IPFS URLs).

### Settings and Security (`/settings`)
- `/settings/security/safe-mode`: Config form with sliders for thresholds (e.g., amount: $500–$10k, behavior: 7-day baseline via Zustand analytics).
- Hardware Integration: `/dashboard/wallet/hardware` uses WebUSB for Ledger; unique validator ensures txn signs only match biometric profile.

### API Routes (`/api/`)
- Server Actions for security: E.g., `/api/phishing-check` proxies external databases (PhishTank + Solana-specific feeds) without exposing client-side keys.
- Unique to Project: `/api/transaction-simulate` runs `connection.simulateTransaction` with added heuristics – returns `{ riskScore: number, flags: ['largeAmount', 'blacklistedAddress'] }`.

## State Management with Zustand
Centralized in `lib/store.ts` for efficiency:
- `authSlice`: `{ isAuthenticated: boolean, credentialId: string }` – Tied to biometrics.
- `walletSlice`: `{ publicKey: PublicKey, balance: number, tokens: SPLToken[] }` – Updates on Solana RPC polls.
- `safeModeSlice`: `{ enabled: boolean, config: { amountThreshold: number, blacklists: string[] }, alerts: RiskAlert[] }` – Triggers UI warnings; unique behavioral tracking via `localStorage` timestamps.

Example Store Usage in a Page:
```tsx
import { useSafeModeStore } from '@/lib/store';

export default function TransactionSignPage({ params }: { params: { txId: string } }) {
  const { flags, blockTransaction } = useSafeModeStore();
  const [risk, setRisk] = useState(0);

  useEffect(() => {
    // Simulate and flag
    fetch('/api/transaction-simulate', { method: 'POST', body: JSON.stringify({ txId: params.txId }) })
      .then(res => res.json())
      .then(data => {
        setRisk(data.riskScore);
        if (data.flags.length > 0) blockTransaction(data.flags);
      });
  }, [params.txId]);

  if (risk > 0.7) return <SafeTransactionModal flags={flags} />;

  return <TransactionPreview txId={params.txId} />;
}
```

## Styling and Responsiveness
- TailwindCSS Config: Extend with Solana colors (`--solana-purple: #9945FF`), responsive classes for mobile biometrics (e.g., `sm:full-screen` for FaceID prompts).
- Unique Components: All modals use `framer-motion` for smooth animations (e.g., risk warning slides in with pulse effect).

## Deployment and Optimization Notes
- Vercel Hosting: App Router enables automatic SSR for transaction previews; edge functions for low-latency phishing checks.
- Performance: Lazy-load Solana libs in components; unique caching for Safe Mode configs via `revalidatePath`.
- Testing: Integrate Cypress for e2e (e.g., simulate biometric flow, txn blocking on blacklisted address).
- Future-Proof: Structure allows easy extension to desktop app by exporting components for Electron.

This App Router setup ensures a seamless, secure UX for Solana wallet operations, directly addressing biometric login, Safe Mode protections, and ecosystem support without redundancy to other project files (e.g., no backend API specs here).

*Generated for Unique ID: 1763624900430_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__frontend_react_nextjs_md_cv9957*