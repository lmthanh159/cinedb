'use client';

import { useEffect, useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { movieApi } from '@/lib/api';
import { formatDate, getRatingColor } from '@/lib/utils';
import type { Review } from '@/types';

export interface ReviewSectionProps {
  movieId: number;
}

const PAGE_SIZE = 5;

export function ReviewSection({ movieId }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    movieApi
      .getMovieReviews(movieId, { page: 1, limit: PAGE_SIZE })
      .then((res) => {
        setReviews(res.data.data);
        setTotalPages(res.data.meta.totalPages);
        setPage(1);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [movieId]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setIsLoadingMore(true);
    try {
      const res = await movieApi.getMovieReviews(movieId, { page: nextPage, limit: PAGE_SIZE });
      setReviews((prev) => [...prev, ...res.data.data]);
      setPage(nextPage);
    } catch {
      // silent
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) {
    return (
      <section aria-label="Đánh giá">
        <h2 className="mb-4 text-xl font-bold text-white">Đánh giá từ cộng đồng</h2>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-slate-800 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-slate-700" />
                  <div className="h-3 w-20 rounded bg-slate-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <section aria-label="Đánh giá">
      <h2 className="mb-4 text-xl font-bold text-white">Đánh giá từ cộng đồng</h2>
      <div className="space-y-4">
        {reviews.map((review) => (
          <article
            key={`${review.user.id}-${review.createdAt}`}
            className="rounded-lg bg-slate-800 p-4"
          >
            <div className="flex items-start gap-3">
              <Avatar
                src={review.user.avatarUrl}
                name={review.user.displayName}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{review.user.displayName}</span>
                  <span className={`text-sm font-semibold tabular-nums ${getRatingColor(review.rating)}`}>
                    {review.rating}/10
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{review.comment}</p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {page < totalPages && (
        <div className="mt-6 text-center">
          <Button variant="secondary" onClick={loadMore} isLoading={isLoadingMore}>
            Xem thêm đánh giá
          </Button>
        </div>
      )}
    </section>
  );
}
