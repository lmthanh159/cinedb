'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Heart, MessageSquare, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

import { ListSkeleton, Pagination } from '@/components/ui';
import { userApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast } from '@/store/toast-store';
import type { ActivityItem } from '@/types';

const ACTIVITY_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string; bg: string }
> = {
  RATE: { icon: Star, label: 'Đánh giá', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  COMMENT: { icon: MessageSquare, label: 'Bình luận', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  WATCHLIST_ADD: { icon: Bookmark, label: 'Thêm watchlist', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  FAVORITE_ADD: { icon: Heart, label: 'Yêu thích', color: 'text-red-400', bg: 'bg-red-500/10' },
};

const DEFAULT_CONFIG = { icon: Star, label: 'Hoạt động', color: 'text-slate-400', bg: 'bg-slate-700' };

function ActivityRow({ item }: { item: ActivityItem }) {
  const config = ACTIVITY_CONFIG[item.type] ?? DEFAULT_CONFIG;
  const Icon = config.icon;
  const media = item.movie ?? item.series;
  const href = media
    ? item.movie
      ? ROUTES.MOVIE(media.id)
      : ROUTES.TV_SHOW(media.id)
    : null;

  const description = () => {
    if (!media) return config.label;
    if (item.type === 'RATE') return `Đánh giá ${item.score ?? '?'}/10`;
    if (item.type === 'COMMENT') return 'Đã bình luận';
    if (item.type === 'WATCHLIST_ADD') return 'Thêm vào watchlist';
    if (item.type === 'FAVORITE_ADD') return 'Thêm vào yêu thích';
    return config.label;
  };

  return (
    <div className="flex items-start gap-4 rounded-lg bg-slate-800 p-4">
      <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full', config.bg)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-300">
          <span className="font-medium text-white">{description()}</span>
          {media && href && (
            <>
              {' — '}
              <Link href={href} className="text-blue-400 transition-colors hover:text-blue-300">
                {media.title}
              </Link>
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}
        </p>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    userApi
      .getActivity({ page, limit: 30 })
      .then((res) => {
        setItems(res.data.data);
        setTotalPages(res.data.meta.totalPages);
      })
      .catch(() => toast.error('Không thể tải hoạt động'))
      .finally(() => setIsLoading(false));
  }, [page]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-white">Hoạt động</h1>

      {isLoading ? (
        <ListSkeleton count={8} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <MessageSquare className="h-12 w-12 text-slate-600" />
          <p className="text-slate-400">Chưa có hoạt động nào</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
