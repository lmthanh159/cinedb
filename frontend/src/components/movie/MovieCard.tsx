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
  mediaType?: 'movie' | 'tv';
  onWatchlist?: (id: number) => void;
  onFavorite?: (id: number) => void;
  className?: string;
}

export function MovieCard({ movie, mediaType = 'movie', onWatchlist, onFavorite, className }: MovieCardProps) {
  const hasActions = onWatchlist ?? onFavorite;
  const href = mediaType === 'tv' ? ROUTES.TV_SHOW(movie.id) : ROUTES.MOVIE(movie.id);

  return (
    <Link href={href} className={cn('group relative block', className)}>
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-800 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-black/60">
        <Image
          src={getImageUrl(movie.posterUrl, 'w342')}
          alt={movie.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        {/* Rating badge — top-right */}
        <div className="absolute right-2 top-2">
          <RatingCircle
            value={movie.voteAverage}
            tmdbValue={movie.tmdbVoteAverage}
            size={32}
            className="ring-2 ring-slate-900"
          />
        </div>

        {/* Action buttons — appear on hover */}
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
        <p className="text-xs text-slate-500">{formatYear(movie.releaseDate)}</p>
      </div>
    </Link>
  );
}
