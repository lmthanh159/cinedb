import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

import { CastCarousel } from '@/components/movie/CastCarousel';
import { MediaTabs } from '@/components/movie/MediaTabs';
import { TvHero } from '@/components/movie/TvHero';
import { CommentSection } from '@/components/movie/CommentSection';
import { TvSidebar } from '@/components/movie/TvSidebar';
import { ScrollableRow } from '@/components/ui/ScrollableRow';
import { ROUTES } from '@/lib/constants';
import { formatYear, getImageUrl, getRatingColor } from '@/lib/utils';
import type { TvDetail, TvSummary } from '@/types';

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

type TvDetailResponse = { data: TvDetail };
type SimilarResponse = { data: TvSummary[] };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const res = await safeFetch<TvDetailResponse>(`/tv/${id}`);
  if (!res) return { title: 'Series không tìm thấy' };

  const tv = res.data;
  const year = formatYear(tv.firstAirDate);
  const title = year ? `${tv.title} (${year})` : tv.title;

  return {
    title,
    description: tv.overview?.slice(0, 160) ?? undefined,
    openGraph: {
      title,
      description: tv.overview ?? undefined,
      images: tv.posterUrl ? [{ url: getImageUrl(tv.posterUrl, 'w500') }] : [],
      type: 'video.tv_show',
    },
  };
}

function SimilarTvCard({ tv }: { tv: TvSummary }) {
  const year = formatYear(tv.firstAirDate);
  const score = tv.voteAverage || tv.tmdbVoteAverage || 0;

  return (
    <Link href={ROUTES.TV_SHOW(tv.id)} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-800 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-black/60">
        <Image
          src={getImageUrl(tv.posterUrl, 'w342')}
          alt={tv.title}
          fill
          sizes="140px"
          className="object-cover"
        />
        {score > 0 && (
          <div className="absolute right-1.5 top-1.5">
            <span
              className={`rounded px-1 py-0.5 text-xs font-semibold tabular-nums ${getRatingColor(score)} bg-slate-900/80`}
            >
              {score.toFixed(1)}
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 space-y-0.5">
        <p className="line-clamp-1 text-xs font-medium text-white transition-colors group-hover:text-blue-400">
          {tv.title}
        </p>
        <p className="text-xs text-slate-500">{year}</p>
      </div>
    </Link>
  );
}

export default async function TvDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tvId = Number(id);

  if (isNaN(tvId)) notFound();

  const [tvRes, similarRes] = await Promise.all([
    safeFetch<TvDetailResponse>(`/tv/${tvId}`),
    safeFetch<SimilarResponse>(`/tv/${tvId}/similar`),
  ]);

  if (!tvRes) notFound();

  const tv = tvRes.data;
  const similar = similarRes?.data ?? [];

  const posters = tv.images.filter((img) => img.type === 'poster');
  const backdrops = tv.images.filter((img) => img.type === 'backdrop');
  const hasMedia = tv.trailers.length > 0 || posters.length > 0 || backdrops.length > 0;

  return (
    <div className="min-h-screen bg-slate-900">
      <TvHero tv={tv} />

      {/* 2-column layout */}
      <div className="mx-auto max-w-7xl px-4 md:px-7">
        <div className="flex flex-col gap-6 py-6 lg:flex-row">
          {/* Main content */}
          <div className="min-w-0 flex-1 space-y-10">
            {tv.cast.length > 0 && (
              <CastCarousel cast={tv.cast} mediaId={tv.id} mediaType="tv" />
            )}

            {hasMedia && (
              <MediaTabs
                trailers={tv.trailers}
                posters={posters}
                backdrops={backdrops}
              />
            )}

            <CommentSection movieId={tv.id} mediaType="tv" />

            {similar.length > 0 && (
              <section aria-label="Series tương tự">
                <h2 className="mb-4 text-lg font-medium text-white">Series tương tự</h2>
                <ScrollableRow>
                  {similar.slice(0, 16).map((show) => (
                    <div key={show.id} className="w-[140px] flex-shrink-0">
                      <SimilarTvCard tv={show} />
                    </div>
                  ))}
                </ScrollableRow>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-[260px] lg:flex-shrink-0">
            <div className="lg:sticky lg:top-6">
              <TvSidebar tv={tv} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
