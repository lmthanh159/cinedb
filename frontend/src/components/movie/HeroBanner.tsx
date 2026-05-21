'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';

import { Badge, Button } from '@/components/ui';
import { RatingCircle } from '@/components/ui/StarRating';
import { ROUTES } from '@/lib/constants';
import { cn, formatYear, getImageUrl } from '@/lib/utils';
import type { TrendingItem } from '@/types';

export interface HeroBannerProps {
  items: TrendingItem[];
}

const AUTO_ROTATE_MS = 8000;

export function HeroBanner({ items }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(
    () => setCurrent((i) => (i + 1) % items.length),
    [items.length],
  );
  const prev = useCallback(
    () => setCurrent((i) => (i - 1 + items.length) % items.length),
    [items.length],
  );

  useEffect(() => {
    if (isPaused || items.length <= 1) return;
    const id = setInterval(next, AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [isPaused, items.length, next]);

  if (!items.length) return null;

  const item = items[Math.min(current, items.length - 1)];
  const href =
    item.mediaType === 'movie' ? ROUTES.MOVIE(item.id) : ROUTES.TV_SHOW(item.id);
  const year = formatYear(item.releaseDate ?? item.firstAirDate);

  return (
    <section
      className="relative h-[300px] overflow-hidden md:h-[500px] lg:h-[600px]"
      aria-label="Featured content"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Backdrop images — all rendered, cross-fade via opacity */}
      {items.map((it, i) => (
        <div
          key={it.id}
          className={cn(
            'absolute inset-0 transition-opacity duration-700',
            i === current ? 'opacity-100' : 'opacity-0',
          )}
        >
          {it.backdropUrl && (
            <Image
              src={getImageUrl(it.backdropUrl, 'w1280')}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover object-center"
              aria-hidden="true"
            />
          )}
        </div>
      ))}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 md:px-8 md:pb-10 lg:pb-14">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl space-y-3">
            {item.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.genres.slice(0, 3).map((g) => (
                  <Badge key={g.id} variant="genre">
                    {g.name}
                  </Badge>
                ))}
              </div>
            )}

            <h2 className="line-clamp-2 text-2xl font-bold text-white md:text-4xl lg:text-5xl">
              {item.title}
            </h2>

            <div className="flex items-center gap-4 text-sm text-slate-300">
              {year && <span>{year}</span>}
              <RatingCircle value={item.voteAverage} size={44} />
            </div>

            <div className="pt-1">
              <Link href={href}>
                <Button leftIcon={<Info className="h-4 w-4" />} size="lg">
                  Xem chi tiết
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Prev / Next (desktop) */}
      {items.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60 md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60 md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5 md:bottom-5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === current ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/50 hover:bg-white/80',
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
