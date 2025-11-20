import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type VerifyRegistrationResponseOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const rpName = process.env.WEBAUTHN_RP_NAME || 'Secure Solana Wallet';
// Allow any localhost port in development
const getOrigin = (): string => {
  if (process.env.NODE_ENV === 'development') {
    return process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';
  }
  return process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';
};
const origin = getOrigin();

// In-memory challenge store (use Redis in production)
const challenges = new Map<string, { challenge: string; userId?: string; pubkey?: string }>();

export class BiometricService {
  static async generateRegistrationOptions(solanaPubkey: string) {
    const user = await prisma.user.findUnique({
      where: { solanaPublicKey: solanaPubkey },
    });

    const userId = user?.id || crypto.randomBytes(16).toString('hex');

    const opts: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userID: userId,
      userName: solanaPubkey,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: [],
      authenticatorSelection: {
        userVerification: 'required',
        authenticatorAttachment: 'platform',
      },
      supportedAlgorithmIDs: [-7, -257],
    };

    const options = await generateRegistrationOptions(opts);
    
    // Store challenge
    challenges.set(options.challenge, { challenge: options.challenge, userId, pubkey: solanaPubkey });

    return { ...options, userId };
  }

  static async verifyRegistration(
    response: any,
    expectedChallenge: string,
    solanaPubkey: string
  ) {
    const challengeData = challenges.get(expectedChallenge);
    if (!challengeData) {
      throw new Error('Invalid challenge');
    }

    let user = await prisma.user.findUnique({
      where: { solanaPublicKey: solanaPubkey },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          solanaPublicKey: solanaPubkey,
          safeModeEnabled: true,
        },
      });
    }

    // The @simplewebauthn/server library expects base64url strings, not Buffers
    // It will handle the conversion internally
    const webauthnResponse = {
      id: response.id,
      rawId: response.rawId, // Keep as string (base64url)
      type: response.type,
      response: {
        clientDataJSON: response.response.clientDataJSON, // Keep as string (base64url)
        attestationObject: response.response.attestationObject, // Keep as string (base64url)
      },
      clientExtensionResults: response.clientExtensionResults || {},
      transports: response.transports || [],
    };

    const opts: VerifyRegistrationResponseOpts = {
      response: webauthnResponse,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    };

    const verification = await verifyRegistrationResponse(opts);

    if (verification.verified && verification.registrationInfo) {
      await prisma.authenticator.upsert({
        where: { credentialId: webauthnResponse.id },
        create: {
          userId: user.id,
          credentialId: webauthnResponse.id,
          publicKey: Buffer.from(verification.registrationInfo.credentialPublicKey),
          signCount: verification.registrationInfo.counter,
          transports: webauthnResponse.transports || [],
        },
        update: {
          publicKey: Buffer.from(verification.registrationInfo.credentialPublicKey),
          signCount: verification.registrationInfo.counter,
          lastUsedAt: new Date(),
          transports: webauthnResponse.transports || [],
        },
      });

      challenges.delete(expectedChallenge);
      return { verified: true, userId: user.id };
    }

    throw new Error('Registration verification failed');
  }

  static async generateAuthenticationOptions(solanaPubkey: string) {
    const user = await prisma.user.findUnique({
      where: { solanaPublicKey: solanaPubkey },
      include: { authenticators: true },
    });

    if (!user || user.authenticators.length === 0) {
      throw new Error('User not found or no authenticators registered');
    }

    const opts: GenerateAuthenticationOptionsOpts = {
      rpID,
      timeout: 60000,
      allowCredentials: user.authenticators.map((auth) => {
        let credentialId: Uint8Array;
        try {
          credentialId = new Uint8Array(Buffer.from(auth.credentialId, 'base64url'));
        } catch {
          credentialId = new Uint8Array(Buffer.from(auth.credentialId));
        }
        return {
          id: credentialId,
          type: 'public-key' as const,
          transports: auth.transports as AuthenticatorTransport[],
        };
      }),
      userVerification: 'required',
    };

    const options = await generateAuthenticationOptions(opts);
    
    challenges.set(options.challenge, { challenge: options.challenge, userId: user.id });

    return options;
  }

  static async verifyAuthentication(
    response: any,
    expectedChallenge: string,
    solanaPubkey: string
  ) {
    const challengeData = challenges.get(expectedChallenge);
    if (!challengeData || !challengeData.userId) {
      throw new Error('Invalid challenge');
    }

    const user = await prisma.user.findUnique({
      where: { solanaPublicKey: solanaPubkey },
      include: { authenticators: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const authenticator = user.authenticators.find((a) => a.credentialId === response.id);
    if (!authenticator) {
      throw new Error('Authenticator not found');
    }

    // Convert credentialId to Uint8Array
    let credentialID: Uint8Array;
    try {
      credentialID = new Uint8Array(Buffer.from(authenticator.credentialId, 'base64url'));
    } catch {
      credentialID = new Uint8Array(Buffer.from(authenticator.credentialId));
    }

    // Convert publicKey to Uint8Array
    const credentialPublicKey = new Uint8Array(Buffer.from(authenticator.publicKey));

    const opts: VerifyAuthenticationResponseOpts = {
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      authenticator: {
        credentialID,
        credentialPublicKey,
        counter: authenticator.signCount,
      },
    };

    const verification = await verifyAuthenticationResponse(opts);

    if (verification.verified) {
      await prisma.authenticator.update({
        where: { id: authenticator.id },
        data: {
          signCount: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
        },
      });

      challenges.delete(expectedChallenge);
      return { verified: true, userId: user.id };
    }

    throw new Error('Authentication verification failed');
  }
}

