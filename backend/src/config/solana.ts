import { Connection, PublicKey } from '@solana/web3.js';

// Helius RPC endpoints
const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=23f69914-c7a0-4577-af0c-221536a2f792';
const HELIUS_API_URL = process.env.HELIUS_API_URL || 'https://api-mainnet.helius-rpc.com';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '23f69914-c7a0-4577-af0c-221536a2f792';

// Fallback to standard RPC if Helius not configured
const RPC_URL = process.env.SOLANA_RPC_URL || HELIUS_RPC_URL;
const DEVNET_RPC_URL = process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com';

export const solanaConnection = new Connection(
  process.env.NODE_ENV === 'production' ? RPC_URL : DEVNET_RPC_URL,
  'confirmed'
);

export const createConnection = (url?: string) => {
  return new Connection(url || RPC_URL, 'confirmed');
};

export { PublicKey, HELIUS_API_URL, HELIUS_API_KEY };

