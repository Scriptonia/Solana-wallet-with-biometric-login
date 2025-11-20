# State Management in Secure Solana Wallet Frontend

## Overview

In the Secure Solana Wallet application, state management is crucial for handling complex interactions involving biometric authentication, Solana blockchain operations, Safe Mode protections, and phishing safeguards. Given the frontend stack of Next.js (App Router), TypeScript, and TailwindCSS, we leverage Zustand as the primary state management library due to its lightweight nature, simplicity, and excellent TypeScript support. This choice aligns with the high-complexity requirements of a crypto wallet, where we need reactive updates for wallet connections, transaction simulations, and real-time risk assessments without the boilerplate overhead of Redux Toolkit.

Zustand is preferred over Redux Toolkit here for its minimal API surface, which reduces bundle size in browser extensions and web apps—critical for performance in Solana's fast-paced DeFi and NFT environments. However, Redux Toolkit can be integrated modularly for larger feature slices if needed (e.g., for advanced user behavior analytics). All state is managed immutably where possible, with TypeScript for type safety, and sensitive data (e.g., private keys) is never stored in global state—instead, we use secure local storage or WebAuthn-derived credentials.

Key state domains include:
- **Authentication**: Biometric login status (fingerprint, FaceID, WebAuthn) and session tokens.
- **Wallet**: Solana connection, balances (SPL tokens, NFTs), and hardware wallet integration (Ledger/YubiKey).
- **Safe Mode**: Transaction flags (e.g., large amounts, blacklisted addresses), behavioral deviations, and blocking states.
- **Transactions**: Pending simulations, decoding, and signing previews.
- **Phishing Prevention**: URL validations, threat database caches, and warning overlays.

This setup ensures seamless coordination with Solana RPC calls via `@solana/web3.js` and external APIs for threat checks (e.g., PhishTank feeds).

## Installation

Install Zustand and related dependencies:

```bash
npm install zustand @solana/web3.js @solana/spl-token
npm install -D @types/zustand  # For enhanced TypeScript support
```

For optional Redux Toolkit integration (e.g., for complex Safe Mode reducers):

```bash
npm install @reduxjs/toolkit react-redux
```

Ensure these are added to `package.json` under `dependencies` for production builds.

## Core Principles

- **Immutability and Selectors**: Use Zustand's `produce` or immer for immutable updates. Selectors prevent unnecessary re-renders in components like the transaction preview modal.
- **Persistence**: Non-sensitive state (e.g., wallet address, Safe Mode preferences) persists via `persist` middleware with localStorage. Sensitive biometric data uses WebAuthn's credential storage.
- **Async Handling**: Integrate with TanStack Query (or SWR) for Solana RPC fetches, keeping global state lightweight.
- **Security**: Avoid storing private keys in state; derive them on-the-fly via WebAuthn or hardware wallets. Use `crypto.subtle` for any frontend encryption.
- **Testing**: All stores are unit-testable with Jest, mocking Solana connections.
- **Performance**: Limit store subscriptions to specific slices to optimize for mobile browsers and extensions.

## Setting Up Zustand Stores

We organize state into modular stores under `src/stores/`. Each store is a self-contained hook with TypeScript interfaces.

### 1. Authentication Store (Biometric Login)

Handles WebAuthn-based login, session management, and biometric challenges. Integrates with device-native biometrics (TouchID, Windows Hello, FaceID).

Create `src/stores/authStore.ts`:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PublicKey } from '@solana/web3.js';
import type { AuthenticatorAssertionResponse } from 'web-authn'; // For WebAuthn types

interface AuthState {
  isAuthenticated: boolean;
  userPublicKey: PublicKey | null;
  biometricType: 'fingerprint' | 'faceid' | 'touchid' | 'windowshello' | null;
  assertionResponse: AuthenticatorAssertionResponse | null;
  error: string | null;
  
  loginWithBiometrics: (challenge: Uint8Array) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      userPublicKey: null,
      biometricType: null,
      assertionResponse: null,
      error: null,

