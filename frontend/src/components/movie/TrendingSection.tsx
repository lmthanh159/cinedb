'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { MovieSummary } from '@/types';

import { MovieCard } from './MovieCard';

export interface TrendingSectionProps {
  trendingDay: MovieSummary[];
  trendingWeek: MovieSummary[];
}

export function TrendingSection({ trendingDay, trendingWeek }: TrendingSectionProps) {
  const [period, setPeriod] = useState<'day' | 'week'>('day');
  const scrollRef = useRef<HTMLDivElement>(null);

  const movies = period === 'day' ? trendingDay : trendingWeek;

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  if (!movies.length) return null;

  return (
    <section className="space-y-4" aria-label="Trending">
      <div className="flex items-center justify-between px-4 md:px-0">
        {/* Title + toggle */}
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Trending</h2>
          <div className="flex rounded-full border border-slate-700 bg-slate-800 p-0.5">
            <button
              onClick={() => setPeriod('day')}
              className={cn(
                'rounded-full px-3 py-0.5 text-sm font-medium transition-all',
                period === 'day' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white',
              )}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={cn(
                'rounded-full px-3 py-0.5 text-sm font-medium transition-all',
                period === 'week' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white',
              )}
            >
              Tuần này
            </button>
          </div>
        </div>

        {/* See all + arrows */}
        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.MOVIES}
            className="text-sm text-blue-400 transition-colors hover:text-blue-300"
          >
            See All
          </Link>
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
        {movies.map((movie) => (
          <div key={movie.id} className="w-[160px] flex-shrink-0 snap-start">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </section>
  );
}
