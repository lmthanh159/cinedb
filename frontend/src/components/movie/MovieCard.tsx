'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, Heart } from 'lucide-react';

import { RatingCircle } from '@/components/ui/StarRating';
import { ROUTES } from '@/lib/constants';
import { cn, formatYear, getImageUrl } from '@/lib/utils';
import type { MovieSummary } from '@/types';

export interface MovieCardProps {
  movie: MovieSummary;
  onWatchlist?: (id: number) => void;
  onFavorite?: (id: number) => void;
  className?: string;
}

export function MovieCard({ movie, onWatchlist, onFavorite, className }: MovieCardProps) {
  const hasActions = onWatchlist ?? onFavorite;

  return (
    <Link href={ROUTES.MOVIE(movie.id)} className={cn('group relative block', className)}>
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-800">
        <Image
          src={getImageUrl(movie.posterUrl, 'w342')}
          alt={movie.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        {/* Rating circle — always visible, bottom-left */}
        <div className="absolute bottom-2 left-2">
          <RatingCircle value={movie.voteAverage} size={40} />
        </div>

        {/* Action buttons — appear on hover, bottom-right */}
        {hasActions && (
          <div className="absolute bottom-2 right-2 flex flex-col gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {onWatchlist && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onWatchlist(movie.id);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-slate-300 transition-colors hover:bg-blue-500 hover:text-white"
                aria-label="Add to watchlist"
              >
                <Bookmark className="h-4 w-4" />
              </button>
            )}
            {onFavorite && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFavorite(movie.id);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-slate-300 transition-colors hover:bg-red-500 hover:text-white"
                aria-label="Add to favorites"
              >
                <Heart className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Text info */}
      <div className="mt-2 space-y-0.5">
        <p className="line-clamp-1 text-sm font-medium text-white transition-colors group-hover:text-blue-400">
          {movie.title}
        </p>
        <p className="text-xs text-slate-400">{formatYear(movie.releaseDate)}</p>
      </div>
    </Link>
  );
}
