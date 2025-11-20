import express from 'express';
import jwt from 'jsonwebtoken';
import { BiometricService } from '../services/biometricService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';
import prisma from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();

// POST /api/v1/auth/register - Generate registration options
router.post('/register', authRateLimiter, async (req, res) => {
  try {
    const { solanaPubkey } = req.body;

    if (!solanaPubkey) {
      return res.status(400).json({ success: false, error: 'Solana public key required' });
    }

    const options = await BiometricService.generateRegistrationOptions(solanaPubkey);
    res.json({ success: true, data: options });
  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/auth/register/verify - Verify registration
router.post('/register/verify', authRateLimiter, async (req, res) => {
  try {
    const { response, expectedChallenge, solanaPubkey } = req.body;

    if (!response || !expectedChallenge || !solanaPubkey) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await BiometricService.verifyRegistration(
      response,
      expectedChallenge,
      solanaPubkey
    );

    if (result.verified) {
      const user = await prisma.user.findUnique({
        where: { id: result.userId },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const token = jwt.sign(
        {
          sub: user.id,
          solanaPublicKey: user.solanaPublicKey,
          safeModeEnabled: user.safeModeEnabled,
        },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      await prisma.session.create({
        data: {
          userId: user.id,
          token: token,
          expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
          authMethod: 'FINGERPRINT',
          isValid: true,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            solanaPublicKey: user.solanaPublicKey,
            safeModeEnabled: user.safeModeEnabled,
          },
        },
      });
    } else {
      res.status(400).json({ success: false, error: 'Verification failed' });
    }
  } catch (error: any) {
    logger.error('Registration verification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/auth/login - Generate authentication options
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { solanaPubkey } = req.body;

    if (!solanaPubkey) {
      return res.status(400).json({ success: false, error: 'Solana public key required' });
    }

    const options = await BiometricService.generateAuthenticationOptions(solanaPubkey);
    res.json({ success: true, data: options });
  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/auth/login/verify - Verify authentication
router.post('/login/verify', authRateLimiter, async (req, res) => {
  try {
    const { response, expectedChallenge, solanaPubkey } = req.body;

    if (!response || !expectedChallenge || !solanaPubkey) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await BiometricService.verifyAuthentication(
      response,
      expectedChallenge,
      solanaPubkey
    );

    if (result.verified) {
      const user = await prisma.user.findUnique({
        where: { id: result.userId },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const token = jwt.sign(
        {
          sub: user.id,
          solanaPublicKey: user.solanaPublicKey,
          safeModeEnabled: user.safeModeEnabled,
        },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      await prisma.session.create({
        data: {
          userId: user.id,
          token: token,
          expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
          authMethod: 'FINGERPRINT',
          isValid: true,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            solanaPublicKey: user.solanaPublicKey,
            safeModeEnabled: user.safeModeEnabled,
          },
        },
      });
    } else {
      res.status(401).json({ success: false, error: 'Authentication failed' });
    }
  } catch (error: any) {
    logger.error('Login verification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await prisma.session.updateMany({
        where: { token },
        data: { isValid: false },
      });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



