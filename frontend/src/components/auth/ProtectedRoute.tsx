'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { MovieDetailSkeleton } from '@/components/ui';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, authInitialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait until the initial token-refresh check is done before deciding to redirect.
    // Without this guard, the redirect fires immediately on first render when
    // isAuthenticated is still false (state not yet hydrated from the refresh flow).
    if (!authInitialized || isLoading) return;
    if (!isAuthenticated) {
      router.push(`${ROUTES.LOGIN}?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [authInitialized, isAuthenticated, isLoading, router, pathname]);

  if (!authInitialized || isLoading) return <MovieDetailSkeleton />;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
