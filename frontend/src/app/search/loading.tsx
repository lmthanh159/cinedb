import { ListSkeleton } from '@/components/ui';

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-slate-800" />
      <div className="mb-6 flex border-b border-slate-800">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-20 animate-pulse rounded bg-slate-800 mr-1" />
        ))}
      </div>
      <ListSkeleton count={8} />
    </div>
  );
}
