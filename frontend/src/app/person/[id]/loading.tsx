export default function PersonDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-7">
        {/* Hero skeleton */}
        <div className="flex animate-pulse flex-col gap-6 md:flex-row">
          {/* Profile image */}
          <div className="h-[375px] w-[250px] flex-shrink-0 rounded-xl bg-slate-800" />

          {/* Info */}
          <div className="flex-1 space-y-4 pt-2">
            <div className="h-8 w-64 rounded bg-slate-800" />
            <div className="h-4 w-36 rounded bg-slate-800" />
            <div className="mt-6 space-y-2">
              <div className="h-4 w-full rounded bg-slate-800" />
              <div className="h-4 w-full rounded bg-slate-800" />
              <div className="h-4 w-5/6 rounded bg-slate-800" />
              <div className="h-4 w-4/6 rounded bg-slate-800" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-20 rounded bg-slate-800" />
                  <div className="h-4 w-32 rounded bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Credits skeleton */}
        <div className="mt-10 space-y-2">
          <div className="h-5 w-32 rounded bg-slate-800" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[130px] flex-shrink-0 space-y-2">
                <div className="h-[195px] w-[130px] rounded-lg bg-slate-800" />
                <div className="h-3 w-full rounded bg-slate-800" />
                <div className="h-3 w-2/3 rounded bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
