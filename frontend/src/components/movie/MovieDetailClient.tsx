'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { CastSection } from '@/components/movie/CastSection';
import { MediaSection } from '@/components/movie/MediaSection';
import { MovieHero } from '@/components/movie/MovieHero';
import { ReviewSection } from '@/components/movie/ReviewSection';
import { Button, Modal, StarRating } from '@/components/ui';
import { movieApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { formatDate, formatNumber, formatRuntime } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { toast } from '@/store/toast-store';
import type { MovieDetail } from '@/types';

export interface MovieDetailClientProps {
  movie: MovieDetail;
}

export function MovieDetailClient({ movie }: MovieDetailClientProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const youtubeTrailers = movie.trailers.filter((t) => t.site === 'YouTube');

  const closeRateModal = () => { setRateOpen(false); setRating(undefined); };

  const requireAuth = (action: () => void | Promise<void>) => {
    if (!isAuthenticated) {
      router.push(ROUTES.LOGIN);
      return;
    }
    void action();
  };

  const handleWatchTrailer = () => {
    const trailer = youtubeTrailers.find((t) => t.type === 'Trailer') ?? youtubeTrailers[0];
    if (trailer) setTrailerKey(trailer.key);
  };

  const handleWatchlist = async () => {
    if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
    try {
      await movieApi.addToWatchlist(movie.id);
      toast.success('Đã thêm vào Watchlist');
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
    try {
      await movieApi.addToFavorite(movie.id);
      toast.success('Đã thêm vào Yêu thích');
    } catch {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleSubmitRating = async () => {
    if (!rating) return;
    setIsSubmittingRating(true);
    try {
      await movieApi.rateMovie(movie.id, rating);
      toast.success(`Đã đánh giá ${rating}/10`);
      closeRateModal();
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const directors = movie.crew.filter((c) => c.job === 'Director');
  const budget = movie.budget ? Number(movie.budget) : 0;
  const revenue = movie.revenue ? Number(movie.revenue) : 0;
  const hasMedia =
    movie.trailers.length > 0 || movie.posters.length > 0 || movie.backdrops.length > 0;

  return (
    <>
      <MovieHero
        movie={movie}
        onWatchTrailer={youtubeTrailers.length > 0 ? handleWatchTrailer : undefined}
        onRate={() => requireAuth(() => setRateOpen(true))}
        onWatchlist={handleWatchlist}
        onFavorite={handleFavorite}
      />

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 md:px-8">
        {/* Overview + sidebar */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-10 lg:col-span-2">
            {movie.overview && (
              <section>
                <h2 className="mb-3 text-xl font-bold text-white">Nội dung</h2>
                <p className="leading-relaxed text-slate-300">{movie.overview}</p>
              </section>
            )}

            {movie.cast.length > 0 && <CastSection cast={movie.cast} />}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 rounded-lg bg-slate-800/50 p-5">
            {movie.status && <SidebarItem label="Trạng thái" value={movie.status} />}
            {movie.releaseDate && (
              <SidebarItem label="Ngày phát hành" value={formatDate(movie.releaseDate)} />
            )}
            {movie.runtime && (
              <SidebarItem label="Thời lượng" value={formatRuntime(movie.runtime)} />
            )}
            {movie.language && (
              <SidebarItem label="Ngôn ngữ" value={movie.language.toUpperCase()} />
            )}
            {budget > 0 && (
              <SidebarItem label="Ngân sách" value={`$${formatNumber(budget)}`} />
            )}
            {revenue > 0 && (
              <SidebarItem label="Doanh thu" value={`$${formatNumber(revenue)}`} />
            )}
            {directors.length > 0 && (
              <SidebarItem
                label="Đạo diễn"
                value={directors.map((d) => d.person.name).join(', ')}
              />
            )}
            {movie.countries.length > 0 && (
              <SidebarItem
                label="Quốc gia"
                value={movie.countries.map((c) => c.name).join(', ')}
              />
            )}
            {movie.companies.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Hãng sản xuất
                </p>
                <div className="space-y-1">
                  {movie.companies.map((c) => (
                    <p key={c.id} className="text-sm text-slate-300">
                      {c.name}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Media */}
        {hasMedia && (
          <MediaSection
            trailers={movie.trailers}
            posters={movie.posters}
            backdrops={movie.backdrops}
            onTrailerPlay={setTrailerKey}
          />
        )}

        {/* Reviews */}
        <ReviewSection movieId={movie.id} />
      </div>

      {/* Trailer modal */}
      <Modal
        isOpen={!!trailerKey}
        onClose={() => setTrailerKey(null)}
        title={`${movie.title} — Trailer`}
        size="xl"
      >
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          {trailerKey && (
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
              title="Trailer"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          )}
        </div>
      </Modal>

      {/* Rating modal */}
      <Modal
        isOpen={rateOpen}
        onClose={closeRateModal}
        title={`Đánh giá: ${movie.title}`}
      >
        <div className="flex flex-col items-center gap-6 py-2">
          <StarRating value={rating} onChange={setRating} size="lg" />
          <div className="flex gap-3">
            <Button
              onClick={handleSubmitRating}
              disabled={!rating}
              isLoading={isSubmittingRating}
            >
              Gửi đánh giá
            </Button>
            <Button
              variant="ghost"
              onClick={closeRateModal}
            >
              Hủy
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function SidebarItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="text-sm text-slate-300">{value}</p>
    </div>
  );
}
