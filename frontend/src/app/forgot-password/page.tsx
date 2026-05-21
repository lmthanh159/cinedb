'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Film, MailCheck } from 'lucide-react';

import { Button, Input } from '@/components/ui';
import { authApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;

    setIsLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
    } catch {
      // Intentionally silent — always show the success message to avoid email enumeration
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl bg-slate-800 p-8 text-center shadow-xl">
          <MailCheck className="mx-auto mb-4 h-16 w-16 text-blue-400" />
          <h2 className="mb-2 text-xl font-bold text-white">Kiểm tra email của bạn</h2>
          <p className="mb-6 text-slate-400">
            Nếu email <span className="text-white">{email}</span> tồn tại trong hệ thống, chúng tôi
            đã gửi link đặt lại mật khẩu đến hộp thư của bạn.
          </p>
          <Link href={ROUTES.LOGIN}>
            <Button className="w-full">Quay lại đăng nhập</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Link href={ROUTES.HOME} className="flex items-center gap-2">
            <Film className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">CineDB</span>
          </Link>
          <p className="text-slate-400">Đặt lại mật khẩu</p>
        </div>

        <div className="rounded-xl bg-slate-800 p-8 shadow-xl">
          <p className="mb-6 text-sm text-slate-400">
            Nhập email đã đăng ký để nhận link đặt lại mật khẩu.
          </p>
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
            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Gửi link đặt lại
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Nhớ mật khẩu rồi?{' '}
          <Link href={ROUTES.LOGIN} className="text-blue-400 hover:text-blue-300 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
