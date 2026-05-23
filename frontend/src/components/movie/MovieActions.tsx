'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Heart, Play, Star } from 'lucide-react';

import { Button, Modal } from '@/components/ui';
import { StarRating } from '@/components/ui/StarRating';
import { TrailerModal } from '@/components/movie/TrailerModal';
import { movieApi, userApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { toast } from '@/store/toast-store';
import type { Trailer } from '@/types';

export interface MovieActionsProps {
  movieId: number;
  movieTitle: string;
  trailers: Trailer[];
}

const BTN = 'flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 transition-colors hover:bg-slate-700';

export function MovieActions({ movieId, movieTitle, trailers }: MovieActionsProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [inWatchlist, setInWatchlist] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userScore, setUserScore] = useState<number | undefined>(undefined);
  const [statusLoaded, setStatusLoaded] = useState(false);

  const [trailerOpen, setTrailerOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      userApi.getWatchlist({ limit: 200 }),
      userApi.getFavorites({ limit: 200 }),
      userApi.getRatings({ limit: 200 }),
    ])
      .then(([wRes, fRes, rRes]) => {
        setInWatchlist(wRes.data.data.some((i) => i.movie?.id === movieId));
        setIsFavorite(fRes.data.data.some((i) => i.movie?.id === movieId));
        const found = rRes.data.data.find((i) => i.movie?.id === movieId);
        if (found) setUserScore(found.score);
      })
      .catch(() => undefined)
      .finally(() => setStatusLoaded(true));
  }, [isAuthenticated, movieId]);

  const youtubeTrailers = trailers.filter((t) => t.site === 'YouTube');
  const mainTrailer = youtubeTrailers.find((t) => t.type === 'Trailer') ?? youtubeTrailers[0];

  const requireAuth = (fn: () => void | Promise<void>) => {
    if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
    void fn();
  };

  const handleWatchlist = async () => {
    try {
      if (inWatchlist) {
        await movieApi.removeFromWatchlist(movieId);
        setInWatchlist(false);
        toast.success('Đã xóa khỏi watchlist');
      } else {
        await movieApi.addToWatchlist(movieId);
        setInWatchlist(true);
        toast.success('Đã thêm vào watchlist');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleFavorite = async () => {
    try {
      if (isFavorite) {
        await movieApi.removeFromFavorite(movieId);
        setIsFavorite(false);
        toast.success('Đã xóa khỏi yêu thích');
      } else {
        await movieApi.addToFavorite(movieId);
        setIsFavorite(true);
        toast.success('Đã thêm vào yêu thích');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleSubmitRating = async () => {
    if (!rating) return;
    setIsSubmitting(true);
    try {
      await movieApi.rateMovie(movieId, rating);
      setUserScore(rating);
      toast.success(`Đã đánh giá ${rating}/10`);
      setRateOpen(false);
      setRating(undefined);
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRateModal = () => {
    setRating(userScore);
    setRateOpen(true);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            title={isFavorite ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
            aria-label={isFavorite ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
            onClick={() => requireAuth(handleFavorite)}
            className={cn(BTN, isFavorite && statusLoaded && 'border-red-500/60 text-red-400')}
          >
            <Heart className={cn('h-4 w-4', isFavorite && statusLoaded ? 'fill-red-400 text-red-400' : 'text-slate-400')} />
          </button>

          <button
            title={inWatchlist ? 'Xóa khỏi watchlist' : 'Thêm vào watchlist'}
            aria-label={inWatchlist ? 'Xóa khỏi watchlist' : 'Thêm vào watchlist'}
            onClick={() => requireAuth(handleWatchlist)}
            className={cn(BTN, inWatchlist && statusLoaded && 'border-blue-500/60 text-blue-400')}
          >
            <Bookmark className={cn('h-4 w-4', inWatchlist && statusLoaded ? 'fill-blue-400 text-blue-400' : 'text-slate-400')} />
          </button>

          <button
            title={userScore ? `Đánh giá của bạn: ${userScore}/10` : 'Đánh giá phim'}
            aria-label="Đánh giá phim"
            onClick={() => requireAuth(openRateModal)}
            className={cn(BTN, userScore && statusLoaded && 'border-amber-500/60')}
          >
            <Star className={cn('h-4 w-4', userScore && statusLoaded ? 'fill-amber-400 text-amber-400' : 'text-slate-400')} />
          </button>
        </div>

        {mainTrailer && (
          <button
            onClick={() => setTrailerOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/25"
          >
            <Play className="h-4 w-4 fill-current" />
            Xem trailer
          </button>
        )}
      </div>

      {mainTrailer && (
        <TrailerModal
          isOpen={trailerOpen}
          onClose={() => setTrailerOpen(false)}
          trailerKey={mainTrailer.key}
          trailerName={mainTrailer.name}
        />
      )}

      <Modal
        isOpen={rateOpen}
        onClose={() => { setRateOpen(false); setRating(undefined); }}
        title={`Đánh giá: ${movieTitle}`}
      >
        <div className="flex flex-col items-center gap-6 py-2">
          <StarRating value={rating} onChange={setRating} size="lg" />
          <div className="flex gap-3">
            <Button onClick={handleSubmitRating} disabled={!rating} isLoading={isSubmitting}>
              {userScore ? 'Cập nhật' : 'Gửi đánh giá'}
            </Button>
            <Button variant="ghost" onClick={() => { setRateOpen(false); setRating(undefined); }}>
              Hủy
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
