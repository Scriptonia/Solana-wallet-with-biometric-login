# Secure Solana Wallet Frontend Component Library

## Overview

This document serves as the comprehensive specification for the frontend component library of the *Secure Solana Wallet with Biometric Login and Advanced Safe Mode* project. Built using Next.js (App Router) for routing and server-side rendering, TailwindCSS for styling, TypeScript for type safety, and Zustand for lightweight state management, this library focuses on creating secure, intuitive, and performant UI elements tailored to Solana blockchain interactions.

The components are designed to support key project features:
- **Biometric Authentication**: Seamless integration with WebAuthn for device-native biometrics (e.g., Fingerprint, FaceID, TouchID, Windows Hello).
- **Safe Mode Protections**: Visual indicators for transaction risks, phishing alerts, and automated blocking based on heuristics (e.g., large amounts > 10 SOL, first-time/blacklisted addresses, unusual instructions, behavioral deviations).
- **Solana Ecosystem Support**: Displays and interactions for SPL tokens, NFTs, DeFi protocols, with transaction decoding and simulation previews.
- **Hardware Integration**: Optional UI hooks for Ledger/YubiKey via WebUSB/WebHID.
- **Phishing Prevention**: Real-time URL/domain validation and threat database checks (e.g., PhishTank integration).

All components emphasize accessibility (WCAG 2.1 AA compliance), responsive design for web browsers (desktop/mobile), and security best practices (e.g., no sensitive data in props, encrypted state via Zustand middleware). Components are modular, reusable, and tested with Jest + React Testing Library.

Unique to this project: Components incorporate Solana-specific types from `@solana/web3.js` and `@solana/spl-token`, with custom hooks for RPC interactions (e.g., `useConnection` from `@solana/wallet-adapter-react`). State management uses a centralized store for user behavior analytics to flag deviations in Safe Mode.

For implementation, components leverage:
- **Styling**: TailwindCSS classes with custom themes (e.g., `bg-gradient-solana-purple` for branding).
- **Icons**: Heroicons or custom SVGs for Solana-themed elements (e.g., wallet icons, warning badges).
- **Animations**: Framer Motion for smooth transitions in transaction previews and biometric feedback.

## Core Authentication Components

### BiometricLoginButton
A secure button component that initiates WebAuthn-based biometric authentication. It handles credential creation/assertion, falling back to mnemonic recovery if biometrics fail. Displays loading states and error modals for unsupported devices.

**Props:**
- `onSuccess: (publicKey: PublicKey) => void` - Callback on successful auth, receiving Solana public key.
- `onError: (error: AuthError) => void` - Error handler (e.g., "Biometrics unavailable").
- `variant: 'primary' | 'secondary'` - Styling variant (default: 'primary' with Solana purple gradient).
- `disabled: boolean` - Disables during ongoing auth.
- `isCreating: boolean` - If true, creates new credential; else, asserts existing.

**Usage Example:**
```tsx
import { BiometricLoginButton } from '@/components/auth/BiometricLoginButton';
import { PublicKey } from '@solana/web3.js';

const LoginPage = () => (
  <BiometricLoginButton
    onSuccess={(publicKey: PublicKey) => {
      // Store in Zustand: useWalletStore.setState({ publicKey });
      router.push('/dashboard');
    }}
    onError={(error) => toast.error(`Auth failed: ${error.message}`)}
    variant="primary"
  />
);
```

**Safe Mode Integration:** If Safe Mode is active, adds a subtle warning if device biometrics detect unusual login patterns (e.g., new location via geolocation API).

### MnemonicFallbackModal
Modal for manual seed phrase entry as a biometric fallback. Includes secure input masking and validation against Solana keypair derivation. Never stores phrases in state—uses ephemeral derivation.

**Props:**
- `isOpen: boolean` - Controls visibility.
- `onClose: () => void` - Closes modal.
- `onConfirm: (keypair: Keypair) => void` - Derives and passes Solana keypair.
- `title: string` - Custom title (default: "Enter Recovery Phrase").

