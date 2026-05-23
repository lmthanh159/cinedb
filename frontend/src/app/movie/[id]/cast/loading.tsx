export default function MovieCastLoading() {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 md:px-7">
        <div className="mb-2 h-4 w-40 rounded bg-slate-800" />
        <div className="mb-8 h-7 w-80 rounded bg-slate-800" />
        <div className="mb-3 h-5 w-36 rounded bg-slate-800" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-800 p-3">
              <div className="h-16 w-16 flex-shrink-0 rounded-full bg-slate-700" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-slate-700" />
                <div className="h-3 w-20 rounded bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
