'use client';

import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';

import { useToastStore } from '@/store/toast-store';
import type { ToastType } from '@/store/toast-store';
import { cn } from '@/lib/utils';

const styles: Record<ToastType, { icon: React.ReactNode; border: string }> = {
  success: {
    icon: <CheckCircle className="h-5 w-5 text-emerald-400" aria-hidden="true" />,
    border: 'border-emerald-500/50',
  },
  error: {
    icon: <XCircle className="h-5 w-5 text-red-400" aria-hidden="true" />,
    border: 'border-red-500/50',
  },
  info: {
    icon: <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />,
    border: 'border-blue-500/50',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />,
    border: 'border-amber-500/50',
  },
};

export function Toaster() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((item) => {
        const { icon, border } = styles[item.type];
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              'flex items-start gap-3 rounded-lg border bg-slate-800 px-4 py-3 shadow-lg',
              border,
            )}
          >
            <div className="mt-0.5 flex-shrink-0">{icon}</div>
            <p className="flex-1 text-sm text-slate-200">{item.message}</p>
            <button
              onClick={() => remove(item.id)}
              className="flex-shrink-0 text-slate-400 transition-colors hover:text-slate-200"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