      loginWithBiometrics: async (challenge: Uint8Array) => {
        try {
          set({ error: null });
          // Simulate WebAuthn assertion (in production, use navigator.credentials.get)
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge,
              allowCredentials: [], // Derived from stored credentials
              userVerification: 'required',
            },
          }) as AuthenticatorAssertionResponse;

          // Derive public key from assertion (integrate with Solana keypair derivation)
          const publicKey = new PublicKey(assertion.userHandle?.toString() || ''); // Placeholder; use actual derivation

          set({
            isAuthenticated: true,
            userPublicKey: publicKey,
            biometricType: detectBiometricType(), // Helper to detect type
            assertionResponse: assertion,
          });

          // Coordinate with BackendDev: Send assertion to /auth/verify endpoint
          await fetch('/api/auth/verify', {
            method: 'POST',
            body: JSON.stringify({ assertion }),
          });
        } catch (err) {
          set({ error: (err as Error).message });
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          userPublicKey: null,
          biometricType: null,
          assertionResponse: null,
          error: null,
        });
        // Clear WebAuthn credentials securely
        localStorage.removeItem('auth-session');
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage', // Persist non-sensitive parts only
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }), // Only persist auth status
    }
  )
);

// Helper function
function detectBiometricType(): AuthState['biometricType'] {
  // Logic based on user agent or WebAuthn response
  return 'fingerprint'; // Example
}
```

**Usage in Components**: In `LoginPage.tsx`, call `loginWithBiometrics` on biometric prompt. This triggers Safe Mode initialization upon success.

### 2. Wallet Store (Solana Connection and Assets)

Manages wallet connection, SPL token/NFT balances, and hardware wallet support. Uses `@solana/web3.js` for RPC interactions.

Create `src/stores/walletStore.ts`:

```typescript
import { create } from 'zustand';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import type { LedgerSignTransactionInput } from '@solana/wallet-adapter-ledger'; // For hardware

interface WalletState {
  connection: Connection | null;
  publicKey: PublicKey | null;
  balances: Record<string, number>; // Token mint -> balance
  nfts: Array<{ mint: string; metadataUri: string }>;
  isHardwareConnected: boolean;
  hardwareType: 'ledger' | 'yubikey' | null;
  loading: boolean;
  error: string | null;

  connectWallet: (endpoint: string) => Promise<void>;
  fetchBalances: (pubkey: PublicKey) => Promise<void>;
  connectHardware: (type: 'ledger' | 'yubikey') => Promise<void>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  clearError: () => void;
}

export const useWalletStore = create<WalletState>()(
  (set, get) => ({
    connection: null,
    publicKey: null,
    balances: {},
    nfts: [],
    isHardwareConnected: false,
    hardwareType: null,
    loading: false,
    error: null,

    connectWallet: async (endpoint: string) => {
      set({ loading: true, error: null });
      try {
        const conn = new Connection(endpoint, 'confirmed');
        const pubkey = get().publicKey || new PublicKey('...'); // From auth or extension
        set({ connection: conn, publicKey: pubkey });
        await get().fetchBalances(pubkey);
      } catch (err) {
        set({ error: (err as Error).message });
      } finally {
        set({ loading: false });
      }
    },

    fetchBalances: async (pubkey: PublicKey) => {
      const { connection } = get();
      if (!connection) return;

      set({ loading: true });
      try {
        // Fetch native SOL balance
        const solBalance = await connection.getBalance(pubkey);
        
        // Fetch SPL tokens (example for USDC mint)
        const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        const ata = await getAssociatedTokenAddress(usdcMint, pubkey);
        const account = await getAccount(connection, ata);
        set({
          balances: { SOL: solBalance / 1e9, USDC: account.amount.toNumber() / 1e6 },
          nfts: [], // Fetch via Metaplex or similar for NFTs
        });
      } catch (err) {
        set({ error: (err as Error).message });
      } finally {
        set({ loading: false });
      }
    },

    connectHardware: async (type: 'ledger' | 'yubikey') => {
      // Use WebUSB for Ledger or WebHID for YubiKey
      if (type === 'ledger') {
        // Implementation with @ledgerhq/hw-transport-webusb
        set({ isHardwareConnected: true, hardwareType: 'ledger' });
      }
      // Similar for YubiKey
    },

    signTransaction: async (tx: Transaction) => {
      const { publicKey, hardwareType } = get();
      if (!publicKey) throw new Error('No wallet connected');
      
      if (hardwareType === 'ledger') {
        // Ledger signing flow
        const signedTx = await window.solana?.signTransaction(tx); // Adapter example
        return signedTx;
      }
      // Fallback to software signing (never store keys)
      throw new Error('Hardware required for signing');
    },

    clearError: () => set({ error: null }),
  })
);
```

**Usage**: In `Dashboard.tsx`, use `connectWallet('https://api.mainnet-beta.solana.com')` on mount. Balances update reactively for DeFi protocol displays.

### 3. Safe Mode Store (Transaction Risk Flagging)

Core to the app's security: Flags transactions based on heuristics (amounts > $1K, first-time addresses, instruction anomalies, behavior deviations). Integrates with transaction simulation.

Create `src/stores/safeModeStore.ts`:

```typescript
import { create } from 'zustand';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import type { SimulateTransactionConfig } from '@solana/web3.js';

