'use client';

import { createContext, useContext, ReactNode } from 'react';
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';

const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

const WalletContext = createContext(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={connection.rpcEndpoint}>
      {children}
    </ConnectionProvider>
  );
}

export const useWalletContext = () => {
  return useContext(WalletContext);
};

