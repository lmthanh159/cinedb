'use client';

import Image from 'next/image';
import { Bookmark, Heart, Play, Star } from 'lucide-react';

import { Badge, Button } from '@/components/ui';
import { RatingCircle } from '@/components/ui/StarRating';
import { cn, formatRuntime, formatYear, getImageUrl } from '@/lib/utils';
import type { MovieDetail } from '@/types';

export interface MovieHeroProps {
  movie: MovieDetail;
  onRate?: () => void;
  onWatchlist?: () => void;
  onFavorite?: () => void;
  onWatchTrailer?: () => void;
  className?: string;
}

export function MovieHero({
  movie,
  onRate,
  onWatchlist,
  onFavorite,
  onWatchTrailer,
  className,
}: MovieHeroProps) {
  const hasTrailer = movie.trailers?.some((t) => t.site === 'YouTube') ?? false;

  return (
    <section
      className={cn('relative h-[400px] overflow-hidden md:h-[800px]', className)}
      aria-label={`${movie.title} hero`}
    >
      {/* Backdrop image */}
      {movie.backdropUrl && (
        <Image
          src={getImageUrl(movie.backdropUrl, 'w1280')}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          aria-hidden="true"
        />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 md:px-8 md:pb-12">
        <div className="mx-auto flex max-w-7xl items-end gap-6">
          {/* Poster — desktop only */}
          <div className="relative hidden h-[270px] w-[180px] flex-shrink-0 overflow-hidden rounded-lg shadow-2xl md:block">
            <Image
              src={getImageUrl(movie.posterUrl, 'w342')}
              alt={movie.title}
              fill
              sizes="180px"
              className="object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col gap-3 min-w-0">
            <h1 className="text-3xl font-bold text-white md:text-5xl line-clamp-2">
              {movie.title}
            </h1>

            {movie.tagline && (
              <p className="text-slate-300 italic text-sm md:text-base">{movie.tagline}</p>
            )}

            {/* Genres */}
            {movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((g) => (
                  <Badge key={g.id} variant="genre">
                    {g.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
              {movie.releaseDate && <span>{formatYear(movie.releaseDate)}</span>}
              {movie.runtime && <span>{formatRuntime(movie.runtime)}</span>}
              {movie.language && (
                <span className="rounded border border-slate-600 px-1.5 py-0.5 text-xs uppercase">
                  {movie.language}
                </span>
              )}
              <RatingCircle value={movie.voteAverage} size={52} />
            </div>

            {/* Overview — desktop only */}
            {movie.overview && (
              <p className="hidden max-w-2xl text-sm leading-relaxed text-slate-300 line-clamp-3 md:block">
                {movie.overview}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              {(hasTrailer || onWatchTrailer) && (
                <Button
                  onClick={onWatchTrailer}
                  leftIcon={<Play className="h-4 w-4 fill-current" />}
                  size="lg"
                >
                  Watch Trailer
                </Button>
              )}
              {onRate && (
                <Button
                  variant="secondary"
                  onClick={onRate}
                  leftIcon={<Star className="h-4 w-4" />}
                  size="lg"
                >
                  Rate
                </Button>
              )}
              {onWatchlist && (
                <Button
                  variant="secondary"
                  onClick={onWatchlist}
                  leftIcon={<Bookmark className="h-4 w-4" />}
                  size="lg"
                >
                  Watchlist
                </Button>
              )}
              {onFavorite && (
                <Button
                  variant="secondary"
                  onClick={onFavorite}
                  leftIcon={<Heart className="h-4 w-4" />}
                  size="lg"
                >
                  Favorite
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
