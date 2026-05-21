'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui';

export default function Error({
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
    <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h2 className="text-xl font-bold text-white">Có lỗi xảy ra</h2>
      <p className="max-w-md text-sm text-slate-400">
        Không thể tải dữ liệu. Vui lòng thử lại sau.
      </p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
