'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { MovieDetailSkeleton } from '@/components/ui';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`${ROUTES.LOGIN}?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) return <MovieDetailSkeleton />;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
