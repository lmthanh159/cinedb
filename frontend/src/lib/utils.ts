import { type ClassValue, clsx } from 'clsx';
import { format as dateFnsFormat } from 'date-fns';
import { vi } from 'date-fns/locale';
import { twMerge } from 'tailwind-merge';

import { TMDB_IMAGE_BASE } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(path: string | null | undefined, size = 'w500'): string {
  if (!path) return '/placeholder-movie.png';
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getRatingColor(rating: number): string {
  if (rating >= 7) return 'text-emerald-500';
  if (rating >= 5) return 'text-amber-500';
  return 'text-red-500';
}

export function getRatingBgColor(rating: number): string {
  if (rating >= 7) return 'bg-emerald-500';
  if (rating >= 5) return 'bg-amber-500';
  return 'bg-red-500';
}

export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy'): string {
  try {
    return dateFnsFormat(new Date(date), fmt, { locale: vi });
  } catch {
    return '';
  }
}

export function formatYear(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    return dateFnsFormat(new Date(date), 'yyyy');
  } catch {
    return '';
  }
}

export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + '…';
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
