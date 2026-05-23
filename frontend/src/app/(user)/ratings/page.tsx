'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';

import { Button, ListSkeleton, Modal, Pagination } from '@/components/ui';
import { StarRating } from '@/components/ui/StarRating';
import { movieApi, tvApi, userApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { formatDate, getImageUrl } from '@/lib/utils';
import { toast } from '@/store/toast-store';
import type { UserRating } from '@/types';

export default function RatingsPage() {
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Edit modal
  const [editItem, setEditItem] = useState<UserRating | null>(null);
  const [editScore, setEditScore] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback((p: number) => {
    setIsLoading(true);
    userApi
      .getRatings({ page: p, limit: 20 })
      .then((res) => {
        setRatings(res.data.data);
        setTotalPages(res.data.meta.totalPages);
      })
      .catch(() => toast.error('Không thể tải đánh giá'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const openEdit = (item: UserRating) => {
    setEditItem(item);
    setEditScore(item.score);
  };

  const handleSaveEdit = async () => {
    if (!editItem || !editScore) return;
    const media = editItem.movie ?? editItem.series;
    if (!media) return;
    setIsSubmitting(true);
    try {
      if (editItem.movie) {
        await movieApi.rateMovie(media.id, editScore);
      } else {
        await tvApi.rateTv(media.id, editScore);
      }
      toast.success(`Đã cập nhật đánh giá ${editScore}/10`);
      setRatings((prev) =>
        prev.map((r) => (r.id === editItem.id ? { ...r, score: editScore } : r)),
      );
      setEditItem(null);
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: UserRating) => {
    const media = item.movie ?? item.series;
    if (!media) return;
    try {
      if (item.movie) {
        await movieApi.deleteRating(media.id);
      } else {
        await tvApi.deleteTvRating(media.id);
      }
      toast.success('Đã xóa đánh giá');
      setRatings((prev) => prev.filter((r) => r.id !== item.id));
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-white">Đánh giá của tôi</h1>

      {isLoading ? (
        <ListSkeleton count={8} />
      ) : ratings.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Star className="h-12 w-12 text-slate-600" />
          <p className="text-slate-400">Chưa đánh giá phim nào</p>
          <Link
            href={ROUTES.MOVIES}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Khám phá phim
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {ratings.map((item) => {
              const media = item.movie ?? item.series;
              if (!media) return null;
              const href = item.movie ? ROUTES.MOVIE(media.id) : ROUTES.TV_SHOW(media.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-lg bg-slate-800 p-3"
                >
                  <Link href={href} className="flex-shrink-0">
                    <div className="relative h-[69px] w-[46px] overflow-hidden rounded bg-slate-700">
                      <Image
                        src={getImageUrl(media.posterUrl, 'w92')}
                        alt={media.title}
                        fill
                        sizes="46px"
                        className="object-cover"
                      />
                    </div>
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={href}
                      className="line-clamp-1 font-medium text-white transition-colors hover:text-blue-400"
                    >
                      {media.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-1 text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="text-sm font-medium">{item.score} / 10</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                  </div>

                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {/* Edit rating modal */}
      <Modal
        isOpen={!!editItem}
        onClose={() => { setEditItem(null); setEditScore(undefined); }}
        title={`Sửa đánh giá: ${(editItem?.movie ?? editItem?.series)?.title ?? ''}`}
      >
        <div className="flex flex-col items-center gap-6 py-2">
          <StarRating value={editScore} onChange={setEditScore} size="lg" />
          <div className="flex gap-3">
            <Button onClick={handleSaveEdit} disabled={!editScore} isLoading={isSubmitting}>
              Lưu
            </Button>
            <Button variant="ghost" onClick={() => { setEditItem(null); setEditScore(undefined); }}>
              Hủy
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
