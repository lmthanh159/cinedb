import { GridSkeleton } from '@/components/ui';

export default function DiscoverTvLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-800" />
      <div className="flex gap-8">
        <div className="hidden h-96 w-60 flex-shrink-0 animate-pulse rounded-lg bg-slate-800 lg:block" />
        <div className="min-w-0 flex-1">
          <GridSkeleton count={10} />
        </div>
      </div>
    </div>
  );
}
