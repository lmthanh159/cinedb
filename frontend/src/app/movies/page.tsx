'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { MovieGrid } from '@/components/movie/MovieGrid';
import { Pagination } from '@/components/ui';
import { movieApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { MovieQueryParams, MovieSummary } from '@/types';

const CATEGORIES: { value: NonNullable<MovieQueryParams['category']>; label: string }[] = [
  { value: 'popular', label: 'Phổ biến' },
  { value: 'now_playing', label: 'Đang chiếu' },
  { value: 'upcoming', label: 'Sắp chiếu' },
  { value: 'top_rated', label: 'Đánh giá cao' },
];

const PAGE_SIZE = 20;

function MoviesMain() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category =
    (searchParams.get('category') as NonNullable<MovieQueryParams['category']>) ?? 'popular';
  const page = Number(searchParams.get('page') ?? '1');

  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    movieApi
      .getMovies({ category, page, limit: PAGE_SIZE })
      .then((res) => {
        if (!cancelled) {
          setMovies(res.data.data);
          setTotalPages(res.data.meta.totalPages);
        }
      })
      .catch(() => {
        if (!cancelled) setMovies([]);
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
    router.push(`/movies?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Phim</h1>

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

      <MovieGrid movies={movies} isLoading={isLoading} skeletonCount={PAGE_SIZE} />

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

export default function MoviesPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-slate-400">Đang tải...</div>}>
      <MoviesMain />
    </Suspense>
  );
}
