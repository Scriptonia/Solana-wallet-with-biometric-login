'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BiometricLoginButton } from '@/components/auth/BiometricLoginButton';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [solanaPubkey, setSolanaPubkey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBiometricLogin = async () => {
    if (!solanaPubkey.trim()) {
      toast.error('Please enter your Solana public key');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Get authentication options
      const challengeResponse = await api.post('/auth/login', {
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

      // Step 2: Use WebAuthn to get credential
      const challengeBuffer = base64UrlToUint8Array(options.challenge);
      const allowCreds = options.allowCredentials?.map((cred: any) => {
        const idBuffer = base64UrlToUint8Array(cred.id);
        return {
          id: uint8ArrayToArrayBuffer(idBuffer),
          type: 'public-key' as const,
          transports: cred.transports,
        };
      }) || [];

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: uint8ArrayToArrayBuffer(challengeBuffer),
          allowCredentials: allowCreds,
          timeout: options.timeout,
          userVerification: 'required' as const,
        },
      }) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('Biometric authentication failed');
      }

      // Step 3: Verify with backend
      const response = credential.response as AuthenticatorAssertionResponse;
      const verificationResponse = await api.post('/auth/login/verify', {
        response: {
          id: credential.id,
          rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          type: credential.type,
          response: {
            clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON))),
            authenticatorData: btoa(String.fromCharCode(...new Uint8Array(response.authenticatorData))),
            signature: btoa(String.fromCharCode(...new Uint8Array(response.signature))),
            userHandle: response.userHandle ? btoa(String.fromCharCode(...new Uint8Array(response.userHandle))) : null,
          },
        },
        expectedChallenge: options.challenge,
        solanaPubkey: solanaPubkey.trim(),
      });

      if (verificationResponse.data.success) {
        const { token, user } = verificationResponse.data.data;
        setAuth(token, user);
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.error || 'Login failed. Please try again.');
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
            Biometric Login
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="pubkey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Solana Public Key
            </label>
            <input
              id="pubkey"
              type="text"
              value={solanaPubkey}
              onChange={(e) => setSolanaPubkey(e.target.value)}
              placeholder="Enter your Solana public key"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-solana-purple focus:outline-none focus:ring-solana-purple dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              disabled={loading}
            />
          </div>

          <BiometricLoginButton
            onLogin={handleBiometricLogin}
            loading={loading}
          />

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link href="/register" className="font-medium text-solana-purple hover:text-solana-green">
                Register here
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Use your device biometrics (fingerprint, Face ID, or Windows Hello) to login securely
        </p>
      </div>
    </div>
  );
}

