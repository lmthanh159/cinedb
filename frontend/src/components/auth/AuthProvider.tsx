'use client';

import { useEffect } from 'react';

import { useAuthStore } from '@/store/auth-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const { refreshToken, setAuthInitialized } = useAuthStore.getState();

    if (!refreshToken) {
      // No token stored — auth check is done, user is not logged in
      setAuthInitialized();
      return;
    }

    useAuthStore.setState({ isLoading: true });
    useAuthStore
      .getState()
      .refreshAccessToken()
      .then(() => useAuthStore.getState().fetchUser())
      .catch(() => {
        useAuthStore.getState().logout();
      })
      .finally(() => {
        useAuthStore.setState({ isLoading: false });
        useAuthStore.getState().setAuthInitialized();
      });
  }, []);

  return <>{children}</>;
}
