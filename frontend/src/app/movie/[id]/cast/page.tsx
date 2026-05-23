import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

import { ROUTES } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';
import type { CastMember, CrewMember, MovieDetail } from '@/types';

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

const DEPT_ORDER = [
  'Directing',
  'Writing',
  'Production',
  'Camera',
  'Editing',
  'Sound',
  'Art',
  'Visual Effects',
  'Costume & Make-Up',
];

function groupByDepartment(crew: CrewMember[]): [string, CrewMember[]][] {
  const map: Record<string, CrewMember[]> = {};
  for (const member of crew) {
    const dept = member.department || 'Other';
    if (!map[dept]) map[dept] = [];
    map[dept].push(member);
  }
  return Object.entries(map).sort(([a], [b]) => {
    const ai = DEPT_ORDER.indexOf(a);
    const bi = DEPT_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}

function PersonRow({
  name,
  profileUrl,
  subtitle,
  href,
}: {
  name: string;
  profileUrl: string | null;
  subtitle: string;
  href: string;
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-800 p-3 transition-colors hover:bg-slate-700/80">
      <Link href={href} className="flex-shrink-0">
        {profileUrl ? (
          <div className="relative h-16 w-16 overflow-hidden rounded-full">
            <Image
              src={getImageUrl(profileUrl, 'w185')}
              alt={name}
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
            <span className="text-sm font-medium text-slate-400">{initials}</span>
          </div>
        )}
      </Link>
      <div className="min-w-0">
        <Link
          href={href}
          className="block text-sm font-medium text-slate-100 transition-colors hover:text-blue-400"
        >
          {name}
        </Link>
        <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const res = await safeFetch<MovieDetailResponse>(`/movies/${id}`);
  if (!res) return { title: 'Cast & Crew' };
  return { title: `Cast & Crew — ${res.data.title} — CineDB` };
}

export default async function MovieCastPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movieId = Number(id);

  if (isNaN(movieId)) notFound();

  const res = await safeFetch<MovieDetailResponse>(`/movies/${movieId}`);
  if (!res) notFound();

  const movie = res.data;
  const crewByDept = groupByDepartment(movie.crew);

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-7">
        {/* Breadcrumb */}
        <Link
          href={ROUTES.MOVIE(movieId)}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          <span>←</span>
          <span>Quay lại {movie.title}</span>
        </Link>

        <h1 className="mb-8 text-2xl font-semibold text-white">
          Cast &amp; Crew — {movie.title}
        </h1>

        {/* Cast */}
        {movie.cast.length > 0 && (
          <section className="mb-10" aria-label="Diễn viên">
            <h2 className="mb-4 text-lg font-medium text-white">
              Diễn viên ({movie.cast.length})
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {movie.cast.map((member: CastMember) => (
                <PersonRow
                  key={member.person.id}
                  name={member.person.name}
                  profileUrl={member.person.profileUrl}
                  subtitle={member.character}
                  href={ROUTES.PERSON(member.person.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Crew grouped by department */}
        {crewByDept.length > 0 && (
          <section aria-label="Đội ngũ sản xuất">
            <h2 className="mb-6 text-lg font-medium text-white">Đội ngũ sản xuất</h2>
            <div className="space-y-8">
              {crewByDept.map(([dept, members]) => (
                <div key={dept}>
                  <h3 className="mb-2 text-base font-medium text-slate-300">{dept}</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {members.map((member, idx) => (
                      <PersonRow
                        key={`${member.person.id}-${idx}`}
                        name={member.person.name}
                        profileUrl={member.person.profileUrl}
                        subtitle={member.job}
                        href={ROUTES.PERSON(member.person.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
