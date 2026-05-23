'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Film, Mail, XCircle } from 'lucide-react';

import { Button, Input } from '@/components/ui';
import { authApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { toast } from '@/store/toast-store';

const isDev = process.env.NODE_ENV === 'development';

type Status = 'idle' | 'verifying' | 'success' | 'error';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const emailFromRegister = searchParams.get('email');

  const [status, setStatus] = useState<Status>('idle');
  const [manualToken, setManualToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const verify = async (token: string) => {
    setStatus('verifying');
    setErrorMsg('');
    try {
      await authApi.verifyEmail(token);
      setStatus('success');
      toast.success('Email đã xác thực thành công!');
      setTimeout(() => router.push(ROUTES.LOGIN), 3000);
    } catch {
      setStatus('error');
      setErrorMsg('Token không hợp lệ hoặc đã hết hạn.');
    }
  };

  // Auto-verify when token is in the URL (production email link)
  useEffect(() => {
    if (tokenFromUrl) {
      void verify(tokenFromUrl);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Success state ──────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl bg-slate-800 p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
          <h1 className="mb-2 text-xl font-bold text-white">Xác thực thành công!</h1>
          <p className="mb-4 text-slate-400">
            Email đã xác thực. Đang chuyển hướng đến trang đăng nhập…
          </p>
          <Link
            href={ROUTES.LOGIN}
            className="text-sm text-blue-400 transition-colors hover:text-blue-300"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  // ── Auto-verify in progress (token from URL) ───────────────────────────────
  if (tokenFromUrl && status === 'verifying') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl bg-slate-800 p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 h-14 w-14 animate-pulse rounded-full bg-slate-700" />
          <p className="text-slate-400">Đang xác thực email…</p>
        </div>
      </div>
    );
  }

  // ── Error from auto-verify ─────────────────────────────────────────────────
  if (tokenFromUrl && status === 'error') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl bg-slate-800 p-8 text-center shadow-xl">
          <XCircle className="mx-auto mb-4 h-14 w-14 text-red-500" />
          <h1 className="mb-2 text-xl font-bold text-white">Xác thực thất bại</h1>
          <p className="mb-6 text-slate-400">{errorMsg}</p>
          <Link
            href={ROUTES.LOGIN}
            className="text-sm text-blue-400 transition-colors hover:text-blue-300"
          >
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  // ── Main state: came from register flow ────────────────────────────────────
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Link href={ROUTES.HOME} className="flex items-center gap-2">
            <Film className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">CineDB</span>
          </Link>
        </div>

        <div className="rounded-xl bg-slate-800 p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Mail className="h-12 w-12 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Xác thực email</h1>
            <p className="text-sm text-slate-400">
              Tài khoản đã được tạo thành công! Vui lòng xác thực email để đăng nhập.
            </p>
            {emailFromRegister && (
              <p className="text-sm text-slate-300">
                Email:{' '}
                <span className="font-medium text-white">
                  {decodeURIComponent(emailFromRegister)}
                </span>
              </p>
            )}
          </div>

          {/* Dev mode hint */}
          {isDev && (
            <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="mb-2 text-sm font-medium text-amber-400">⚠️ Chế độ Development</p>
              <p className="text-sm text-slate-300">
                Backend không gửi email thật. Kiểm tra terminal backend để lấy verification
                token, sau đó dán vào ô bên dưới.
              </p>
            </div>
          )}

          {/* Manual token input (always in dev, hidden in prod) */}
          {isDev && (
            <div className="space-y-3">
              <Input
                label="Dán verification token"
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="eyJ..."
              />
              {errorMsg && (
                <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
                  {errorMsg}
                </p>
              )}
              <Button
                className="w-full"
                onClick={() => verify(manualToken.trim())}
                disabled={!manualToken.trim()}
                isLoading={status === 'verifying'}
              >
                Xác thực
              </Button>
            </div>
          )}

          {/* Production message */}
          {!isDev && (
            <p className="text-center text-sm text-slate-400">
              Kiểm tra hộp thư email của bạn và click vào link xác thực.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Đã xác thực?{' '}
          <Link
            href={ROUTES.LOGIN}
            className="text-blue-400 transition-colors hover:text-blue-300 hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-4rem)]" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
