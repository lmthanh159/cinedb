import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

import { BiographySection } from './_client';
import { ScrollableRow } from '@/components/ui/ScrollableRow';
import { ROUTES } from '@/lib/constants';
import { formatDate, formatYear, getImageUrl } from '@/lib/utils';
import type { MediaImage, PersonCredits, PersonDetail, PersonTvCredits } from '@/types';

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

type PersonResponse = { data: PersonDetail };
type MovieCreditsResponse = { data: PersonCredits };
type TvCreditsResponse = { data: PersonTvCredits };
type ImagesResponse = { data: { images: MediaImage[] } };

const GENDER_LABEL: Record<string, string> = {
  FEMALE: 'Nữ',
  MALE: 'Nam',
  NON_BINARY: 'Non-binary',
  UNKNOWN: '—',
};

function calculateAge(birthday: string, deathday?: string | null): number {
  const end = deathday ? new Date(deathday) : new Date();
  const birth = new Date(birthday);
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
  return age;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const res = await safeFetch<PersonResponse>(`/person/${id}`);
  if (!res) return { title: 'Không tìm thấy' };

  const person = res.data;
  return {
    title: `${person.name} — CineDB`,
    description: person.biography?.slice(0, 160) ?? undefined,
    openGraph: {
      title: person.name,
      description: person.biography?.slice(0, 160) ?? undefined,
      images: person.profileUrl ? [{ url: getImageUrl(person.profileUrl, 'w500') }] : [],
    },
  };
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const personId = Number(id);

  if (isNaN(personId)) notFound();

  const [personRes, movieCreditsRes, tvCreditsRes, imagesRes] = await Promise.all([
    safeFetch<PersonResponse>(`/person/${personId}`),
    safeFetch<MovieCreditsResponse>(`/person/${personId}/movie-credits`),
    safeFetch<TvCreditsResponse>(`/person/${personId}/tv-credits`),
    safeFetch<ImagesResponse>(`/person/${personId}/images`),
  ]);

  if (!personRes) notFound();

  const person = personRes.data;

  const movieCast = [...(movieCreditsRes?.data.cast ?? [])]
    .sort((a, b) => (b.movie.releaseDate ?? '').localeCompare(a.movie.releaseDate ?? ''))
    .slice(0, 20);

  const tvCast = [...(tvCreditsRes?.data.cast ?? [])]
    .sort((a, b) => (b.series.firstAirDate ?? '').localeCompare(a.series.firstAirDate ?? ''))
    .slice(0, 20);

  const profileImages = (imagesRes?.data.images ?? [])
    .filter((img) => img.type === 'profile')
    .slice(0, 15);

  type FilmographyItem = {
    key: string;
    year: string;
    title: string;
    role: string;
    mediaType: 'Movie' | 'TV';
    href: string;
  };

  const allMovieItems: FilmographyItem[] = (movieCreditsRes?.data.cast ?? []).map((c) => ({
    key: `movie-${c.movie.id}`,
    year: formatYear(c.movie.releaseDate),
    title: c.movie.title,
    role: c.character ?? '—',
    mediaType: 'Movie',
    href: ROUTES.MOVIE(c.movie.id),
  }));

  const allTvItems: FilmographyItem[] = (tvCreditsRes?.data.cast ?? []).map((c) => ({
    key: `tv-${c.series.id}`,
    year: formatYear(c.series.firstAirDate),
    title: c.series.title,
    role: c.character ?? '—',
    mediaType: 'TV',
    href: ROUTES.TV_SHOW(c.series.id),
  }));

  const filmography = [...allMovieItems, ...allTvItems]
    .sort((a, b) => (b.year || '0').localeCompare(a.year || '0'))
    .slice(0, 40);

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-7">
        {/* Hero */}
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Profile image */}
          <div className="flex-shrink-0">
            <div className="relative h-[375px] w-[250px] overflow-hidden rounded-xl bg-slate-800">
              <Image
                src={getImageUrl(person.profileUrl, 'w342')}
                alt={person.name}
                width={250}
                height={375}
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-semibold text-white">{person.name}</h1>
            {person.knownForDepartment && (
              <p className="mt-1 text-sm text-slate-400">
                Known for: {person.knownForDepartment}
              </p>
            )}

            {person.biography && (
              <div className="mt-4">
                <h3 className="mb-2 text-lg font-medium text-white">Tiểu sử</h3>
                <BiographySection biography={person.biography} />
              </div>
            )}

            {/* Personal info grid */}
            <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {person.birthday && (
                <div>
                  <p className="text-xs text-slate-500">Ngày sinh</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-200">
                    {formatDate(person.birthday, 'dd/MM/yyyy')}
                    {!person.deathday &&
                      ` (${calculateAge(person.birthday)} tuổi)`}
                  </p>
                </div>
              )}
              {person.deathday && (
                <div>
                  <p className="text-xs text-slate-500">Ngày mất</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-500">
                    {formatDate(person.deathday, 'dd/MM/yyyy')}
                    {person.birthday &&
                      ` (${calculateAge(person.birthday, person.deathday)} tuổi)`}
                  </p>
                </div>
              )}
              {person.placeOfBirth && (
                <div>
                  <p className="text-xs text-slate-500">Nơi sinh</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-200">
                    {person.placeOfBirth}
                  </p>
                </div>
              )}
              {person.gender && person.gender !== 'UNKNOWN' && (
                <div>
                  <p className="text-xs text-slate-500">Giới tính</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-200">
                    {GENDER_LABEL[person.gender] ?? '—'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Movie credits */}
        {movieCast.length > 0 && (
          <section className="mt-10" aria-label="Phim nổi bật">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Phim nổi bật</h2>
              <a
                href="#filmography"
                className="text-sm text-blue-400 transition-colors hover:text-blue-300"
              >
                Xem tất cả filmography →
              </a>
            </div>
            <ScrollableRow>
              {movieCast.map((credit) => (
                <Link
                  key={`movie-${credit.movie.id}`}
                  href={ROUTES.MOVIE(credit.movie.id)}
                  className="group w-[130px] flex-shrink-0"
                >
                  <div className="relative h-[195px] w-[130px] overflow-hidden rounded-lg bg-slate-800">
                    <Image
                      src={getImageUrl(credit.movie.posterUrl, 'w185')}
                      alt={credit.movie.title}
                      fill
                      sizes="130px"
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="line-clamp-1 text-xs font-medium text-slate-100 transition-colors group-hover:text-blue-400">
                      {credit.movie.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatYear(credit.movie.releaseDate)}
                    </p>
                    {credit.character && (
                      <p className="line-clamp-1 text-xs italic text-slate-600">
                        {credit.character}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </ScrollableRow>
          </section>
        )}

        {/* TV credits */}
        {tvCast.length > 0 && (
          <section className="mt-10" aria-label="TV Shows">
            <h2 className="mb-4 text-lg font-medium text-white">TV Shows</h2>
            <ScrollableRow>
              {tvCast.map((credit) => (
                <Link
                  key={`tv-${credit.series.id}`}
                  href={ROUTES.TV_SHOW(credit.series.id)}
                  className="group w-[130px] flex-shrink-0"
                >
                  <div className="relative h-[195px] w-[130px] overflow-hidden rounded-lg bg-slate-800">
                    <Image
                      src={getImageUrl(credit.series.posterUrl, 'w185')}
                      alt={credit.series.title}
                      fill
                      sizes="130px"
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="line-clamp-1 text-xs font-medium text-slate-100 transition-colors group-hover:text-blue-400">
                      {credit.series.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatYear(credit.series.firstAirDate)}
                    </p>
                    {credit.character && (
                      <p className="line-clamp-1 text-xs italic text-slate-600">
                        {credit.character}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </ScrollableRow>
          </section>
        )}

        {/* Profile photos */}
        {profileImages.length > 0 && (
          <section className="mt-10" aria-label="Ảnh">
            <h2 className="mb-4 text-lg font-medium text-white">Ảnh</h2>
            <ScrollableRow>
              {profileImages.map((img) => (
                <div
                  key={img.id}
                  className="relative h-[225px] w-[150px] flex-shrink-0 overflow-hidden rounded-lg bg-slate-800"
                >
                  <Image
                    src={getImageUrl(img.filePath, 'w185')}
                    alt={person.name}
                    fill
                    sizes="150px"
                    className="object-cover"
                  />
                </div>
              ))}
            </ScrollableRow>
          </section>
        )}

        {/* Filmography table */}
        {filmography.length > 0 && (
          <section className="mt-10" id="filmography" aria-label="Filmography">
            <h2 className="mb-4 text-lg font-medium text-white">Filmography</h2>
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="w-16 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Năm
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Tên
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:table-cell">
                      Vai diễn
                    </th>
                    <th className="hidden w-16 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 md:table-cell">
                      Loại
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filmography.map((item) => (
                    <tr key={item.key} className="transition-colors hover:bg-slate-800/50">
                      <td className="px-4 py-3 text-slate-500">{item.year || '—'}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={item.href}
                          className="font-medium text-slate-200 transition-colors hover:text-blue-400"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">
                        {item.role}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span
                          className={
                            item.mediaType === 'Movie'
                              ? 'rounded px-1.5 py-0.5 text-xs font-medium bg-blue-500/15 text-blue-400'
                              : 'rounded px-1.5 py-0.5 text-xs font-medium bg-purple-500/15 text-purple-400'
                          }
                        >
                          {item.mediaType}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