**Key Features:** 
- 12/24-word validation using `bip39`.
- Copy-paste support with paste event throttling to prevent phishing clipboard attacks.
- Biometric re-prompt after entry for hybrid auth.

## Wallet Management Components

### WalletDashboard
Main dashboard component displaying balance, assets (SPL tokens, NFTs), and recent transactions. Fetches data via Solana RPC with caching in Zustand.

**Props:**
- `publicKey: PublicKey` - User's wallet address.
- `assets: Asset[]` - Array of { type: 'token' | 'nft', metadata: TokenMetadata, balance: number }.
- `transactions: ParsedTransaction[]` - Decoded recent txns from `getSignaturesForAddress`.
- `onSend: () => void` - Triggers send flow.
- `safeModeActive: boolean` - Toggles risk indicators (e.g., red badges on high-value assets).

**Usage Example:**
```tsx
import { WalletDashboard } from '@/components/wallet/WalletDashboard';
import { useWalletStore } from '@/stores/wallet';

const DashboardPage = () => {
  const { publicKey, assets, transactions, safeModeActive } = useWalletStore();
  return (
    <WalletDashboard
      publicKey={publicKey!}
      assets={assets}
      transactions={transactions}
      onSend={() => setShowSendModal(true)}
      safeModeActive={safeModeActive}
    />
  );
};
```

**Unique Aspects:** NFT grid uses lazy-loading with Solana metadata fetching (via `getAsset` from `@metaplex-foundation/mpl-token-metadata`). DeFi positions show APY previews from integrated protocols (e.g., Jupiter API hooks).

### AssetCard
Reusable card for individual assets (token or NFT). Includes balance, value (fetched from Pyth oracles for SOL/USD), and transfer buttons. In Safe Mode, flags if asset is from blacklisted source.

**Props:**
- `asset: Asset` - Full asset object.
- `onTransfer: (assetId: string) => void` - Opens transfer modal.
- `isFlagged: boolean` - Highlights with warning icon if risky (e.g., large unexplained deposit).

**Styling:** Tailwind grid-responsive, with hover effects for NFT images (IPFS-resolved).

## Transaction Components

### TransactionPreview
Interactive preview for transaction signing, using Solana's `simulateTransaction` RPC. Decodes instructions (e.g., SPL transfers, program calls) and shows step-by-step breakdown. Integrates Safe Mode for risk warnings.

**Props:**
- `transaction: VersionedTransaction` - Raw txn from `@solana/web3.js`.
- `simulationResult: RpcSimulateTransactionResult` - Pre-fetched simulation.
- `onSign: (signedTxn: VersionedTransaction) => Promise<void>` - Signs and broadcasts.
- `riskFlags: RiskFlag[]` - Array of { type: 'amount' | 'address' | 'behavior', severity: 'low' | 'high', details: string }.
- `phishingCheck: PhishingStatus` - { isSafe: boolean, threats: string[] } from external DBs.

**Usage Example:**
```tsx
import { TransactionPreview } from '@/components/transaction/TransactionPreview';
import { useConnection } from '@solana/wallet-adapter-react';

const SendModal = ({ recipient, amount }: { recipient: string; amount: number }) => {
  const connection = useConnection();
  const [txn, setTxn] = useState<VersionedTransaction | null>(null);
  const [simResult, setSimResult] = useState<RpcSimulateTransactionResult | null>(null);
  const [flags, setFlags] = useState<RiskFlag[]>([]); // From heuristic analyzer

  useEffect(() => {
    // Build and simulate txn
    const partialTxn = buildTransferTxn(recipient, amount);
    connection.simulateTransaction(partialTxn).then(setSimResult);
    analyzeRisks(partialTxn).then(setFlags);
    setTxn(partialTxn);
  }, [recipient, amount]);

  if (!txn) return <Spinner />;

  return (
    <TransactionPreview
      transaction={txn}
      simulationResult={simResult!}
      riskFlags={flags}
      phishingCheck={validateDomain(recipient)} // e.g., PhishTank API
      onSign={async (signed) => {
        const sig = await connection.sendTransaction(signed);
        toast.success(`Txn signed: ${sig}`);
      }}
    />
  );
};
```

