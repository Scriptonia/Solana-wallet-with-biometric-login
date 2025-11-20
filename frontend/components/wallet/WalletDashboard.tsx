'use client';

import { useWalletStore, useSafeModeStore } from '@/lib/store';
import { Shield, Wallet, TrendingUp } from 'lucide-react';

export function WalletDashboard() {
  const { publicKey, balance, tokens } = useWalletStore();
  const { enabled: safeModeEnabled, flags } = useSafeModeStore();

  return (
    <div className="space-y-6">
      {/* Safe Mode Status */}
      <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className={`h-6 w-6 ${safeModeEnabled ? 'text-green-500' : 'text-gray-400'}`} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Safe Mode
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {safeModeEnabled
                  ? 'Active - Your transactions are protected'
                  : 'Inactive - Enable for enhanced security'}
              </p>
            </div>
          </div>
          {flags.length > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
              {flags.length} Risk{flags.length > 1 ? 's' : ''} Detected
            </span>
          )}
        </div>
      </div>

      {/* Balance Card */}
      <div className="rounded-lg bg-gradient-to-r from-solana-purple to-solana-green p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Total Balance</p>
            <p className="text-4xl font-bold">{balance.toFixed(4)} SOL</p>
            <p className="mt-2 text-sm opacity-75">
              {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
            </p>
          </div>
          <Wallet className="h-12 w-12 opacity-80" />
        </div>
      </div>

      {/* Tokens */}
      <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          SPL Tokens
        </h2>
        {tokens.length > 0 ? (
          <div className="space-y-2">
            {tokens.map((token, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md border border-gray-200 p-3 dark:border-gray-700"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {token.mint?.slice(0, 8)}...{token.mint?.slice(-8)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Balance: {token.balance || 0}
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-gray-400" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">
            No tokens found
          </p>
        )}
      </div>
    </div>
  );
}



