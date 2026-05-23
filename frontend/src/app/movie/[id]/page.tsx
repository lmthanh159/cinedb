import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { CastCarousel } from '@/components/movie/CastCarousel';
import { CommentSection } from '@/components/movie/CommentSection';
import { MediaTabs } from '@/components/movie/MediaTabs';
import { MovieCard } from '@/components/movie/MovieCard';
import { MovieHero } from '@/components/movie/MovieHero';
import { MovieSidebar } from '@/components/movie/MovieSidebar';
import { ScrollableRow } from '@/components/ui/ScrollableRow';
import { formatYear, getImageUrl } from '@/lib/utils';
import type { MovieDetail, MovieSummary } from '@/types';

export const revalidate = 3600;

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type MovieDetailResponse = { data: MovieDetail };
type SimilarResponse = { data: MovieSummary[] };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const res = await safeFetch<MovieDetailResponse>(`/movies/${id}`);
  if (!res) return { title: 'Phim không tìm thấy' };

  const movie = res.data;
  const year = formatYear(movie.releaseDate);
  const title = year ? `${movie.title} (${year})` : movie.title;

  return {
    title,
    description: movie.overview?.slice(0, 160) ?? undefined,
    openGraph: {
      title,
      description: movie.overview ?? undefined,
      images: movie.posterUrl ? [{ url: getImageUrl(movie.posterUrl, 'w500') }] : [],
      type: 'video.movie',
    },
  };
}

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movieId = Number(id);

  if (isNaN(movieId)) notFound();

  const [movieRes, similarRes] = await Promise.all([
    safeFetch<MovieDetailResponse>(`/movies/${movieId}`),
    safeFetch<SimilarResponse>(`/movies/${movieId}/similar`),
  ]);

  if (!movieRes) notFound();

  const movie = movieRes.data;
  const similar = similarRes?.data ?? [];

  const hasMedia =
    movie.trailers.length > 0 || movie.posters.length > 0 || movie.backdrops.length > 0;

  return (
    <div className="min-h-screen bg-slate-900">
      <MovieHero movie={movie} />

      {/* 2-column layout */}
      <div className="mx-auto max-w-7xl px-4 md:px-7">
        <div className="flex flex-col gap-6 py-6 lg:flex-row">
          {/* Main content */}
          <div className="min-w-0 flex-1 space-y-10">
            {movie.cast.length > 0 && (
              <CastCarousel cast={movie.cast} mediaId={movie.id} mediaType="movie" />
            )}

            {hasMedia && (
              <MediaTabs
                trailers={movie.trailers}
                posters={movie.posters}
                backdrops={movie.backdrops}
              />
            )}

            <CommentSection movieId={movie.id} mediaType="movie" />

            {similar.length > 0 && (
              <section aria-label="Phim tương tự">
                <h2 className="mb-4 text-lg font-medium text-white">Phim tương tự</h2>
                <ScrollableRow>
                  {similar.slice(0, 16).map((movie) => (
                    <div key={movie.id} className="w-[140px] flex-shrink-0">
                      <MovieCard movie={movie} />
                    </div>
                  ))}
                </ScrollableRow>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-[260px] lg:flex-shrink-0">
            <div className="lg:sticky lg:top-6">
              <MovieSidebar movie={movie} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