**Safe Mode Logic:** If `riskFlags` includes high-severity items (e.g., first-time address), shows a non-dismissible warning modal. Blocks signing if `phishingCheck.isSafe === false`. Behavioral deviation check compares to user history in Zustand store.

### RiskWarningBanner
Persistent banner for Safe Mode alerts during transactions. Customizable for phishing (e.g., "Suspicious URL detected"), amount thresholds, or instruction anomalies.

**Props:**
- `warnings: Warning[]` - { message: string, type: 'phishing' | 'amount' | 'behavior', action: 'block' | 'warn' }.
- `onAcknowledge: () => void` - User confirms to proceed (if not blocked).
- `isBlocked: boolean` - Hides sign button if true.

**Visuals:** Animated slide-in with Tailwind transitions; red for blocks, yellow for warnings. Integrates URL validation: scans dApps for blacklisted domains.

## Safe Mode Components

### SafeModeToggle
Switch component to enable/disable Safe Mode globally. Persists in localStorage (encrypted). When active, enables all heuristics and external checks.

**Props:**
- `isActive: boolean` - Current state from Zustand.
- `onToggle: (active: boolean) => void` - Updates store and applies rules.
- `stats: SafeModeStats` - { blocks: number, warnings: number } for tooltip info.

**Integration:** On toggle, re-evaluates pending txns. For hardware wallets, prompts YubiKey confirmation for mode changes.

### HeuristicAnalyzer (Utility Component)
Not UI-facing but exposed as a hook-wrapped component for embedding in forms. Analyzes txns in real-time.

**Props:**
- `transaction: Partial<VersionedTransaction>` - Analyzes on mount.
- `userHistory: TransactionHistory` - From store for behavior checks.
- `onFlag: (flags: RiskFlag[]) => void` - Returns flags.

**Heuristics (Project-Specific):**
- Amount: >10 SOL or >50% of balance.
- Address: First-time (no prior txns) or blacklisted (via on-chain oracle).
- Instructions: Unusual (e.g., non-standard SPL calls) via decoding.
- Behavior: Deviation (e.g., sudden high-volume sends) using simple ML-lite (z-score on txn amounts).

## Utility Components

### SolanaAddressInput
Secure input for Solana addresses with validation (base58, PDA support) and QR scanner hook (via `react-qr-reader`).

**Props:**
- `value: string` - Address string.
- `onChange: (address: string, isValid: boolean) => void`.
- `enableScanner: boolean` - Adds QR button for mobile.

**Phishing Tie-In:** Auto-checks against threat DBs on blur.

### HardwareWalletConnector
Button/modal for Ledger/YubiKey integration. Uses WebUSB for Ledger transport.

**Props:**
- `onConnect: (transport: Transport) => void` - Callback with Solana app interface.
- `supportedDevices: ('ledger' | 'yubikey')[]` - Filters options.

**Fallback:** If unavailable, routes to software wallet.

## Development Guidelines
- **Testing:** Each component has unit tests covering props, edge cases (e.g., failed biometrics), and Safe Mode interactions.
- **Performance:** Memoize with `React.memo` for txn previews; use `Suspense` for async fetches.
- **Accessibility:** ARIA labels for biometrics (e.g., "Scan fingerprint"), keyboard-navigable modals.
- **Customization:** Extend via theme provider for Tailwind (e.g., dark mode for secure viewing).
- **Versioning:** Components tagged with v1.0; update for future desktop app (Electron compatibility).

This library ensures the wallet's UI is both user-friendly for beginners and robust for DeFi traders, aligning with the project's security-first ethos. For API contracts, coordinate with BackendDev on endpoints like `/api/phishing-check` for threat DBs. Unique ID: 1763624900452_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__frontend_components_md_7am95r