'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import { ListSkeleton, Pagination } from '@/components/ui';
import { searchApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { cn, getImageUrl } from '@/lib/utils';
import { MEDIA_TYPE } from '@/types';
import type { SearchResult } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const TABS = [
  { id: 'all' as const, label: 'Tất cả' },
  { id: 'movie' as const, label: 'Phim' },
  { id: 'tv' as const, label: 'TV Shows' },
  { id: 'person' as const, label: 'Diễn viên' },
];

type TabId = (typeof TABS)[number]['id'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getResultHref(result: SearchResult): string {
  if (result.mediaType === MEDIA_TYPE.TV) return ROUTES.TV_SHOW(result.id);
  if (result.mediaType === MEDIA_TYPE.PERSON) return ROUTES.PERSON(result.id);
  return ROUTES.MOVIE(result.id);
}

const MEDIA_TYPE_CONFIG = {
  movie: { label: 'Phim', className: 'bg-blue-500/20 text-blue-400' },
  tv: { label: 'TV', className: 'bg-purple-500/20 text-purple-400' },
  person: { label: 'Người', className: 'bg-emerald-500/20 text-emerald-400' },
} as const;

// ─── SearchResultItem (list layout) ──────────────────────────────────────────

function SearchResultItem({ result }: { result: SearchResult }) {
  const href = getResultHref(result);
  const isPerson = result.mediaType === MEDIA_TYPE.PERSON;
  const imagePath = isPerson ? result.profileUrl : result.posterUrl;
  const { label, className: badgeClass } = MEDIA_TYPE_CONFIG[result.mediaType];

  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-lg bg-slate-800 p-3 transition-colors hover:bg-slate-700"
    >
      {/* Thumbnail */}
      <div
        className={cn(
          'relative flex-shrink-0 overflow-hidden bg-slate-700',
          isPerson ? 'h-16 w-16 rounded-full' : 'h-[138px] w-[92px] rounded-md',
        )}
      >
        <Image
          src={getImageUrl(imagePath, isPerson ? 'w185' : 'w92')}
          alt={result.title}
          fill
          sizes={isPerson ? '64px' : '92px'}
          className="object-cover"
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 py-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-white">{result.title}</span>
          <span
            className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badgeClass)}
          >
            {label}
          </span>
        </div>
        {result.year != null && (
          <p className="mt-1 text-sm text-slate-400">{result.year}</p>
        )}
        {result.voteAverage != null && result.voteAverage > 0 && (
          <p className="mt-1 text-sm text-amber-400">{result.voteAverage.toFixed(1)} / 10</p>
        )}
      </div>
    </Link>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Search className="h-12 w-12 text-slate-600" />
      <p className="text-slate-400">
        Không tìm thấy kết quả cho{' '}
        <span className="text-white">{'"'}{query}{'"'}</span>. Thử từ khóa khác?
      </p>
    </div>
  );
}

// ─── SearchContent ────────────────────────────────────────────────────────────

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams.get('query') ?? '';
  const activeTab = (searchParams.get('type') ?? 'all') as TabId;
  const page = Number(searchParams.get('page') ?? '1');

  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(Boolean(query.trim()));

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`${ROUTES.SEARCH}?${params.toString()}`);
  };

  useEffect(() => {
    if (!query.trim()) return;

    let cancelled = false;

    const p = { page, limit: PAGE_SIZE };
    const req =
      activeTab === 'movie' ? searchApi.searchMovies(query, p)
      : activeTab === 'tv' ? searchApi.searchTv(query, p)
      : activeTab === 'person' ? searchApi.searchPeople(query, p)
      : searchApi.multiSearch(query, p);

    req
      .then((res) => {
        if (!cancelled) {
          setResults(res.data.data);
          setTotal(res.data.meta.total);
          setTotalPages(res.data.meta.totalPages);
        }
      })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [query, activeTab, page]);

  if (!query.trim()) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Search className="h-16 w-16 text-slate-600" />
        <p className="text-slate-400">
          Nhập từ khóa để tìm kiếm phim, TV shows, diễn viên...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="mb-6 text-2xl font-bold text-white">
        Kết quả cho{' '}
        <span className="text-blue-400">{'"'}{query}{'"'}</span>
      </h1>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => updateParams({ type: tab.id, page: '1' })}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <ListSkeleton count={5} />
      ) : results.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">
            {total.toLocaleString('vi-VN')} kết quả
          </p>
          <div className="space-y-3">
            {results.map((result) => (
              <SearchResultItem
                key={`${result.mediaType}-${result.id}`}
                result={result}
              />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => updateParams({ page: String(p) })}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
          <ListSkeleton count={5} />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
