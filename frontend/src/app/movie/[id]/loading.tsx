import { MovieDetailSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-900">
      <MovieDetailSkeleton />
    </div>
  );
}
