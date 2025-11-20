import axios from 'axios';
import { HELIUS_API_URL, HELIUS_API_KEY } from '../config/solana';

export interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  slot: number;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }>;
  nftTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
  }>;
  instructions?: Array<{
    programId: string;
    programName: string;
    type: string;
    data?: any;
  }>;
  events?: any;
}

export class HeliusService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = HELIUS_API_KEY;
    this.apiUrl = HELIUS_API_URL;
  }

  /**
   * Get parsed transaction history for an address using Helius API
   * @param address Solana wallet address
   * @param options Query options
   */
  async getParsedTransactionHistory(
    address: string,
    options: {
      limit?: number;
      before?: string;
      until?: string;
      type?: string;
    } = {}
  ): Promise<HeliusTransaction[]> {
    try {
      const params = new URLSearchParams({
        'api-key': this.apiKey,
      });

      if (options.limit) {
        params.append('limit', options.limit.toString());
      }
      if (options.before) {
        params.append('before', options.before);
      }
      if (options.until) {
        params.append('until', options.until);
      }
      if (options.type) {
        params.append('type', options.type);
      }

      const url = `${this.apiUrl}/v0/addresses/${address}/transactions?${params.toString()}`;

      const response = await axios.get<HeliusTransaction[]>(url, {
        timeout: 10000,
      });

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Helius API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`
        );
      }
      throw new Error(`Failed to fetch transaction history: ${error.message}`);
    }
  }

  /**
   * Get enriched transaction details
   * @param signature Transaction signature
   */
  async getTransactionDetails(signature: string): Promise<HeliusTransaction | null> {
    try {
      // First try to get from address transactions
      // For single transaction, we can use the standard RPC or parse from history
      // Helius doesn't have a direct single transaction endpoint, so we'll use RPC
      return null;
    } catch (error: any) {
      throw new Error(`Failed to fetch transaction details: ${error.message}`);
    }
  }

  /**
   * Parse transaction to extract key information
   */
  parseTransaction(tx: HeliusTransaction): {
    type: string;
    amount: number;
    from: string;
    to: string;
    tokens?: Array<{ mint: string; amount: number }>;
    nfts?: Array<{ mint: string }>;
    fee: number;
    timestamp: number;
  } {
    const result: any = {
      type: tx.type || 'UNKNOWN',
      amount: 0,
      from: '',
      to: '',
      fee: tx.fee || 0,
      timestamp: tx.timestamp || 0,
    };

    // Parse native SOL transfers
    if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
      const transfer = tx.nativeTransfers[0];
      result.from = transfer.fromUserAccount;
      result.to = transfer.toUserAccount;
      result.amount = transfer.amount / 1e9; // Convert lamports to SOL
    }

    // Parse token transfers
    if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
      result.tokens = tx.tokenTransfers.map((t) => ({
        mint: t.mint,
        amount: t.tokenAmount,
      }));
    }

    // Parse NFT transfers
    if (tx.nftTransfers && tx.nftTransfers.length > 0) {
      result.nfts = tx.nftTransfers.map((nft) => ({
        mint: nft.mint,
      }));
    }

    return result;
  }
}



