'use client';

import { useEffect } from 'react';

import { useAuthStore } from '@/store/auth-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) return;

    useAuthStore.setState({ isLoading: true });
    useAuthStore
      .getState()
      .refreshAccessToken()
      .then(() => useAuthStore.getState().fetchUser())
      .catch(() => {
        useAuthStore.getState().logout();
        useAuthStore.setState({ isLoading: false });
      });
  }, []);

  return <>{children}</>;
}
