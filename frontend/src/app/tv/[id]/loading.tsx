export default function TvDetailLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-slate-900">
      {/* Hero skeleton */}
      <div className="min-h-[300px] bg-slate-800 md:min-h-[420px]" />

      <div className="mx-auto max-w-7xl px-4 md:px-7">
        <div className="flex flex-col gap-6 py-6 lg:flex-row">
          {/* Main */}
          <div className="min-w-0 flex-1 space-y-10">
            {/* Cast row */}
            <div>
              <div className="mb-3 h-5 w-40 rounded bg-slate-800" />
              <div className="flex gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-[130px] flex-shrink-0">
                    <div className="h-[140px] rounded-t-lg bg-slate-800" />
                    <div className="rounded-b-lg bg-slate-700 p-2">
                      <div className="h-3 w-20 rounded bg-slate-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Review skeletons */}
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg bg-slate-800 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-slate-700" />
                      <div className="h-3 w-48 rounded bg-slate-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full space-y-3 lg:w-[260px] lg:flex-shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
