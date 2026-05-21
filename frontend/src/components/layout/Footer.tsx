import Link from 'next/link';
import { Film } from 'lucide-react';

import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface FooterProps {
  className?: string;
}

const FOOTER_LINKS = {
  Browse: [
    { label: 'Movies', href: ROUTES.MOVIES },
    { label: 'TV Shows', href: ROUTES.TV },
    { label: 'People', href: ROUTES.PEOPLE },
    { label: 'Search', href: ROUTES.SEARCH },
  ],
  Account: [
    { label: 'Sign In', href: ROUTES.LOGIN },
    { label: 'Register', href: ROUTES.REGISTER },
    { label: 'Watchlist', href: ROUTES.WATCHLIST },
    { label: 'Favorites', href: ROUTES.FAVORITES },
  ],
};

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn('border-t border-slate-800 bg-slate-900 py-12', className)}>
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-3">
            <Link href={ROUTES.HOME} className="flex items-center gap-2">
              <Film className="h-6 w-6 text-blue-500" />
              <span className="text-lg font-bold text-white">CineDB</span>
            </Link>
            <p className="max-w-xs text-sm text-slate-400">
              Your comprehensive database for movies, TV shows, and the people who make them.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
                {title}
              </h3>
              <ul className="space-y-2">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-slate-400 transition-colors hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} CineDB. All rights reserved. Data sourced from TMDB.
        </div>
      </div>
    </footer>
  );
}
