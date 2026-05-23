import Image from 'next/image';

import { MovieActions } from '@/components/movie/MovieActions';
import { formatDate, formatRuntime, formatYear, getImageUrl } from '@/lib/utils';
import type { CrewMember, MovieDetail } from '@/types';

export interface MovieHeroProps {
  movie: MovieDetail;
}

function getRatingHex(score: number): string {
  if (score === 0) return '#475569';
  if (score >= 7) return '#10b981';
  if (score >= 5) return '#f59e0b';
  return '#ef4444';
}

const CIRCUMFERENCE = 144.5;

function ScoreCircle({ score }: { score: number }) {
  const color = getRatingHex(score);
  const offset = score > 0 ? CIRCUMFERENCE - (CIRCUMFERENCE * score) / 10 : CIRCUMFERENCE;

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-label={`Điểm: ${score}`}>
      <circle cx="26" cy="26" r="23" fill="#0f172a" stroke="#1e293b" strokeWidth="3" />
      <circle
        cx="26"
        cy="26"
        r="23"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 26 26)"
        strokeLinecap="round"
      />
      {score > 0 ? (
        <>
          <text x="26" y="23" textAnchor="middle" fill={color} fontSize="14" fontWeight="500">
            {(score * 10).toFixed(0)}
          </text>
          <text x="26" y="33" textAnchor="middle" fill="#64748b" fontSize="8">
            User score
          </text>
        </>
      ) : (
        <text x="26" y="30" textAnchor="middle" fill={color} fontSize="11" fontWeight="500">
          NR
        </text>
      )}
    </svg>
  );
}

function CrewList({ crew }: { crew: CrewMember[] }) {
  const jobs = ['Director', 'Writer', 'Producer'];
  const featured = jobs
    .map((job) => {
      const members = crew.filter((c) => c.job === job);
      return members.length > 0 ? { job, names: members.map((m) => m.person.name) } : null;
    })
    .filter((item): item is { job: string; names: string[] } => item !== null)
    .slice(0, 4);

  if (featured.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
      {featured.map(({ job, names }) => (
        <div key={job}>
          <p className="text-sm font-medium text-slate-200">{names.join(', ')}</p>
          <p className="text-xs text-slate-500">{job}</p>
        </div>
      ))}
    </div>
  );
}

export function MovieHero({ movie }: MovieHeroProps) {
  const score = movie.voteAverage || movie.tmdbVoteAverage || 0;
  const backdropUrl = movie.backdropUrl ? getImageUrl(movie.backdropUrl, 'w1280') : null;
  const year = formatYear(movie.releaseDate);

  return (
    <section
      aria-label={`${movie.title} hero`}
      className="relative min-h-[300px] md:min-h-[420px]"
      /* backgroundImage requires inline style — dynamic URL can't be a Tailwind class */
      style={
        backdropUrl
          ? {
              backgroundImage: `linear-gradient(to right, #0f172aee 38%, #0f172a99 65%, #0f172a33), url(${backdropUrl})`,
              backgroundPosition: 'center 20%',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
            }
          : { backgroundColor: '#0f172a' }
      }
    >
      {/* Bottom fade into page bg */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-900" />

      <div className="relative flex gap-6 px-7 py-8 md:py-10">
        {/* Poster — desktop only */}
        <div className="hidden h-[300px] w-[200px] flex-shrink-0 overflow-hidden rounded-xl border-2 border-white/10 bg-slate-800 md:block">
          {movie.posterUrl && (
            <Image
              src={getImageUrl(movie.posterUrl, 'w342')}
              alt={movie.title}
              width={200}
              height={300}
              className="h-full w-full object-cover"
              priority
            />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col pt-3">
          {/* Title */}
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            {movie.title}{' '}
            {year && <span className="font-normal text-slate-400">({year})</span>}
          </h1>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            {movie.releaseDate && (
              <span>{formatDate(movie.releaseDate, 'dd/MM/yyyy')}</span>
            )}
            {movie.genres.length > 0 && (
              <>
                <span className="text-slate-600">·</span>
                <div className="flex flex-wrap gap-1.5">
                  {movie.genres.map((g) => (
                    <span
                      key={g.id}
                      className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs text-blue-400"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </>
            )}
            {movie.runtime && (
              <>
                <span className="text-slate-600">·</span>
                <span>{formatRuntime(movie.runtime)}</span>
              </>
            )}
          </div>

          {/* Score + actions */}
          <div className="my-4 flex flex-wrap items-center gap-4">
            <ScoreCircle score={score} />
            <MovieActions
              movieId={movie.id}
              movieTitle={movie.title}
              trailers={movie.trailers}
            />
          </div>

          {/* Tagline */}
          {movie.tagline && (
            <p className="mb-2 text-sm italic text-slate-500">{movie.tagline}</p>
          )}

          {/* Overview */}
          {movie.overview && (
            <div>
              <h3 className="mb-1 text-base font-medium text-slate-200">Overview</h3>
              <p className="max-w-xl leading-relaxed text-slate-300">{movie.overview}</p>
            </div>
          )}

          {/* Key crew */}
          <CrewList crew={movie.crew} />
        </div>
      </div>
    </section>
  );
}
