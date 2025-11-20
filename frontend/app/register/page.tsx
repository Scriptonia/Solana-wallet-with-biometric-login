'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BiometricLoginButton } from '@/components/auth/BiometricLoginButton';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Keypair } from '@solana/web3.js';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [solanaPubkey, setSolanaPubkey] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateNewWallet = async () => {
    setGenerating(true);
    try {
      // Generate a new Solana keypair
      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey.toString();
      setSolanaPubkey(publicKey);
      
      // Store keypair secret key in session storage (temporary, user should save it)
      // WARNING: In production, this should be handled more securely
      const secretKey = Array.from(keypair.secretKey);
      sessionStorage.setItem('temp_secretKey', JSON.stringify(secretKey));
      sessionStorage.setItem('temp_publicKey', publicKey);
      
      toast.success('New wallet generated! Save your secret key securely.', {
        duration: 5000,
      });
      
      // Show secret key in alert (in production, use a secure modal)
      alert(`IMPORTANT: Save this secret key (64 bytes):\n\n${JSON.stringify(secretKey)}\n\nYou'll need it to recover your wallet!\n\nPublic Key: ${publicKey}`);
    } catch (error: any) {
      console.error('Wallet generation error:', error);
      toast.error('Failed to generate wallet');
    } finally {
      setGenerating(false);
    }
  };

  const handleBiometricRegistration = async () => {
    if (!solanaPubkey.trim()) {
      toast.error('Please enter or generate a Solana public key');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Get registration options
      const challengeResponse = await api.post('/auth/register', {
        solanaPubkey: solanaPubkey.trim(),
      });

      const options = challengeResponse.data.data;

      // Helper function to decode base64url to Uint8Array
      const base64UrlToUint8Array = (base64url: string): Uint8Array => {
        // Convert base64url to base64
        let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        // Add padding if needed
        while (base64.length % 4) {
          base64 += '=';
        }
        // Decode base64
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      };

      // Helper function to convert Uint8Array to ArrayBuffer
      const uint8ArrayToArrayBuffer = (uint8Array: Uint8Array): ArrayBuffer => {
        const buffer = new ArrayBuffer(uint8Array.byteLength);
        const view = new Uint8Array(buffer);
        view.set(uint8Array);
        return buffer;
      };

      // Step 2: Use WebAuthn to create credential
      const challengeBuffer = base64UrlToUint8Array(options.challenge);
      const userIdBuffer = base64UrlToUint8Array(options.user.id);
      
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: uint8ArrayToArrayBuffer(challengeBuffer),
          rp: {
            name: options.rp.name,
            id: options.rp.id,
          },
          user: {
            id: uint8ArrayToArrayBuffer(userIdBuffer),
            name: options.user.name,
            displayName: options.user.displayName || options.user.name,
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          timeout: options.timeout,
          attestation: options.attestation,
        },
      }) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('Biometric registration failed');
      }

      // Step 3: Verify registration with backend
      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Convert ArrayBuffer to base64url for transmission
      const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary)
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      };

      const verificationResponse = await api.post('/auth/register/verify', {
        response: {
          id: credential.id,
          rawId: arrayBufferToBase64(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
            attestationObject: arrayBufferToBase64(response.attestationObject),
          },
        },
        expectedChallenge: options.challenge,
        solanaPubkey: solanaPubkey.trim(),
      });

      if (verificationResponse.data.success) {
        const { token, user } = verificationResponse.data.data;
        setAuth(token, user);
        toast.success('Registration successful!');
        
        // Clear temporary keys
        sessionStorage.removeItem('temp_secretKey');
        sessionStorage.removeItem('temp_publicKey');
        
        router.push('/dashboard');
      } else {
        throw new Error('Registration verification failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-solana-purple to-gray-900 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-xl dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Secure Solana Wallet
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Create New Account
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="pubkey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Solana Public Key
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="pubkey"
                type="text"
                value={solanaPubkey}
                onChange={(e) => setSolanaPubkey(e.target.value)}
                placeholder="Enter or generate a Solana public key"
                className="block flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-solana-purple focus:outline-none focus:ring-solana-purple dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                disabled={loading || generating}
              />
              <button
                onClick={generateNewWallet}
                disabled={loading || generating}
                className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Generate a new wallet or enter an existing public key
            </p>
          </div>

          <BiometricLoginButton
            onLogin={handleBiometricRegistration}
            loading={loading}
            label="Register with Biometrics"
          />

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-solana-purple hover:text-solana-green">
                Login here
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Use your device biometrics (fingerprint, Face ID, or Windows Hello) to register securely
        </p>
      </div>
    </div>
  );
}

