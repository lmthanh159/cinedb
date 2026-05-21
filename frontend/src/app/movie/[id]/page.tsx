import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { MovieCarousel } from '@/components/movie/MovieCarousel';
import { MovieDetailClient } from '@/components/movie/MovieDetailClient';
import { formatYear, getImageUrl } from '@/lib/utils';
import type { MovieDetail, MovieSummary } from '@/types';

export const revalidate = 60;

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 60 } });
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

  return {
    title: year ? `${movie.title} (${year})` : movie.title,
    description: movie.overview?.slice(0, 160) ?? undefined,
    openGraph: {
      images: movie.posterUrl
        ? [{ url: getImageUrl(movie.posterUrl, 'w500') }]
        : [],
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

  return (
    <div className="min-h-screen bg-slate-900">
      <MovieDetailClient movie={movie} />

      {similar.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 pb-12 md:px-8">
          <MovieCarousel title="Phim tương tự" movies={similar} />
        </div>
      )}
    </div>
  );
}
