'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Bookmark, Heart, Star, User } from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Hồ sơ', href: ROUTES.PROFILE, icon: User },
  { label: 'Watchlist', href: ROUTES.WATCHLIST, icon: Bookmark },
  { label: 'Yêu thích', href: ROUTES.FAVORITES, icon: Heart },
  { label: 'Đánh giá', href: ROUTES.RATINGS, icon: Star },
  { label: 'Hoạt động', href: ROUTES.ACTIVITY, icon: Activity },
] as const;

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block lg:w-[220px] lg:flex-shrink-0">
              <nav className="sticky top-24 space-y-1" aria-label="User navigation">
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
              <nav className="-mb-px flex overflow-x-auto scrollbar-hide" aria-label="User navigation">
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
    </ProtectedRoute>
  );
}
