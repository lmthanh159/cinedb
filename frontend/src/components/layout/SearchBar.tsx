'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

import { searchApi } from '@/lib/api';
import { API_DEFAULTS, ROUTES } from '@/lib/constants';
import { cn, getImageUrl } from '@/lib/utils';
import type { AutocompleteResult } from '@/types';

export interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchResults = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    try {
      const res = await searchApi.autocomplete(q, API_DEFAULTS.AUTOCOMPLETE_LIMIT);
      setResults(res.data.data);
      setIsOpen(true);
    } catch (err) {
      if ((err as { name?: string }).name !== 'CanceledError') {
        setResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), API_DEFAULTS.SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchResults]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        e.target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const goToSearch = () => {
    if (!query.trim()) return;
    setIsOpen(false);
    router.push(`${ROUTES.SEARCH}?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToSearch();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    abortRef.current?.abort();
    inputRef.current?.focus();
  };

  const getResultHref = (item: AutocompleteResult) => {
    if (item.mediaType === 'movie') return ROUTES.MOVIE(item.id);
    if (item.mediaType === 'tv') return ROUTES.TV_SHOW(item.id);
    return ROUTES.PERSON(item.id);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit} role="search">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder="Search movies, TV shows, people..."
            aria-label="Search"
            autoComplete="off"
            className="w-full rounded-full bg-slate-800 py-2 pl-9 pr-8 text-sm text-white placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-500"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="absolute right-3 text-slate-400 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {isOpen && (
        <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-3">
                  <div className="h-12 w-8 flex-shrink-0 rounded bg-slate-700" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-2/3 rounded bg-slate-700" />
                    <div className="h-3 w-1/3 rounded bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <ul role="list" aria-label="Search suggestions">
              {results.map((item) => (
                <li key={`${item.mediaType}-${item.id}`} role="listitem">
                  <Link
                    href={getResultHref(item)}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-slate-700"
                  >
                    <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-slate-700">
                      {(item.posterUrl ?? item.profileUrl) ? (
                        <Image
                          src={getImageUrl(item.posterUrl ?? item.profileUrl, 'w92')}
                          alt={item.text}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-500">
                          <Search className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium text-white">{item.text}</p>
                      <p className="text-xs capitalize text-slate-400">{item.mediaType}</p>
                    </div>
                  </Link>
                </li>
              ))}
              <li role="listitem" className="border-t border-slate-700">
                <button
                  onClick={goToSearch}
                  className="w-full px-3 py-2 text-left text-sm text-blue-400 transition-colors hover:bg-slate-700 hover:text-blue-300"
                >
                  See all results for &quot;{query}&quot;
                </button>
              </li>
            </ul>
          ) : (
            <p className="px-3 py-4 text-center text-sm text-slate-400">No results found</p>
          )}
        </div>
      )}
    </div>
  );
}
