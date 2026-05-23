'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { MovieCardSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { MovieSummary } from '@/types';

import { MovieCard } from './MovieCard';

export interface MovieCarouselProps {
  title: string;
  movies: MovieSummary[];
  mediaType?: 'movie' | 'tv';
  viewAllLink?: string;
  isLoading?: boolean;
  skeletonCount?: number;
  onWatchlist?: (id: number) => void;
  onFavorite?: (id: number) => void;
  className?: string;
}

export function MovieCarousel({
  title,
  movies,
  mediaType = 'movie',
  viewAllLink,
  isLoading,
  skeletonCount = 6,
  onWatchlist,
  onFavorite,
  className,
}: MovieCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: dir === 'right' ? amount : -amount,
      behavior: 'smooth',
    });
  };

  return (
    <section className={cn('space-y-4', className)} aria-label={title}>
      {/* Header row */}
      <div className="flex items-center justify-between px-4 md:px-0">
        <h2 className="text-xl font-bold text-white">{title}</h2>

        <div className="flex items-center gap-2">
          {viewAllLink && (
            <Link
              href={viewAllLink}
              className="text-sm text-blue-400 transition-colors hover:text-blue-300"
            >
              Xem tất cả
            </Link>
          )}

          {/* Arrow buttons — desktop only */}
          <div className="hidden gap-1 md:flex">
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {isLoading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={i} className="w-[120px] flex-shrink-0 snap-start">
                <MovieCardSkeleton />
              </div>
            ))
          : movies.map((movie) => (
              <div key={movie.id} className="w-[120px] flex-shrink-0 snap-start">
                <MovieCard
                  movie={movie}
                  mediaType={mediaType}
                  onWatchlist={onWatchlist}
                  onFavorite={onFavorite}
                />
              </div>
            ))}
      </div>
    </section>
  );
}
