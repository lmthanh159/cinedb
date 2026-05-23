import { GridSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { MovieSummary } from '@/types';

import { MovieCard } from './MovieCard';

export interface MovieGridProps {
  movies: MovieSummary[];
  mediaType?: 'movie' | 'tv';
  isLoading?: boolean;
  skeletonCount?: number;
  onWatchlist?: (id: number) => void;
  onFavorite?: (id: number) => void;
  className?: string;
}

export function MovieGrid({
  movies,
  mediaType = 'movie',
  isLoading,
  skeletonCount = 10,
  onWatchlist,
  onFavorite,
  className,
}: MovieGridProps) {
  if (isLoading) {
    return <GridSkeleton count={skeletonCount} />;
  }

  if (movies.length === 0) {
    return (
      <p className="py-12 text-center text-slate-400">No movies found.</p>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
        className,
      )}
    >
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          mediaType={mediaType}
          onWatchlist={onWatchlist}
          onFavorite={onFavorite}
        />
      ))}
    </div>
  );
}
