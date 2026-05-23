'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { RatingCircle } from '@/components/ui/StarRating';
import { Pagination } from '@/components/ui';
import { GridSkeleton } from '@/components/ui/Skeleton';
import { tvApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { cn, formatYear, getImageUrl } from '@/lib/utils';
import type { TvQueryParams, TvSummary } from '@/types';

const CATEGORIES: { value: NonNullable<TvQueryParams['category']>; label: string }[] = [
  { value: 'popular', label: 'Phổ biến' },
  { value: 'now_playing', label: 'Đang chiếu' },
  { value: 'top_rated', label: 'Đánh giá cao' },
];

const PAGE_SIZE = 20;

function TvCard({ tv }: { tv: TvSummary }) {
  return (
    <Link href={ROUTES.TV_SHOW(tv.id)} className="group relative block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-800 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-black/60">
        <Image
          src={getImageUrl(tv.posterUrl, 'w342')}
          alt={tv.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <div className="absolute right-2 top-2">
          <RatingCircle
            value={tv.voteAverage}
            tmdbValue={tv.tmdbVoteAverage}
            size={32}
            className="ring-2 ring-slate-900"
          />
        </div>
      </div>
      <div className="mt-2 space-y-0.5">
        <p className="line-clamp-1 text-sm font-medium text-white transition-colors group-hover:text-blue-400">
          {tv.title}
        </p>
        <p className="text-xs text-slate-500">{formatYear(tv.firstAirDate)}</p>
      </div>
    </Link>
  );
}

function TvGrid({ shows, isLoading }: { shows: TvSummary[]; isLoading: boolean }) {
  if (isLoading) return <GridSkeleton count={PAGE_SIZE} />;
  if (shows.length === 0) {
    return <p className="py-12 text-center text-slate-400">Không tìm thấy kết quả.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {shows.map((tv) => (
        <TvCard key={tv.id} tv={tv} />
      ))}
    </div>
  );
}

function TvMain() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category =
    (searchParams.get('category') as NonNullable<TvQueryParams['category']>) ?? 'popular';
  const page = Number(searchParams.get('page') ?? '1');

  const [shows, setShows] = useState<TvSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    tvApi
      .getTvShows({ category, page, limit: PAGE_SIZE })
      .then((res) => {
        if (!cancelled) {
          setShows(res.data.data);
          setTotalPages(res.data.meta.totalPages);
        }
      })
      .catch(() => {
        if (!cancelled) setShows([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, page]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`/tv?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="mb-6 text-2xl font-bold text-white">TV Shows</h1>

      {/* Category tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => updateParams({ category: cat.value, page: '1' })}
            className={cn(
              'flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              category === cat.value
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <TvGrid shows={shows} isLoading={isLoading} />

      <div className="mt-8">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => updateParams({ page: String(p) })}
        />
      </div>
    </div>
  );
}

export default function TvPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-slate-400">Đang tải...</div>}>
      <TvMain />
    </Suspense>
  );
}
