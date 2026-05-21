import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-slate-700 text-slate-200',
  genre: 'bg-slate-700/70 text-slate-300 border border-slate-600',
  primary: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
} as const;

export interface BadgeProps {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
