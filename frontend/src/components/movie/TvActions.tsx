'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Heart, Play, Star } from 'lucide-react';

import { Button, Modal } from '@/components/ui';
import { StarRating } from '@/components/ui/StarRating';
import { TrailerModal } from '@/components/movie/TrailerModal';
import { tvApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';
import { toast } from '@/store/toast-store';
import type { Trailer } from '@/types';

export interface TvActionsProps {
  tvId: number;
  tvTitle: string;
  trailers: Trailer[];
}

const BTN =
  'flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 transition-colors hover:bg-slate-700';

export function TvActions({ tvId, tvTitle, trailers }: TvActionsProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [trailerOpen, setTrailerOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const youtubeTrailers = trailers.filter((t) => t.site === 'YouTube');
  const mainTrailer = youtubeTrailers.find((t) => t.type === 'Trailer') ?? youtubeTrailers[0];

  const requireAuth = (fn: () => void | Promise<void>) => {
    if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
    void fn();
  };

  const handleWatchlist = async () => {
    try {
      await tvApi.addTvToWatchlist(tvId);
      toast.success('Đã thêm vào danh sách xem');
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleFavorite = async () => {
    try {
      await tvApi.addTvToFavorite(tvId);
      toast.success('Đã thêm vào yêu thích');
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleSubmitRating = async () => {
    if (!rating) return;
    setIsSubmitting(true);
    try {
      await tvApi.rateTv(tvId, rating);
      toast.success(`Đã đánh giá ${rating}/10`);
      setRateOpen(false);
      setRating(undefined);
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            title="Thêm vào yêu thích"
            aria-label="Thêm vào yêu thích"
            onClick={() => requireAuth(handleFavorite)}
            className={BTN}
          >
            <Heart className="h-4 w-4 text-slate-400" />
          </button>
          <button
            title="Thêm vào watchlist"
            aria-label="Thêm vào watchlist"
            onClick={() => requireAuth(handleWatchlist)}
            className={BTN}
          >
            <Bookmark className="h-4 w-4 text-slate-400" />
          </button>
          <button
            title="Đánh giá series"
            aria-label="Đánh giá series"
            onClick={() => requireAuth(() => setRateOpen(true))}
            className={BTN}
          >
            <Star className="h-4 w-4 text-slate-400" />
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
        title={`Đánh giá: ${tvTitle}`}
      >
        <div className="flex flex-col items-center gap-6 py-2">
          <StarRating value={rating} onChange={setRating} size="lg" />
          <div className="flex gap-3">
            <Button onClick={handleSubmitRating} disabled={!rating} isLoading={isSubmitting}>
              Gửi đánh giá
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
