'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useWalletStore, useSafeModeStore } from '@/lib/store';
import { WalletDashboard } from '@/components/wallet/WalletDashboard';
import api from '@/lib/api';
import { PublicKey } from '@solana/web3.js';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { setWallet, setBalance, setTokens } = useWalletStore();
  const { enabled: safeModeEnabled } = useSafeModeStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    // Fetch wallet data
    const fetchWalletData = async () => {
      try {
        const publicKey = new PublicKey(user.solanaPublicKey);
        setWallet(publicKey);

        const balanceResponse = await api.get(`/wallet/balance/${user.solanaPublicKey}`);
        if (balanceResponse.data.success) {
          setBalance(balanceResponse.data.data.sol);
          setTokens(balanceResponse.data.data.tokens || []);
        }
      } catch (error: any) {
        console.error('Error fetching wallet data:', error);
        toast.error('Failed to load wallet data');
      }
    };

    fetchWalletData();
  }, [isAuthenticated, user, router, setWallet, setBalance, setTokens]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Secure Solana Wallet
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Safe Mode: {safeModeEnabled ? 'ON' : 'OFF'}
              </span>
              <button
                onClick={logout}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <WalletDashboard />
      </main>
    </div>
  );
}



