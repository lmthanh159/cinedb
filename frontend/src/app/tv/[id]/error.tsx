'use client';

import { useEffect } from 'react';

export default function TvDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 px-4 text-center">
      <p className="text-5xl">📺</p>
      <h1 className="text-2xl font-bold text-white">Có lỗi xảy ra</h1>
      <p className="max-w-md text-slate-400">
        Không thể tải thông tin series. Vui lòng thử lại.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-blue-500 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-600"
      >
        Thử lại
      </button>
    </div>
  );
}
