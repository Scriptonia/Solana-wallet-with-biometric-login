import express from 'express';
import { SolanaService } from '../services/solanaService';
import { RiskService } from '../services/riskService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { simulationRateLimiter } from '../middleware/rateLimit';
import prisma from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();

// POST /api/v1/transactions/simulate
router.post('/simulate', authenticateToken, simulationRateLimiter, async (req: AuthRequest, res) => {
  try {
    const { transaction: transactionBase64, walletAddress } = req.body;

    if (!transactionBase64 || !walletAddress) {
      return res.status(400).json({ success: false, error: 'Transaction and wallet address required' });
    }

    const solanaService = new SolanaService();
    const simulationResult = await solanaService.simulateTransaction(transactionBase64);

    // Get wallet
    const wallet = await prisma.wallet.findFirst({
      where: {
        publicKey: walletAddress,
        userId: req.user!.userId,
      },
    });

    if (!wallet) {
      return res.status(403).json({ success: false, error: 'Wallet not found' });
    }

    // Perform risk assessment
    const riskAssessment = await RiskService.assessTransaction({
      amount: 0, // Extract from transaction if needed
      recipientAddress: undefined, // Extract from transaction
      instructions: [],
      userId: req.user!.userId,
      walletId: wallet.id,
    });

    res.json({
      success: true,
      data: {
        simulationResult,
        riskAssessment,
      },
    });
  } catch (error: any) {
    logger.error('Transaction simulation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/transactions/create
router.post('/create', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const {
      walletId,
      amount,
      recipientAddress,
      instructions,
      simulationResult,
      riskScore,
      isBlocked,
    } = req.body;

    if (!walletId) {
      return res.status(400).json({ success: false, error: 'Wallet ID required' });
    }

    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: req.user!.userId,
      },
    });

    if (!wallet) {
      return res.status(403).json({ success: false, error: 'Wallet not found' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: req.user!.userId,
        walletId,
        amount: amount ? parseFloat(amount) : null,
        recipientAddress,
        instructions: instructions || [],
        simulationResult: simulationResult || {},
        riskScore: riskScore || 0,
        isBlocked: isBlocked || false,
        status: 'pending',
      },
    });

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error: any) {
    logger.error('Transaction creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



