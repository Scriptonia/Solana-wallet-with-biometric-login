import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export interface RiskAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED';
  riskScore: number;
  flags: RiskFlag[];
  recommendation: 'APPROVE' | 'WARN' | 'BLOCK';
}

export interface RiskFlag {
  type: 'LARGE_AMOUNT' | 'FIRST_TIME_ADDRESS' | 'BLACKLISTED_ADDRESS' | 'UNUSUAL_INSTRUCTIONS' | 'BEHAVIOR_DEVIATION' | 'PHISHING_RISK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string;
  score: number;
}

export class RiskService {
  static async assessTransaction(
    transactionData: {
      amount?: number;
      recipientAddress?: string;
      instructions?: any[];
      userId: string;
      walletId: string;
    }
  ): Promise<RiskAssessment> {
    const flags: RiskFlag[] = [];
    let riskScore = 0;

    // Get user behavior profile
    const behaviorProfile = await prisma.behaviorProfile.findUnique({
      where: { userId: transactionData.userId },
    });

    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { id: transactionData.userId },
    });

    const riskThreshold = user?.riskThreshold || 0.5;

    // 1. Check for large amount
    if (transactionData.amount) {
      const amountInSOL = transactionData.amount / 1e9;
      const avgAmount = behaviorProfile?.avgAmount ? Number(behaviorProfile.avgAmount) / 1e9 : 0;
      
      if (avgAmount > 0 && amountInSOL > avgAmount * 5) {
        flags.push({
          type: 'LARGE_AMOUNT',
          severity: 'HIGH',
          details: `Amount (${amountInSOL.toFixed(4)} SOL) exceeds average by ${((amountInSOL / avgAmount) * 100).toFixed(0)}%`,
          score: 0.4,
        });
        riskScore += 0.4;
      } else if (amountInSOL > 10) {
        flags.push({
          type: 'LARGE_AMOUNT',
          severity: 'MEDIUM',
          details: `Large transfer detected: ${amountInSOL.toFixed(4)} SOL`,
          score: 0.2,
        });
        riskScore += 0.2;
      }
    }

    // 2. Check for first-time address
    if (transactionData.recipientAddress) {
      const previousTx = await prisma.transaction.findFirst({
        where: {
          walletId: transactionData.walletId,
          recipientAddress: transactionData.recipientAddress,
        },
      });

      if (!previousTx) {
        flags.push({
          type: 'FIRST_TIME_ADDRESS',
          severity: 'MEDIUM',
          details: 'Recipient address has not been used before',
          score: 0.2,
        });
        riskScore += 0.2;
      }

      // 3. Check blacklisted addresses
      const blacklisted = await prisma.threatCache.findFirst({
        where: {
          type: 'THREAT_ADDRESS',
          value: transactionData.recipientAddress,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (blacklisted) {
        flags.push({
          type: 'BLACKLISTED_ADDRESS',
          severity: 'CRITICAL',
          details: 'Recipient address is blacklisted',
          score: 1.0,
        });
        riskScore = 1.0; // Maximum risk
      }
    }

    // 4. Check for unusual instructions
    if (transactionData.instructions && transactionData.instructions.length > 10) {
      flags.push({
        type: 'UNUSUAL_INSTRUCTIONS',
        severity: 'MEDIUM',
        details: `Transaction contains ${transactionData.instructions.length} instructions (unusually high)`,
        score: 0.2,
      });
      riskScore += 0.2;
    }

    // 5. Check behavior deviation
    if (behaviorProfile) {
      const recentTxs = await prisma.transaction.count({
        where: {
          userId: transactionData.userId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      const avgFrequency = behaviorProfile.txnFrequency || 1;
      if (recentTxs > avgFrequency * 3) {
        flags.push({
          type: 'BEHAVIOR_DEVIATION',
          severity: 'HIGH',
          details: `Transaction frequency (${recentTxs} in 24h) is ${((recentTxs / avgFrequency) * 100).toFixed(0)}% above average`,
          score: 0.3,
        });
        riskScore += 0.3;
      }
    }

    // Determine risk level and recommendation
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED';
    let recommendation: 'APPROVE' | 'WARN' | 'BLOCK';

    if (riskScore >= riskThreshold || flags.some(f => f.severity === 'CRITICAL')) {
      riskLevel = 'BLOCKED';
      recommendation = 'BLOCK';
    } else if (riskScore >= riskThreshold * 0.7) {
      riskLevel = 'HIGH';
      recommendation = 'WARN';
    } else if (riskScore >= riskThreshold * 0.4) {
      riskLevel = 'MEDIUM';
      recommendation = 'WARN';
    } else {
      riskLevel = 'LOW';
      recommendation = 'APPROVE';
    }

    return {
      riskLevel,
      riskScore: Math.min(riskScore, 1.0),
      flags,
      recommendation,
    };
  }

  static async updateBehaviorProfile(userId: string, transactionData: {
    amount: number;
    recipientAddress?: string;
  }) {
    const profile = await prisma.behaviorProfile.findUnique({
      where: { userId },
    });

    const recentTxs = await prisma.transaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    const avgAmount = recentTxs.length > 0
      ? recentTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) / recentTxs.length
      : transactionData.amount;

    const frequency = recentTxs.length / 30; // Transactions per day

    const commonAddresses = recentTxs
      .map(tx => tx.recipientAddress)
      .filter(Boolean)
      .reduce((acc: Record<string, number>, addr) => {
        acc[addr!] = (acc[addr!] || 0) + 1;
        return acc;
      }, {});

    const topAddresses = Object.entries(commonAddresses)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([addr]) => addr);

    if (profile) {
      await prisma.behaviorProfile.update({
        where: { userId },
        data: {
          avgAmount: new Decimal(avgAmount),
          txnFrequency: Math.round(frequency),
          commonAddresses: topAddresses,
        },
      });
    } else {
      await prisma.behaviorProfile.create({
        data: {
          userId,
          avgAmount: new Decimal(avgAmount),
          txnFrequency: Math.round(frequency),
          commonAddresses: topAddresses,
        },
      });
    }
  }
}



