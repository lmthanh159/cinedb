'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, fetchUser } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const rawRedirect = searchParams.get('redirect');
    const redirect =
      rawRedirect && rawRedirect.startsWith('/') ? rawRedirect : ROUTES.HOME;

    if (!accessToken || !refreshToken) {
      router.replace(ROUTES.LOGIN);
      return;
    }

    setTokens(accessToken, refreshToken);
    fetchUser()
      .then(() => router.replace(redirect))
      .catch(() => router.replace(ROUTES.LOGIN));
  }, [searchParams, setTokens, fetchUser, router]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
        <p className="text-slate-400">Đang xác thực...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
