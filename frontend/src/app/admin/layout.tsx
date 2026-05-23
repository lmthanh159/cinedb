'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Database, Film, LayoutDashboard, MessageSquare, ShieldAlert, Tag, Tv, User2, Users } from 'lucide-react';

import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Người dùng', href: '/admin/users', icon: Users },
  { label: 'Bình luận', href: '/admin/comments', icon: MessageSquare },
  { label: 'Phim', href: '/admin/movies', icon: Film },
  { label: 'TV Series', href: '/admin/tv', icon: Tv },
  { label: 'Diễn viên', href: '/admin/people', icon: User2 },
  { label: 'Thể loại', href: '/admin/genres', icon: Tag },
  { label: 'TMDB Sync', href: '/admin/tmdb', icon: Database },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, authInitialized, isLoading } = useAuthStore();

  useEffect(() => {
    if (!authInitialized || isLoading) return;
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [authInitialized, isAuthenticated, isLoading, user, router]);

  if (!authInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900">
        <ShieldAlert className="h-16 w-16 text-red-500" />
        <p className="text-lg font-semibold text-white">Không có quyền truy cập</p>
        <p className="text-slate-400">Trang này chỉ dành cho quản trị viên.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block lg:w-[220px] lg:flex-shrink-0">
            <div className="mb-4 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Quản trị
              </span>
            </div>
            <nav className="sticky top-24 space-y-1" aria-label="Admin navigation">
              {NAV.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === href
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Mobile horizontal tab bar */}
          <div className="border-b border-slate-800 lg:hidden">
            <nav className="-mb-px flex overflow-x-auto" aria-label="Admin navigation">
              {NAV.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex flex-shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                    pathname === href
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Page content */}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
