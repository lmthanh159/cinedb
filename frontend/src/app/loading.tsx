import { MovieCardSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Hero skeleton */}
      <div className="h-[300px] animate-pulse bg-slate-800 md:h-[500px] lg:h-[600px]" />

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 md:px-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="h-6 w-36 animate-pulse rounded bg-slate-800" />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="w-[160px] flex-shrink-0">
                  <MovieCardSkeleton />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
