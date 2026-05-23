import { formatDate, getRatingColor } from '@/lib/utils';
import type { TvDetail } from '@/types';

export interface TvSidebarProps {
  tv: TvDetail;
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

export function TvSidebar({ tv }: TvSidebarProps) {
  return (
    <aside className="space-y-4">
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Facts</p>

        {tv.status && <FactItem label="Trạng thái" value={tv.status} />}
        {tv.numberOfSeasons > 0 && (
          <FactItem label="Số mùa" value={String(tv.numberOfSeasons)} />
        )}
        {tv.numberOfEpisodes > 0 && (
          <FactItem label="Số tập" value={String(tv.numberOfEpisodes)} />
        )}
        {tv.firstAirDate && (
          <FactItem label="Phát sóng đầu" value={formatDate(tv.firstAirDate, 'dd/MM/yyyy')} />
        )}
        {tv.lastAirDate && (
          <FactItem label="Phát sóng cuối" value={formatDate(tv.lastAirDate, 'dd/MM/yyyy')} />
        )}
        {tv.companies.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-slate-500">Hãng sản xuất</p>
            {tv.companies.slice(0, 3).map((c) => (
              <p key={c.id} className="mt-0.5 text-sm font-medium text-slate-200">
                {c.name}
              </p>
            ))}
          </div>
        )}
      </div>

      {tv.voteAverage > 0 && (
        <ScoreBox
          score={tv.voteAverage}
          voteCount={tv.voteCount}
          label="CineDB Score"
          color={getRatingColor(tv.voteAverage)}
        />
      )}
      {tv.stats.tmdbVoteAverage > 0 && (
        <ScoreBox
          score={tv.stats.tmdbVoteAverage}
          voteCount={tv.stats.tmdbVoteCount}
          label="TMDB Score"
          color="text-blue-400"
        />
      )}
    </aside>
  );
}
