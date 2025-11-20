import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PublicKey } from '@solana/web3.js';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: {
    id: string;
    solanaPublicKey: string;
    safeModeEnabled: boolean;
  } | null;
  setAuth: (token: string, user: AuthState['user']) => void;
  logout: () => void;
}

interface WalletState {
  publicKey: PublicKey | null;
  balance: number;
  tokens: any[];
  nfts: any[];
  setWallet: (publicKey: PublicKey | null) => void;
  setBalance: (balance: number) => void;
  setTokens: (tokens: any[]) => void;
  setNfts: (nfts: any[]) => void;
}

interface SafeModeState {
  enabled: boolean;
  riskThreshold: number;
  flags: any[];
  setEnabled: (enabled: boolean) => void;
  setRiskThreshold: (threshold: number) => void;
  setFlags: (flags: any[]) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      user: null,
      setAuth: (token, user) => set({ isAuthenticated: true, token, user }),
      logout: () => set({ isAuthenticated: false, token: null, user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

export const useWalletStore = create<WalletState>((set) => ({
  publicKey: null,
  balance: 0,
  tokens: [],
  nfts: [],
  setWallet: (publicKey) => set({ publicKey }),
  setBalance: (balance) => set({ balance }),
  setTokens: (tokens) => set({ tokens }),
  setNfts: (nfts) => set({ nfts }),
}));

export const useSafeModeStore = create<SafeModeState>()(
  persist(
    (set) => ({
      enabled: true,
      riskThreshold: 0.5,
      flags: [],
      setEnabled: (enabled) => set({ enabled }),
      setRiskThreshold: (threshold) => set({ riskThreshold: threshold }),
      setFlags: (flags) => set({ flags }),
    }),
    {
      name: 'safe-mode-storage',
    }
  )
);



