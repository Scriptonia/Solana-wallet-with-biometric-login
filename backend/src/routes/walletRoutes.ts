import express from 'express';
import { SolanaService } from '../services/solanaService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/v1/wallet/balance/:address
router.get('/balance/:address', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { address } = req.params;
    const solanaService = new SolanaService();

    // Verify address belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: {
        publicKey: address,
        userId: req.user!.userId,
      },
    });

    if (!wallet) {
      return res.status(403).json({ success: false, error: 'Wallet not found or access denied' });
    }

    const balance = await solanaService.getBalance(address);
    const tokenAccounts = await solanaService.getTokenAccounts(address);

    res.json({
      success: true,
      data: {
        sol: balance,
        tokens: tokenAccounts,
      },
    });
  } catch (error: any) {
    logger.error('Balance fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/wallet/transactions/:address
router.get('/transactions/:address', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const useHelius = req.query.helius !== 'false'; // Default to true

    const wallet = await prisma.wallet.findFirst({
      where: {
        publicKey: address,
        userId: req.user!.userId,
      },
    });

    if (!wallet) {
      return res.status(403).json({ success: false, error: 'Wallet not found or access denied' });
    }

    let transactions: any[] = [];

    if (useHelius) {
      // Use Helius parsed transaction API
      const solanaService = new SolanaService();
      transactions = await solanaService.getParsedTransactionHistory(address, limit);
    } else {
      // Get from database first, then fetch from chain if needed
      const dbTransactions = await prisma.transaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { riskFlags: true },
      });

      if (dbTransactions.length > 0) {
        transactions = dbTransactions;
      } else {
        // Fetch from chain if no DB records
        const solanaService = new SolanaService();
        transactions = await solanaService.getParsedTransactionHistory(address, limit);
      }
    }

    res.json({
      success: true,
      data: transactions,
      source: useHelius ? 'helius' : 'database',
    });
  } catch (error: any) {
    logger.error('Transaction history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/wallet/create
router.post('/create', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { publicKey, label } = req.body;

    if (!publicKey) {
      return res.status(400).json({ success: false, error: 'Public key required' });
    }

    const solanaService = new SolanaService();
    if (!solanaService.validateAddress(publicKey)) {
      return res.status(400).json({ success: false, error: 'Invalid Solana address' });
    }

    const existingWallet = await prisma.wallet.findUnique({
      where: { publicKey },
    });

    if (existingWallet) {
      return res.status(409).json({ success: false, error: 'Wallet already exists' });
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId: req.user!.userId,
        publicKey,
        label: label || 'Main Wallet',
        isPrimary: true,
      },
    });

    const balance = await solanaService.getBalance(publicKey);

    res.status(201).json({
      success: true,
      data: {
        wallet: {
          id: wallet.id,
          publicKey: wallet.publicKey,
          label: wallet.label,
          balance,
        },
      },
    });
  } catch (error: any) {
    logger.error('Wallet creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

