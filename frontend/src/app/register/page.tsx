'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Film } from 'lucide-react';

import { Button, Input } from '@/components/ui';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

// ─── Password strength ────────────────────────────────────────────────────────

interface PasswordRule {
  label: string;
  test: (p: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: '8+ ký tự', test: (p) => p.length >= 8 },
  { label: 'Chữ hoa (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'Chữ thường (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'Chữ số (0-9)', test: (p) => /[0-9]/.test(p) },
  { label: 'Ký tự đặc biệt (!@#…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 2) return 1;
  if (passed <= 3) return 2;
  return 3;
}

const STRENGTH_CONFIG = {
  0: { label: '', bars: 0, color: '' },
  1: { label: 'Yếu', bars: 1, color: 'bg-red-500' },
  2: { label: 'Trung bình', bars: 2, color: 'bg-amber-500' },
  3: { label: 'Mạnh', bars: 3, color: 'bg-emerald-500' },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const e = error as { response?: { data?: { message?: string } } };
    const msg = e.response?.data?.message;
    if (typeof msg === 'string') return msg;
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const strength = getStrength(password);
  const { label: strengthLabel, bars: strengthBars, color: strengthColor } = STRENGTH_CONFIG[strength];

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim() || !email.trim() || !password || !confirm) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Địa chỉ email không hợp lệ.');
      return;
    }
    if (strength < 2) {
      setError('Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      await register({ displayName: displayName.trim(), email: email.trim(), password });
      router.push(`${ROUTES.VERIFY_EMAIL}?email=${encodeURIComponent(email.trim())}`);
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
          <p className="text-slate-400">Tạo tài khoản mới</p>
        </div>

        <div className="rounded-xl bg-slate-800 p-8 shadow-xl">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              label="Tên hiển thị"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tên của bạn"
              autoComplete="name"
              autoFocus
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />

            {/* Password + strength */}
            <div className="space-y-2">
              <Input
                label="Mật khẩu"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {password && (
                <>
                  {/* Strength bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3].map((bar) => (
                        <div
                          key={bar}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-colors',
                            bar <= strengthBars ? strengthColor : 'bg-slate-700',
                          )}
                        />
                      ))}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        strength === 1 && 'text-red-400',
                        strength === 2 && 'text-amber-400',
                        strength === 3 && 'text-emerald-400',
                      )}
                    >
                      {strengthLabel}
                    </span>
                  </div>

                  {/* Password rules checklist */}
                  <ul className="space-y-1">
                    {PASSWORD_RULES.map((rule) => {
                      const passed = rule.test(password);
                      return (
                        <li key={rule.label} className="flex items-center gap-1.5 text-xs">
                          {passed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-slate-600" />
                          )}
                          <span className={passed ? 'text-emerald-400' : 'text-slate-500'}>
                            {rule.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            <Input
              label="Xác nhận mật khẩu"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              error={confirm && confirm !== password ? 'Mật khẩu không khớp' : undefined}
            />

            {error && (
              <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Tạo tài khoản
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Đã có tài khoản?{' '}
          <Link href={ROUTES.LOGIN} className="text-blue-400 hover:text-blue-300 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
