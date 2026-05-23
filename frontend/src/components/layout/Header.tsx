'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Film, LogIn, Menu, X } from 'lucide-react';

import { Avatar, Button, Dropdown } from '@/components/ui';
import type { DropdownItem } from '@/components/ui';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

import { SearchBar } from './SearchBar';

const NAV_LINKS = [
  { label: 'Phim', href: ROUTES.MOVIES },
  { label: 'TV Shows', href: ROUTES.TV },
  { label: 'Diễn viên', href: ROUTES.PEOPLE },
];

export interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userMenuItems = useMemo<DropdownItem[]>(
    () => [
      { label: 'Profile', onClick: () => router.push(ROUTES.PROFILE) },
      { label: 'Watchlist', onClick: () => router.push(ROUTES.WATCHLIST) },
      { label: 'Favorites', onClick: () => router.push(ROUTES.FAVORITES) },
      { label: 'My Ratings', onClick: () => router.push(ROUTES.RATINGS) },
      ...(user?.role === 'ADMIN'
        ? [{ label: 'Admin Dashboard', onClick: () => router.push(ROUTES.ADMIN) }]
        : []),
      { label: 'Sign out', onClick: logout, divider: true },
    ],
    [user?.role, logout, router],
  );

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm',
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-8">
        {/* Logo */}
        <Link href={ROUTES.HOME} className="mr-2 flex flex-shrink-0 items-center gap-2">
          <Film className="h-6 w-6 text-blue-500" />
          <span className="text-lg font-bold text-white">CineDB</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* SearchBar */}
        <div className="hidden max-w-md flex-1 md:block">
          <SearchBar />
        </div>

        {/* Auth section */}
        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated && user ? (
            <Dropdown
              trigger={
                <button
                  aria-label="Open user menu"
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
                </button>
              }
              items={userMenuItems}
              align="right"
            />
          ) : (
            <>
              <Link href={ROUTES.LOGIN}>
                <Button size="sm" leftIcon={<LogIn className="h-4 w-4" />} className="rounded-full bg-blue-500 hover:bg-blue-600">
                  Đăng nhập
                </Button>
              </Link>
              <Link href={ROUTES.REGISTER} className="hidden sm:block">
                <Button variant="ghost" size="sm" className="rounded-full">Đăng ký</Button>
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white md:hidden"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-slate-800 bg-slate-900 px-4 pb-4 md:hidden">
          <div className="pb-2 pt-3">
            <SearchBar />
          </div>
          <nav aria-label="Mobile navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'block rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
