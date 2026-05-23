'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Film,
  MessageSquare,
  RefreshCw,
  Star,
  Tv,
  Users,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { adminApi, movieApi, tvApi } from '@/lib/api';
import type {
  AdminStats,
  GenreDistributionItem,
  RatingsChartPoint,
  TmdbSyncLog,
  TopMovieChartItem,
} from '@/types';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDuration(start: string, end: string | null) {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | null;
  icon: React.ElementType;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="rounded-xl bg-slate-800 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <div className={cn('rounded-lg p-2', color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-white">
        {value === null ? (
          <span className="inline-block h-8 w-20 animate-pulse rounded bg-slate-700" />
        ) : (
          value.toLocaleString()
        )}
      </p>
    </div>
  );
}

function SyncStatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; color: string }> = {
    SUCCESS: { icon: CheckCircle2, color: 'text-emerald-400' },
    COMPLETED_WITH_ERRORS: { icon: AlertCircle, color: 'text-amber-400' },
    FAILED: { icon: XCircle, color: 'text-red-400' },
    RUNNING: { icon: RefreshCw, color: 'text-blue-400 animate-spin' },
  };
  const cfg = map[status] ?? { icon: Clock, color: 'text-slate-400' };
  const { icon: Icon, color } = cfg;
  return (
    <span className={cn('flex items-center gap-1 text-xs font-medium', color)}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [movieCount, setMovieCount] = useState<number | null>(null);
  const [tvCount, setTvCount] = useState<number | null>(null);
  const [syncLogs, setSyncLogs] = useState<TmdbSyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const [ratingsChart, setRatingsChart] = useState<RatingsChartPoint[]>([]);
  const [topMovies, setTopMovies] = useState<TopMovieChartItem[]>([]);
  const [genreChart, setGenreChart] = useState<GenreDistributionItem[]>([]);

  useEffect(() => {
    adminApi.getStats().then((r) => setStats(r.data.data)).catch(() => setStats({ totalUsers: 0, totalRatings: 0, totalComments: 0 }));
    movieApi.getMovies({ limit: 1 }).then((r) => setMovieCount(r.data.meta.total)).catch(() => setMovieCount(0));
    tvApi.getTvShows({ limit: 1 }).then((r) => setTvCount(r.data.meta.total)).catch(() => setTvCount(0));

    adminApi
      .tmdbSyncLogs({ limit: 10 })
      .then((r) => setSyncLogs(r.data.data))
      .catch(() => undefined)
      .finally(() => setLogsLoading(false));

    adminApi.getChartRatings(30).then((r) => setRatingsChart(r.data.data)).catch(() => undefined);
    adminApi.getChartTopMovies(30, 10).then((r) => setTopMovies(r.data.data)).catch(() => undefined);
    adminApi.getChartGenreDistribution(8).then((r) => setGenreChart(r.data.data)).catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Tổng quan hệ thống CineDB</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Tổng phim" value={movieCount} icon={Film} color="bg-blue-500" />
        <StatCard label="TV Series" value={tvCount} icon={Tv} color="bg-purple-500" />
        <StatCard label="Người dùng" value={stats?.totalUsers ?? null} icon={Users} color="bg-emerald-500" />
        <StatCard label="Đánh giá" value={stats?.totalRatings ?? null} icon={Star} color="bg-amber-500" />
        <StatCard label="Bình luận" value={stats?.totalComments ?? null} icon={MessageSquare} color="bg-rose-500" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ratings time series */}
        <div className="rounded-xl bg-slate-800 p-5">
          <h2 className="mb-4 font-semibold text-white">Đánh giá mới (30 ngày)</h2>
          {ratingsChart.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-500">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ratingsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Line type="monotone" dataKey="totalRatings" stroke="#3b82f6" strokeWidth={2} dot={false} name="Đánh giá" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Genre distribution */}
        <div className="rounded-xl bg-slate-800 p-5">
          <h2 className="mb-4 font-semibold text-white">Phân bố thể loại</h2>
          {genreChart.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-500">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={genreChart}
                  dataKey="totalCount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                >
                  {/* eslint-disable-next-line @typescript-eslint/no-deprecated */}
                  {genreChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                  formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top movies bar chart */}
      <div className="rounded-xl bg-slate-800 p-5">
        <h2 className="mb-4 font-semibold text-white">Top 10 phim được đánh giá nhiều nhất (30 ngày)</h2>
        {topMovies.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">Chưa có dữ liệu</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topMovies} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="title"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={120}
                tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 18)}…` : v)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }}
                itemStyle={{ color: '#60a5fa' }}
                cursor={{ fill: '#1e293b' }}
              />
              <Bar dataKey="totalRatings" name="Đánh giá" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent sync logs */}
      <div className="rounded-xl bg-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-700 px-5 py-4">
          <Database className="h-4 w-4 text-slate-400" />
          <h2 className="font-semibold text-white">Lịch sử đồng bộ TMDB</h2>
        </div>

        {logsLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-700" />
            ))}
          </div>
        ) : syncLogs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Chưa có lịch sử đồng bộ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Loại</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Xử lý</th>
                  <th className="px-5 py-3">Tạo mới</th>
                  <th className="px-5 py-3">Cập nhật</th>
                  <th className="px-5 py-3">Lỗi</th>
                  <th className="px-5 py-3">Thời lượng</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {syncLogs.map((log) => (
                  <tr key={log.id} className="text-slate-300 hover:bg-slate-700/30">
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{log.syncType}</td>
                    <td className="px-5 py-3">{log.entityType}</td>
                    <td className="px-5 py-3 text-center">{log.totalProcessed}</td>
                    <td className="px-5 py-3 text-center text-emerald-400">{log.totalCreated}</td>
                    <td className="px-5 py-3 text-center text-blue-400">{log.totalUpdated}</td>
                    <td className="px-5 py-3 text-center text-red-400">{log.totalErrors}</td>
                    <td className="px-5 py-3">{fmtDuration(log.startedAt, log.completedAt)}</td>
                    <td className="px-5 py-3">
                      <SyncStatusBadge status={log.status} />
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-500">
                      {fmtDate(log.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
