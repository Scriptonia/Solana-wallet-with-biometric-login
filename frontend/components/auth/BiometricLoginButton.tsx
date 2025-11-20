'use client';

import { useState } from 'react';
import { Fingerprint } from 'lucide-react';

interface BiometricLoginButtonProps {
  onLogin: () => Promise<void>;
  loading?: boolean;
  label?: string;
}

export function BiometricLoginButton({ onLogin, loading, label = 'Login with Biometrics' }: BiometricLoginButtonProps) {
  const [isSupported, setIsSupported] = useState(false);

  useState(() => {
    if (typeof window !== 'undefined') {
      setIsSupported(
        'credentials' in navigator &&
        'PublicKeyCredential' in window
      );
    }
  });

  if (!isSupported) {
    return (
      <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Biometric authentication is not supported on this device. Please use a compatible browser.
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={onLogin}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-solana-purple to-solana-green px-4 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          <span>Authenticating...</span>
        </>
      ) : (
        <>
          <Fingerprint className="h-5 w-5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

