import express from 'express';
import { RiskService } from '../services/riskService';
import { PhishingService } from '../services/phishingService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();

// POST /api/v1/safe-mode/assess-transaction
router.post('/assess-transaction', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const {
      transaction: transactionBase64,
      walletAddress,
      amount,
      recipientAddress,
      instructions,
    } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }

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
      amount: amount || 0,
      recipientAddress,
      instructions: instructions || [],
      userId: req.user!.userId,
      walletId: wallet.id,
    });

    res.json({
      success: true,
      data: riskAssessment,
    });
  } catch (error: any) {
    logger.error('Risk assessment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/safe-mode/check-phishing
router.post('/check-phishing', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { url, address } = req.body;

    if (!url && !address) {
      return res.status(400).json({ success: false, error: 'URL or address required' });
    }

    let result;
    if (url) {
      result = await PhishingService.checkURL(url);
    } else if (address) {
      result = await PhishingService.checkAddress(address);
    } else {
      return res.status(400).json({ success: false, error: 'URL or address required' });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Phishing check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/safe-mode/user-behavior
router.get('/user-behavior', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.behaviorProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!profile) {
      return res.json({
        success: true,
        data: {
          avgAmount: 0,
          txnFrequency: 0,
          commonAddresses: [],
          deviationScore: 0,
        },
      });
    }

    res.json({
      success: true,
      data: {
        avgAmount: Number(profile.avgAmount),
        txnFrequency: profile.txnFrequency,
        commonAddresses: profile.commonAddresses || [],
        deviationScore: profile.deviationScore,
      },
    });
  } catch (error: any) {
    logger.error('Behavior profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/safe-mode/update-behavior
router.post('/update-behavior', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { signature, amount, type } = req.body;

    if (!signature || amount === undefined) {
      return res.status(400).json({ success: false, error: 'Signature and amount required' });
    }

    await RiskService.updateBehaviorProfile(req.user!.userId, {
      amount,
      recipientAddress: undefined,
    });

    res.status(204).send();
  } catch (error: any) {
    logger.error('Behavior update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