interface RiskFlag {
  type: 'amount' | 'address' | 'instruction' | 'behavior';
  severity: 'low' | 'medium' | 'high';
  description: string;
  blocked: boolean;
}

interface SafeModeState {
  isEnabled: boolean;
  preferences: { amountThreshold: number; blacklistedAddresses: string[] };
  currentFlags: RiskFlag[];
  warningMessage: string | null;
  simulationResult: any | null; // From simulateTransaction RPC

  toggleSafeMode: (enabled: boolean) => void;
  updatePreferences: (prefs: Partial<SafeModeState['preferences']>) => void;
  assessTransaction: (tx: Transaction | VersionedTransaction) => Promise<void>;
  clearFlags: () => void;
}

export const useSafeModeStore = create<SafeModeState>()(
  persist(
    (set, get) => ({
      isEnabled: true, // Default on for target audience
      preferences: { amountThreshold: 1000, blacklistedAddresses: [] }, // USD equiv.
      currentFlags: [],
      warningMessage: null,
      simulationResult: null,

      toggleSafeMode: (enabled) => set({ isEnabled: enabled }),

      updatePreferences: (prefs) => {
        const current = get().preferences;
        set({ preferences: { ...current, ...prefs } });
        // Persist to BackendDev API: POST /api/safe-mode/prefs
      },

      assessTransaction: async (tx: Transaction | VersionedTransaction) => {
        const { connection } = useWalletStore.getState();
        if (!connection || !get().isEnabled) return;

        set({ currentFlags: [], warningMessage: null });
        const flags: RiskFlag[] = [];

        // 1. Amount check (simulate for lamports)
        const simConfig: SimulateTransactionConfig = { commitment: 'confirmed' };
        const simResult = await connection.simulateTransaction(tx, simConfig);
        set({ simulationResult: simResult });

        if (simResult.value.err) {
          flags.push({ type: 'instruction', severity: 'high', description: 'Simulation failed', blocked: true });
        }

        // 2. Address checks (first-time, blacklisted)
        const instructions = tx.instructions; // Or tx.message.instructions for Versioned
        instructions.forEach((ix) => {
          const programId = ix.programId.toString();
          if (get().preferences.blacklistedAddresses.includes(programId)) {
            flags.push({ type: 'address', severity: 'high', description: 'Blacklisted program', blocked: true });
          }
          // First-time logic: Compare against user history (from localStorage or API)
        });

        // 3. Amount threshold (approximate USD via oracle simulation)
        if (simResult.value.accounts?.some(acc => acc.lamports > get().preferences.amountThreshold * 1e9)) {
          flags.push({ type: 'amount', severity: 'medium', description: 'Large transfer detected', blocked: false });
        }

        // 4. Behavior deviation (e.g., unusual # of instructions)
        if (instructions.length > 10) {
          flags.push({ type: 'behavior', severity: 'medium', description: 'Unusual complexity', blocked: true });
        }

        // 5. Phishing integration: Check against external DB
        const threatCheck = await fetch('/api/phishing/check', { method: 'POST', body: JSON.stringify({ tx }) });
        const threats = await threatCheck.json();
        if (threats.phishingScore > 0.7) {
          flags.push({ type: 'address', severity: 'high', description: 'Potential phishing domain', blocked: true });
        }

        set({ currentFlags: flags });
        if (flags.some(f => f.blocked)) {
          set({ warningMessage: 'Transaction blocked by Safe Mode. Review risks.' });
        } else if (flags.length > 0) {
          set({ warningMessage: 'Warnings detected. Proceed with caution.' });
        }
      },

      clearFlags: () => set({ currentFlags: [], warningMessage: null, simulationResult: null }),
    }),
    {
      name: 'safe-mode-storage',
      partialize: (state) => ({ isEnabled: state.isEnabled, preferences: state.preferences }),
    }
  )
);
```

**Usage**: In `TransactionSigner.tsx`, call `assessTransaction(tx)` before signing. Display warnings via a TailwindCSS modal, blocking if `blocked: true`. Coordinates with BackendDev's `/api/phishing/check` for threat databases.

### 4. Transactions Store

Orchestrates pending transactions, decoding, and previews. Complements Safe Mode by queuing assessments.

Create `src/stores/transactionsStore.ts`:

```typescript
import { create } from 'zustand';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import { decodeTransaction } from 'solana-transaction-decoder'; // Hypothetical decoder lib

