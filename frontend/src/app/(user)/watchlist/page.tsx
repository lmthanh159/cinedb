'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, X } from 'lucide-react';

import { GridSkeleton, Pagination } from '@/components/ui';
import { movieApi, tvApi, userApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';
import { toast } from '@/store/toast-store';
import type { WatchlistItem } from '@/types';

function WatchlistCard({
  item,
  onRemove,
}: {
  item: WatchlistItem;
  onRemove: (item: WatchlistItem) => void;
}) {
  const media = item.movie ?? item.series;
  if (!media) return null;
  const href = item.movie ? ROUTES.MOVIE(media.id) : ROUTES.TV_SHOW(media.id);

  return (
    <div className="group relative">
      <Link href={href} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-800 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-black/60">
          <Image
            src={getImageUrl(media.posterUrl, 'w342')}
            alt={media.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover"
          />
        </div>
        <p className="mt-2 line-clamp-1 text-sm font-medium text-white transition-colors group-hover:text-blue-400">
          {media.title}
        </p>
        {media.year != null && <p className="text-xs text-slate-500">{media.year}</p>}
      </Link>

      {/* Remove button */}
      <button
        onClick={() => onRemove(item)}
        aria-label={`Xóa ${media.title} khỏi watchlist`}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/80 text-slate-400 opacity-0 transition-all hover:bg-red-500/80 hover:text-white group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback((p: number) => {
    setIsLoading(true);
    userApi
      .getWatchlist({ page: p, limit: 20 })
      .then((res) => {
        setItems(res.data.data);
        setTotalPages(res.data.meta.totalPages);
      })
      .catch(() => toast.error('Không thể tải watchlist'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const handleRemove = async (item: WatchlistItem) => {
    const media = item.movie ?? item.series;
    if (!media) return;
    try {
      if (item.movie) {
        await movieApi.removeFromWatchlist(media.id);
      } else {
        await tvApi.removeTvFromWatchlist(media.id);
      }
      toast.success('Đã xóa khỏi watchlist');
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-white">Watchlist</h1>

      {isLoading ? (
        <GridSkeleton count={10} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Bookmark className="h-12 w-12 text-slate-600" />
          <p className="text-slate-400">Watchlist trống</p>
          <Link
            href={ROUTES.MOVIES}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Khám phá phim
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((item) => (
              <WatchlistCard key={item.id} item={item} onRemove={handleRemove} />
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
