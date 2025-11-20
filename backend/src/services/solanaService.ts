import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { solanaConnection } from '../config/solana';

export class SolanaService {
  private connection: Connection;

  constructor(connection?: Connection) {
    this.connection = connection || solanaConnection;
  }

  async getBalance(publicKey: string): Promise<number> {
    try {
      const pubkey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubkey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      throw new Error(`Failed to get balance: ${error}`);
    }
  }

  async simulateTransaction(
    transactionBase64: string
  ): Promise<{
    err: any;
    logs: string[];
    accounts?: any[];
  }> {
    try {
      const txBuffer = Buffer.from(transactionBase64, 'base64');
      const transaction = VersionedTransaction.deserialize(txBuffer);

      const simulation = await this.connection.simulateTransaction(transaction, {
        sigVerify: false,
        replaceRecentBlockhash: true,
      });

      return {
        err: simulation.value.err,
        logs: simulation.value.logs || [],
        accounts: simulation.value.accounts || [],
      };
    } catch (error) {
      throw new Error(`Simulation failed: ${error}`);
    }
  }

  async getTransactionHistory(
    publicKey: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const pubkey = new PublicKey(publicKey);
      const signatures = await this.connection.getSignaturesForAddress(pubkey, { limit });

      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          const tx = await this.connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          return {
            signature: sig.signature,
            blockTime: sig.blockTime,
            slot: sig.slot,
            err: sig.err,
            transaction: tx,
          };
        })
      );

      return transactions;
    } catch (error) {
      throw new Error(`Failed to get transaction history: ${error}`);
    }
  }

  /**
   * Get transaction history using Helius parsed API (recommended)
   * Falls back to standard RPC if Helius fails
   */
  async getParsedTransactionHistory(
    publicKey: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      // Try Helius first
      const { HeliusService } = await import('./heliusService');
      const heliusService = new HeliusService();
      const heliusTxs = await heliusService.getParsedTransactionHistory(publicKey, { limit });
      
      // Parse and format Helius transactions
      return heliusTxs.map((tx) => ({
        signature: tx.signature,
        blockTime: tx.timestamp,
        slot: tx.slot,
        type: tx.type,
        source: tx.source,
        fee: tx.fee,
        parsed: heliusService.parseTransaction(tx),
        nativeTransfers: tx.nativeTransfers,
        tokenTransfers: tx.tokenTransfers,
        nftTransfers: tx.nftTransfers,
        instructions: tx.instructions,
      }));
    } catch (error) {
      // Fallback to standard RPC
      console.warn('Helius API failed, falling back to standard RPC:', error);
      return this.getTransactionHistory(publicKey, limit);
    }
  }

  async getTokenAccounts(publicKey: string): Promise<any[]> {
    try {
      const pubkey = new PublicKey(publicKey);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      });

      return tokenAccounts.value.map((account) => ({
        pubkey: account.pubkey.toString(),
        mint: account.account.data.parsed.info.mint,
        balance: account.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: account.account.data.parsed.info.tokenAmount.decimals,
      }));
    } catch (error) {
      throw new Error(`Failed to get token accounts: ${error}`);
    }
  }

  validateAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}

