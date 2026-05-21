'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Film, LogIn } from 'lucide-react';

import { Button, Input } from '@/components/ui';
import { ROUTES } from '@/lib/constants';
import { toast } from '@/store/toast-store';
import { useAuthStore } from '@/store/auth-store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const e = error as { response?: { data?: { message?: string } } };
    const msg = e.response?.data?.message;
    if (typeof msg === 'string') return msg;
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

// ─── LoginContent (uses useSearchParams) ─────────────────────────────────────

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? ROUTES.HOME;
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Địa chỉ email không hợp lệ.');
      return;
    }

    try {
      await login({ email: email.trim(), password });
      toast.success('Đăng nhập thành công!');
      router.push(redirect);
    } catch (err) {
      setError(getApiError(err));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Link href={ROUTES.HOME} className="flex items-center gap-2">
            <Film className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">CineDB</span>
          </Link>
          <p className="text-slate-400">Đăng nhập vào tài khoản của bạn</p>
        </div>

        <div className="rounded-xl bg-slate-800 p-8 shadow-xl">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
            <Input
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            {error && (
              <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Link
                href={ROUTES.FORGOT_PASSWORD}
                className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              leftIcon={<LogIn className="h-4 w-4" />}
            >
              Đăng nhập
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-slate-700" />
            <span className="text-xs text-slate-500">hoặc tiếp tục với</span>
            <div className="flex-1 border-t border-slate-700" />
          </div>

          {/* Social login */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => toast.info('Tính năng sắp ra mắt!')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => toast.info('Tính năng sắp ra mắt!')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#1877F2]" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Chưa có tài khoản?{' '}
          <Link href={ROUTES.REGISTER} className="text-blue-400 hover:text-blue-300 hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-4rem)]" />}>
      <LoginContent />
    </Suspense>
  );
}
