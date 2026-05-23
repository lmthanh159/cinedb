import { formatNumber, getRatingColor } from '@/lib/utils';
import type { MovieDetail } from '@/types';

export interface MovieSidebarProps {
  movie: MovieDetail;
}

function FactItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-200">{value}</p>
    </div>
  );
}

function ScoreBox({
  score,
  voteCount,
  label,
  color,
}: {
  score: number;
  voteCount: number;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-slate-800 p-3 text-center">
      <p className={`text-3xl font-medium ${color}`}>{score.toFixed(1)}</p>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{voteCount.toLocaleString('vi-VN')} đánh giá</p>
    </div>
  );
}

export function MovieSidebar({ movie }: MovieSidebarProps) {
  const budget = movie.budget ? Number(movie.budget) : 0;
  const revenue = movie.revenue ? Number(movie.revenue) : 0;

  return (
    <aside className="space-y-4">
      {/* Facts */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Facts</p>

        {movie.status && <FactItem label="Trạng thái" value={movie.status} />}
        {movie.language && (
          <FactItem label="Ngôn ngữ gốc" value={movie.language.toUpperCase()} />
        )}
        {budget > 0 && (
          <FactItem label="Ngân sách" value={`$${formatNumber(budget)}`} />
        )}
        {revenue > 0 && (
          <FactItem label="Doanh thu" value={`$${formatNumber(revenue)}`} />
        )}
        {movie.companies.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-slate-500">Hãng sản xuất</p>
            {movie.companies.slice(0, 3).map((c) => (
              <p key={c.id} className="mt-0.5 text-sm font-medium text-slate-200">
                {c.name}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Score boxes */}
      {movie.voteAverage > 0 && (
        <ScoreBox
          score={movie.voteAverage}
          voteCount={movie.voteCount}
          label="CineDB Score"
          color={getRatingColor(movie.voteAverage)}
        />
      )}
      {movie.stats.tmdbVoteAverage > 0 && (
        <ScoreBox
          score={movie.stats.tmdbVoteAverage}
          voteCount={movie.stats.tmdbVoteCount}
          label="TMDB Score"
          color="text-blue-400"
        />
      )}
    </aside>
  );
}
