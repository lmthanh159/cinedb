import type { Metadata } from 'next';

import { HeroBanner } from '@/components/movie/HeroBanner';
import { MovieCarousel } from '@/components/movie/MovieCarousel';
import { TrendingSection } from '@/components/movie/TrendingSection';
import type { MovieSummary, TrendingItem, TvSummary } from '@/types';

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: 'CineDB — Khám phá thế giới điện ảnh' },
  description:
    'Khám phá hàng ngàn bộ phim và TV series. Đánh giá, lưu watchlist, theo dõi người nổi tiếng trên màn ảnh.',
};

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

type TrendingPage = { data: TrendingItem[] };
type MoviePage = { data: MovieSummary[] };
type TvPage = { data: TvSummary[] };

export default async function HomePage() {
  const [
    trendingDayRes,
    trendingWeekRes,
    popularRes,
    nowPlayingRes,
    upcomingRes,
    topRatedRes,
    popularTvRes,
  ] = await Promise.all([
    safeFetch<TrendingPage>('/trending/movie/day?page=1&limit=20'),
    safeFetch<TrendingPage>('/trending/movie/week?page=1&limit=20'),
    safeFetch<MoviePage>('/movies?category=popular&limit=20'),
    safeFetch<MoviePage>('/movies?category=now_playing&limit=20'),
    safeFetch<MoviePage>('/movies?category=upcoming&limit=20'),
    safeFetch<MoviePage>('/movies?category=top_rated&limit=20'),
    safeFetch<TvPage>('/tv?category=popular&limit=20'),
  ]);

  const heroItems = (trendingDayRes?.data ?? []).slice(0, 5);
  const trendingDay = (trendingDayRes?.data ?? []).map(trendingToMovieSummary);
  const trendingWeek = (trendingWeekRes?.data ?? []).map(trendingToMovieSummary);
  const popular = popularRes?.data ?? [];
  const nowPlaying = nowPlayingRes?.data ?? [];
  const upcoming = upcomingRes?.data ?? [];
  const topRated = topRatedRes?.data ?? [];
  const popularTv = (popularTvRes?.data ?? []).map(tvToMovieSummary);

  return (
    <div className="min-h-screen bg-slate-900">
      <HeroBanner items={heroItems} />

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 md:px-8">
        {(trendingDay.length > 0 || trendingWeek.length > 0) && (
          <TrendingSection trendingDay={trendingDay} trendingWeek={trendingWeek} />
        )}

        {popular.length > 0 && (
          <MovieCarousel
            title="Phim phổ biến"
            movies={popular}
            viewAllLink="/movies?category=popular"
          />
        )}

        {nowPlaying.length > 0 && (
          <MovieCarousel
            title="Đang chiếu"
            movies={nowPlaying}
            viewAllLink="/movies?category=now_playing"
          />
        )}

        {upcoming.length > 0 && (
          <MovieCarousel
            title="Sắp ra mắt"
            movies={upcoming}
            viewAllLink="/movies?category=upcoming"
          />
        )}

        {topRated.length > 0 && (
          <MovieCarousel
            title="Đánh giá cao"
            movies={topRated}
            viewAllLink="/movies?category=top_rated"
          />
        )}

        {popularTv.length > 0 && (
          <MovieCarousel
            title="TV Shows phổ biến"
            movies={popularTv}
            viewAllLink="/tv?category=popular"
          />
        )}
      </div>
    </div>
  );
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

function trendingToMovieSummary(t: TrendingItem): MovieSummary {
  return {
    id: t.id,
    tmdbId: null,
    title: t.title,
    originalTitle: null,
    overview: null,
    releaseDate: t.releaseDate ?? t.firstAirDate,
    runtime: null,
    language: null,
    budget: null,
    revenue: null,
    status: null,
    voteAverage: t.voteAverage,
    voteCount: t.voteCount,
    tmdbVoteAverage: 0,
    tmdbVoteCount: 0,
    popularity: t.popularity,
    posterUrl: t.posterUrl,
    backdropUrl: t.backdropUrl,
    genres: t.genres,
  };
}

function tvToMovieSummary(tv: TvSummary): MovieSummary {
  return {
    id: tv.id,
    tmdbId: tv.tmdbId,
    title: tv.title,
    originalTitle: tv.originalTitle,
    overview: tv.overview,
    releaseDate: tv.firstAirDate,
    runtime: null,
    language: null,
    budget: null,
    revenue: null,
    status: tv.status,
    voteAverage: tv.voteAverage,
    voteCount: tv.voteCount,
    tmdbVoteAverage: tv.tmdbVoteAverage,
    tmdbVoteCount: tv.tmdbVoteCount,
    popularity: tv.popularity,
    posterUrl: tv.posterUrl,
    backdropUrl: tv.backdropUrl,
    genres: tv.genres,
  };
}
