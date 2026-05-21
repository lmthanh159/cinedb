'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

import { cn, getRatingColor } from '@/lib/utils';

// ─── Circular SVG Progress (TMDB-style) ───────────────────────────────────────

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const VIEW_SIZE = 52;

const ratingStroke = (value: number) => {
  if (value >= 7) return '#10b981'; // emerald-500
  if (value >= 5) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
};

export interface RatingCircleProps {
  value: number;
  size?: number;
  className?: string;
}

export function RatingCircle({ value, size = 56, className }: RatingCircleProps) {
  const pct = Math.min(Math.max(value, 0), 10) / 10;
  const offset = CIRCUMFERENCE * (1 - pct);

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full bg-slate-900',
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={`Rating: ${value.toFixed(1)} out of 10`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={VIEW_SIZE / 2}
          cy={VIEW_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#334155"
          strokeWidth="4"
        />
        {/* Progress */}
        <circle
          cx={VIEW_SIZE / 2}
          cy={VIEW_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={ratingStroke(value)}
          strokeWidth="4"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={cn('absolute text-xs font-bold', getRatingColor(value))}
        aria-hidden="true"
      >
        {value === 0 ? 'NR' : value.toFixed(1)}
      </span>
    </div>
  );
}

// ─── Star Rating (interactive / display) ──────────────────────────────────────

const starSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const;

export interface StarRatingProps {
  value?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: keyof typeof starSizes;
  className?: string;
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value ?? 0;
  const starClass = starSizes[size];

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role={readonly ? 'img' : 'group'}
      aria-label={
        readonly
          ? `Rating: ${value ?? 'Not rated'} out of 10`
          : `Rating selector, currently ${value ?? 'not rated'}`
      }
    >
      {Array.from({ length: 10 }, (_, i) => {
        const star = i + 1;
        const filled = star <= display;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(null)}
            aria-label={`Rate ${star} out of 10`}
            className={cn(
              'transition-transform duration-100',
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110',
              'disabled:pointer-events-none',
            )}
          >
            <Star
              className={cn(
                starClass,
                filled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-600',
              )}
            />
          </button>
        );
      })}
      {value !== undefined && (
        <span className={cn('ml-2 text-sm font-semibold tabular-nums', getRatingColor(value))}>
          {value}/10
        </span>
      )}
    </div>
  );
}
