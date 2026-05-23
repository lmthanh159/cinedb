'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Film, Info, Play } from 'lucide-react';

import { Button } from '@/components/ui';
import { RatingCircle } from '@/components/ui/StarRating';
import { ROUTES } from '@/lib/constants';
import { cn, formatRuntime, formatYear, getImageUrl } from '@/lib/utils';
import type { TrendingItem } from '@/types';

export interface HeroBannerProps {
  items: TrendingItem[];
}

const AUTO_ROTATE_MS = 5000;

export function HeroBanner({ items }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(
    () => setCurrent((i) => (i + 1) % items.length),
    [items.length],
  );

  useEffect(() => {
    if (isPaused || items.length <= 1) return;
    const id = setInterval(next, AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [isPaused, items.length, next]);

  if (!items.length) return null;

  const item = items[Math.min(current, items.length - 1)];
  const href = item.mediaType === 'movie' ? ROUTES.MOVIE(item.id) : ROUTES.TV_SHOW(item.id);
  const year = formatYear(item.releaseDate ?? item.firstAirDate);

  return (
    <section
      className="relative h-[420px] overflow-hidden md:h-[560px]"
      aria-label="Featured content"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Backdrop images — cross-fade via opacity */}
      {items.map((it, i) => (
        <div
          key={it.id}
          className={cn(
            'absolute inset-0 transition-opacity duration-700',
            i === current ? 'opacity-100' : 'opacity-0',
          )}
        >
          {it.backdropUrl ? (
            <Image
              src={getImageUrl(it.backdropUrl, 'w1280')}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover object-top"
              aria-hidden="true"
            />
          ) : (
            <div className="absolute inset-0 bg-slate-800" />
          )}
        </div>
      ))}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end pb-8 md:items-center md:pb-0">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
          <div className="flex items-end gap-6 md:items-center md:gap-8">

            {/* Poster — desktop only */}
            <div className="hidden flex-shrink-0 md:block">
              <div className="relative h-[240px] w-[160px] overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10">
                {item.posterUrl ? (
                  <Image
                    src={getImageUrl(item.posterUrl, 'w342')}
                    alt={item.title}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-700">
                    <Film className="h-12 w-12 text-slate-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="max-w-xl space-y-3">
              {/* Genre badges */}
              {item.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.genres.slice(0, 3).map((g) => (
                    <span
                      key={g.id}
                      className="rounded-full bg-blue-500/20 px-3 py-0.5 text-xs font-medium text-blue-400"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h2 className="line-clamp-2 text-2xl font-bold text-white md:text-4xl lg:text-5xl">
                {item.title}
              </h2>

              {/* Meta: year + runtime + rating */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                {year && <span>{year}</span>}
                {item.runtime != null && item.runtime > 0 && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span>{formatRuntime(item.runtime)}</span>
                  </>
                )}
                <RatingCircle value={item.voteAverage} size={40} />
              </div>

              {/* Overview */}
              {item.overview && (
                <p className="line-clamp-3 text-sm leading-relaxed text-slate-300 md:text-base">
                  {item.overview}
                </p>
              )}

              {/* Buttons */}
              <div className="flex flex-wrap gap-3 pt-1">
                <Link href={href}>
                  <Button
                    leftIcon={<Play className="h-4 w-4 fill-current" />}
                    size="lg"
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    Xem trailer
                  </Button>
                </Link>
                <Link href={href}>
                  <Button
                    variant="secondary"
                    leftIcon={<Info className="h-4 w-4" />}
                    size="lg"
                  >
                    Chi tiết
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === current ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/40 hover:bg-white/70',
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
