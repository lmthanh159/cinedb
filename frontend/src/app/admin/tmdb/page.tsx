'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';

import { adminApi } from '@/lib/api';
import type { TmdbFullImportResult, TmdbSyncLog } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/store/toast-store';

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

// ─── Import result banner ──────────────────────────────────────────────────────

function ImportResult({ result }: { result: TmdbFullImportResult }) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <div className="mb-2 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <span className="font-semibold text-emerald-400">Import hoàn tất</span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        {(['movies', 'tvSeries'] as const).map((key) => {
          const stats = result[key];
          const label = key === 'movies' ? 'Phim' : 'TV Series';
          return (
            <div key={key} className="rounded-lg bg-slate-800 p-3">
              <p className="mb-1 font-medium text-slate-300">{label}</p>
              <ul className="space-y-0.5 text-xs text-slate-400">
                <li>Xử lý: <span className="text-white">{stats.totalProcessed}</span></li>
                <li>Tạo mới: <span className="text-emerald-400">{stats.totalCreated}</span></li>
                <li>Cập nhật: <span className="text-blue-400">{stats.totalUpdated}</span></li>
                <li>Lỗi: <span className="text-red-400">{stats.totalErrors}</span></li>
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function SyncStatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    SUCCESS: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Thành công' },
    COMPLETED_WITH_ERRORS: { icon: AlertCircle, color: 'text-amber-400', label: 'Có lỗi' },
    FAILED: { icon: XCircle, color: 'text-red-400', label: 'Thất bại' },
    RUNNING: { icon: RefreshCw, color: 'text-blue-400 animate-spin', label: 'Đang chạy' },
  };
  const cfg = map[status] ?? { icon: Clock, color: 'text-slate-400', label: status };
  const { icon: Icon, color, label } = cfg;
  return (
    <span className={cn('flex items-center gap-1 text-xs font-medium', color)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTmdbPage() {
  // Full import form
  const [moviePages, setMoviePages] = useState(10);
  const [tvPages, setTvPages] = useState(5);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<TmdbFullImportResult | null>(null);

  // Daily sync
  const [syncing, setSyncing] = useState(false);

  // Quick import by TMDB ID
  const [quickMovieId, setQuickMovieId] = useState('');
  const [quickTvId, setQuickTvId] = useState('');
  const [quickImportingMovie, setQuickImportingMovie] = useState(false);
  const [quickImportingTv, setQuickImportingTv] = useState(false);

  // Sync logs
  const [logs, setLogs] = useState<TmdbSyncLog[]>([]);
  const [logsMeta, setLogsMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState('');

  const fetchLogs = (page: number, entityType?: string, showLoading = true) => {
    if (showLoading) setLogsLoading(true);
    adminApi
      .tmdbSyncLogs({ page, limit: 15, entityType: entityType || undefined })
      .then((r) => {
        setLogs(r.data.data);
        setLogsMeta({
          page: r.data.meta.page,
          totalPages: r.data.meta.totalPages,
          total: r.data.meta.total,
        });
      })
      .catch(() => undefined)
      .finally(() => setLogsLoading(false));
  };

  useEffect(() => {
    fetchLogs(1, undefined, false);
    // logsLoading is initialized to true; skip redundant setState in effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await adminApi.tmdbImportFull(moviePages, tvPages);
      setImportResult(res.data.data);
      toast.success('Import TMDB thành công!');
      fetchLogs(1, filterEntity);
    } catch {
      toast.error('Import thất bại. Vui lòng thử lại.');
    } finally {
      setImporting(false);
    }
  };

  const handleDailySync = async () => {
    setSyncing(true);
    try {
      await adminApi.tmdbSyncDaily();
      toast.success('Daily sync hoàn tất!');
      fetchLogs(1, filterEntity);
    } catch {
      toast.error('Daily sync thất bại.');
    } finally {
      setSyncing(false);
    }
  };

  const handleQuickImportMovie = async () => {
    const id = Number(quickMovieId.trim());
    if (!id) return;
    setQuickImportingMovie(true);
    try {
      await adminApi.tmdbImportMovie(id);
      toast.success(`Đã import phim TMDB #${id}`);
      setQuickMovieId('');
    } catch {
      toast.error('Import thất bại.');
    } finally {
      setQuickImportingMovie(false);
    }
  };

  const handleQuickImportTv = async () => {
    const id = Number(quickTvId.trim());
    if (!id) return;
    setQuickImportingTv(true);
    try {
      await adminApi.tmdbImportTv(id);
      toast.success(`Đã import TV series TMDB #${id}`);
      setQuickTvId('');
    } catch {
      toast.error('Import thất bại.');
    } finally {
      setQuickImportingTv(false);
    }
  };

  const handleLogsFilter = (entity: string) => {
    setFilterEntity(entity);
    setLogsPage(1);
    fetchLogs(1, entity);
  };

  const handleLogsPage = (page: number) => {
    setLogsPage(page);
    fetchLogs(page, filterEntity);
  };

  const lastSync = logs.find((l) => l.status !== 'RUNNING');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">TMDB Sync</h1>
        <p className="mt-1 text-sm text-slate-400">
          Nhập và đồng bộ dữ liệu phim từ The Movie Database
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Full Import */}
        <div className="rounded-xl bg-slate-800 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-400" />
            <h2 className="font-semibold text-white">Full Import</h2>
          </div>
          <p className="mb-5 text-sm text-slate-400">
            Nhập hàng loạt phim và TV series từ TMDB theo số trang.
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Số trang Phim: <span className="text-blue-400">{moviePages}</span>
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={moviePages}
                onChange={(e) => setMoviePages(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>1</span>
                <span>≈ {moviePages * 20} phim</span>
                <span>100</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Số trang TV Series: <span className="text-purple-400">{tvPages}</span>
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={tvPages}
                onChange={(e) => setTvPages(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>1</span>
                <span>≈ {tvPages * 20} series</span>
                <span>100</span>
              </div>
            </div>

            {importResult && <ImportResult result={importResult} />}

            <button
              onClick={handleImport}
              disabled={importing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang import…
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Bắt đầu Import
                </>
              )}
            </button>
          </div>
        </div>

        {/* Daily Sync */}
        <div className="rounded-xl bg-slate-800 p-6">
          <div className="mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold text-white">Daily Sync</h2>
          </div>
          <p className="mb-5 text-sm text-slate-400">
            Đồng bộ các thay đổi gần đây từ TMDB (phim mới, cập nhật metadata).
          </p>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
              <p className="text-xs text-amber-300">
                Daily sync sử dụng TMDB Changes API để cập nhật incremental.
                Nên chạy tối đa 1 lần/ngày.
              </p>
            </div>
          </div>

          {lastSync?.completedAt && (
            <p className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              Lần cuối: {fmtDate(lastSync.completedAt)}
            </p>
          )}

          <button
            onClick={handleDailySync}
            disabled={syncing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang đồng bộ…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Chạy Daily Sync
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Import by TMDB ID */}
      <div className="rounded-xl bg-slate-800 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-5 w-5 text-violet-400" />
          <h2 className="font-semibold text-white">Quick Import by TMDB ID</h2>
        </div>
        <p className="mb-5 text-sm text-slate-400">
          Nhập trực tiếp TMDB ID để import một phim hoặc TV series mà không cần tìm kiếm.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Phim — Movie TMDB ID
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={quickMovieId}
                onChange={(e) => setQuickMovieId(e.target.value)}
                placeholder="e.g. 550"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleQuickImportMovie}
                disabled={!quickMovieId.trim() || quickImportingMovie}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {quickImportingMovie ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Import
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              TV Series — TV TMDB ID
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={quickTvId}
                onChange={(e) => setQuickTvId(e.target.value)}
                placeholder="e.g. 1399"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={handleQuickImportTv}
                disabled={!quickTvId.trim() || quickImportingTv}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-purple-500/10 px-3 py-2 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {quickImportingTv ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Import
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Logs */}
      <div className="rounded-xl bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-white">
              Lịch sử đồng bộ
              {logsMeta.total > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({logsMeta.total})
                </span>
              )}
            </h2>
          </div>
          <div className="flex gap-2">
            {['', 'MOVIE', 'TV_SERIES'].map((val) => (
              <button
                key={val}
                onClick={() => handleLogsFilter(val)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  filterEntity === val
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white',
                )}
              >
                {val === '' ? 'Tất cả' : val === 'MOVIE' ? 'Phim' : 'TV Series'}
              </button>
            ))}
            <button
              onClick={() => fetchLogs(logsPage, filterEntity)}
              className="rounded-lg bg-slate-700 p-1.5 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white"
              aria-label="Tải lại"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {logsLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-700" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Chưa có dữ liệu</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Loại sync</th>
                    <th className="px-5 py-3">Entity</th>
                    <th className="px-5 py-3 text-center">Xử lý</th>
                    <th className="px-5 py-3 text-center">Tạo</th>
                    <th className="px-5 py-3 text-center">Cập nhật</th>
                    <th className="px-5 py-3 text-center">Lỗi</th>
                    <th className="px-5 py-3">Thời lượng</th>
                    <th className="px-5 py-3">Trạng thái</th>
                    <th className="px-5 py-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="text-slate-300 hover:bg-slate-700/30">
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{log.syncType}</td>
                      <td className="px-5 py-3 text-xs">{log.entityType}</td>
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

            {/* Pagination */}
            {logsMeta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-700 px-5 py-3">
                <p className="text-xs text-slate-500">
                  Trang {logsMeta.page} / {logsMeta.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLogsPage(logsPage - 1)}
                    disabled={logsPage <= 1}
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Trước
                  </button>
                  <button
                    onClick={() => handleLogsPage(logsPage + 1)}
                    disabled={logsPage >= logsMeta.totalPages}
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