interface PendingTransaction {
  id: string;
  tx: Transaction | VersionedTransaction;
  status: 'pending' | 'assessed' | 'signed' | 'failed';
  decoded: { instructions: Array<{ program: string; data: string }> } | null;
}

interface TransactionsState {
  pending: PendingTransaction[];
  history: PendingTransaction[]; // Last 50 for UX

  addPending: (tx: Transaction | VersionedTransaction) => string;
  updateStatus: (id: string, status: PendingTransaction['status']) => void;
  decodeAndPreview: (id: string) => Promise<void>;
  clearPending: () => void;
}

export const useTransactionsStore = create<TransactionsState>()(
  (set, get) => ({
    pending: [],
    history: [],

    addPending: (tx) => {
      const id = Date.now().toString();
      set({ pending: [...get().pending, { id, tx, status: 'pending', decoded: null }] });
      return id;
    },

    updateStatus: (id, status) => {
      set({
        pending: get().pending.map(t => t.id === id ? { ...t, status } : t),
      });
      if (status === 'signed') {
        // Move to history
        const tx = get().pending.find(t => t.id === id);
        if (tx) set({ history: [tx, ...get().history.slice(0, 49)] });
      }
    },

    decodeAndPreview: async (id) => {
      const tx = get().pending.find(t => t.id === id)?.tx;
      if (!tx) return;

      // Decode instructions (integrate with Solana decoder)
      const decoded = decodeTransaction(tx);
      
      // Trigger Safe Mode assessment
      await useSafeModeStore.getState().assessTransaction(tx);

      set({
        pending: get().pending.map(t => t.id === id ? { ...t, decoded, status: 'assessed' } : t),
      });
    },

    clearPending: () => set({ pending: [] }),
  })
);
```

**Usage**: In DeFi interaction components, add transactions via `addPending`, then `decodeAndPreview` for user previews showing SPL token transfers or NFT mints.

## Integration with Redux Toolkit (Optional for Advanced Analytics)

For user behavior analytics (e.g., deviation tracking over sessions), use Redux Toolkit slices. Install and set up a store in `src/store/index.ts`:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import behaviorAnalyticsSlice from './slices/behaviorAnalyticsSlice';

export const store = configureStore({
  reducer: {
    behavior: behaviorAnalyticsSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

Example slice `src/store/slices/behaviorAnalyticsSlice.ts`:

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BehaviorState {
  sessionPatterns: { txCount: number; avgAmount: number };
  deviationScore: number;
}

const initialState: BehaviorState = { sessionPatterns: { txCount: 0, avgAmount: 0 }, deviationScore: 0 };

const behaviorAnalyticsSlice = createSlice({
  name: 'behavior',
  initialState,
  reducers: {
    updatePattern: (state, action: PayloadAction<{ txCount: number; avgAmount: number }>) => {
      state.sessionPatterns = action.payload;
      // Calculate deviation for Safe Mode
      state.deviationScore = Math.abs(action.payload.avgAmount - 100); // Heuristic
    },
    resetSession: () => initialState,
  },
});

export const { updatePattern, resetSession } = behaviorAnalyticsSlice.actions;
export default behaviorAnalyticsSlice.reducer;
```

Wrap the app in `src/providers/StoreProvider.tsx`:

```tsx
'use client';
import { Provider } from 'react-redux';
import { store } from '../store';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
```

Use in Safe Mode: Dispatch `updatePattern` on each transaction to feed into flagging logic.

## Best Practices and Coordination

- **With ProductManager**: State aligns with key features—e.g., biometric login triggers wallet fetch; Safe Mode preferences are user-configurable via settings page.
- **With BackendDev**: Stores call APIs like `/api/phishing/check` (expects { tx: serializedTransaction } → { phishingScore: number }). Use API contracts for threat databases and auth verification.
- **Error Handling**: Centralized error toasts via a shared `useErrorStore` (not shown; extend as needed).
- **Testing**: Write tests for stores, e.g., `it('flags large amounts', () => { ... })` using mocked Solana connections.
- **Security Audits**: Review for side-channel leaks; use `useEffect` to subscribe stores only in mounted components.
- **Performance in Extensions**: Lazy-load stores in browser extension popups to minimize memory.

This state management architecture ensures a responsive, secure wallet experience tailored to Solana users, with Safe Mode as the proactive guardian against risks. For updates, reference the unique project identifier: 1763624900464_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__frontend_state_management_md_2ydizr.