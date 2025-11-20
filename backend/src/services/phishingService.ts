import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PhishingCheckResult {
  isPhishing: boolean;
  threatScore: number;
  sources: string[];
  details?: string;
}

export class PhishingService {
  static async checkURL(url: string): Promise<PhishingCheckResult> {
    try {
      // Check cache first
      const cached = await prisma.threatCache.findFirst({
        where: {
          type: 'PHISHING_URL',
          value: url,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (cached) {
        return {
          isPhishing: true,
          threatScore: 0.9,
          sources: [cached.source],
          details: `Cached threat: ${cached.source}`,
        };
      }

      // Extract domain
      const domain = new URL(url).hostname;

      // Check domain cache
      const domainCache = await prisma.threatCache.findFirst({
        where: {
          type: 'BLACKLISTED_DOMAIN',
          value: domain,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (domainCache) {
        return {
          isPhishing: true,
          threatScore: 0.8,
          sources: [domainCache.source],
          details: `Blacklisted domain: ${domain}`,
        };
      }

      // Check PhishTank API (if configured)
      const phishTankKey = process.env.PHISHTANK_API_KEY;
      if (phishTankKey) {
        try {
          const response = await axios.get(
            `https://checkurl.phishtank.com/checkurl/`,
            {
              params: {
                url: url,
                format: 'json',
                app_key: phishTankKey,
              },
              timeout: 5000,
            }
          );

          if (response.data.results?.in_database) {
            // Cache the result
            await prisma.threatCache.create({
              data: {
                type: 'PHISHING_URL',
                value: url,
                source: 'PhishTank',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
              },
            });

            return {
              isPhishing: true,
              threatScore: 0.95,
              sources: ['PhishTank'],
              details: 'URL found in PhishTank database',
            };
          }
        } catch (error) {
          // PhishTank API error, continue with other checks
          console.error('PhishTank API error:', error);
        }
      }

      // Heuristic checks
      const suspiciousPatterns = [
        /solana.*wallet.*connect/i,
        /secure.*login.*solana/i,
        /verify.*wallet/i,
      ];

      const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));

      if (isSuspicious) {
        return {
          isPhishing: true,
          threatScore: 0.6,
          sources: ['Heuristic'],
          details: 'URL matches suspicious patterns',
        };
      }

      return {
        isPhishing: false,
        threatScore: 0.0,
        sources: [],
      };
    } catch (error) {
      // If URL parsing fails, treat as potentially unsafe
      return {
        isPhishing: true,
        threatScore: 0.5,
        sources: ['Validation Error'],
        details: 'Invalid URL format',
      };
    }
  }

  static async checkAddress(address: string): Promise<PhishingCheckResult> {
    const blacklisted = await prisma.threatCache.findFirst({
      where: {
        type: 'THREAT_ADDRESS',
        value: address,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (blacklisted) {
      return {
        isPhishing: true,
        threatScore: 0.9,
        sources: [blacklisted.source],
        details: 'Address is blacklisted',
      };
    }

    return {
      isPhishing: false,
      threatScore: 0.0,
      sources: [],
    };
  }
}



