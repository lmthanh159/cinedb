import { GridSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/types';

import { SearchResultCard } from './SearchResultCard';

export interface SearchResultGridProps {
  results: SearchResult[];
  isLoading?: boolean;
  skeletonCount?: number;
  emptyMessage?: string;
  className?: string;
}

export function SearchResultGrid({
  results,
  isLoading,
  skeletonCount = 10,
  emptyMessage = 'Không tìm thấy kết quả.',
  className,
}: SearchResultGridProps) {
  if (isLoading) return <GridSkeleton count={skeletonCount} />;

  if (results.length === 0) {
    return <p className="py-12 text-center text-slate-400">{emptyMessage}</p>;
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
        className,
      )}
    >
      {results.map((result) => (
        <SearchResultCard
          key={`${result.mediaType}-${result.id}`}
          result={result}
        />
      ))}
    </div>
  );
}
