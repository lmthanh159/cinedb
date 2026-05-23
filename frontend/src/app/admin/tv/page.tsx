'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Download, Loader2, Search, Star, Trash2, Tv, X } from 'lucide-react';

import { adminApi } from '@/lib/api';
import type { TmdbTvSearchResult } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/store/toast-store';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w92';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function posterSrc(path: string | null) {
  return path ? `${TMDB_IMG}${path}` : null;
}

function year(date: string | null) {
  return date ? new Date(date).getFullYear() : '—';
}

// ─── TV row ───────────────────────────────────────────────────────────────────

interface TmdbTvRowProps {
  show: TmdbTvSearchResult;
  onImport: (id: number) => Promise<void>;
  importing: boolean;
}

function TmdbTvRow({ show, onImport, importing }: TmdbTvRowProps) {
  const src = posterSrc(show.poster_path);
  return (
    <tr className="border-b border-slate-700/50 hover:bg-slate-700/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {src ? (
            <Image
              src={src}
              alt={show.name}
              width={36}
              height={54}
              className="rounded object-cover"
            />
          ) : (
            <div className="flex h-[54px] w-9 items-center justify-center rounded bg-slate-700">
              <Tv className="h-4 w-4 text-slate-500" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{show.name}</p>
            <p className="truncate text-xs text-slate-500">{show.original_name}</p>
            {show.overview && (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{show.overview}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">{year(show.first_air_date)}</td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1 text-sm text-amber-400">
          <Star className="h-3.5 w-3.5 fill-amber-400" />
          {show.vote_average.toFixed(1)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">{show.id}</td>
      <td className="px-4 py-3">
        <button
          onClick={() => onImport(show.id)}
          disabled={importing}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            importing
              ? 'cursor-not-allowed bg-slate-700 text-slate-500'
              : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white',
          )}
        >
          {importing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Import
        </button>
      </td>
    </tr>
  );
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

interface DeleteTvModalProps {
  tvId: number;
  tvTitle: string;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteTvModal({ tvId, tvTitle, onClose, onDeleted }: DeleteTvModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteTv(tvId);
      toast.success(`Đã xóa TV series "${tvTitle}"`);
      onDeleted();
    } catch {
      toast.error('Xóa TV series thất bại.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl bg-slate-800 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-semibold text-white">Xác nhận xóa</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-6 text-sm text-slate-400">
          Bạn có chắc muốn xóa TV series{' '}
          <span className="font-medium text-white">&quot;{tvTitle}&quot;</span>?
          <br />
          <span className="text-xs text-slate-500">
            Toàn bộ seasons và episodes sẽ bị xóa cùng.
          </span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-600"
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTvPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TmdbTvSearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [deleteInputId, setDeleteInputId] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  const search = async (q: string, p: number) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSearching(true);
    try {
      const res = await adminApi.tmdbSearchTv(q.trim(), p);
      setResults(res.data.data.results);
      setTotalPages(res.data.data.total_pages);
    } catch {
      // aborted or network error
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setPage(1);
    void search(query, 1);
  };

  const handleImport = async (tmdbId: number) => {
    setImportingId(tmdbId);
    try {
      await adminApi.tmdbImportTv(tmdbId);
      toast.success(`Đã import TV series TMDB #${tmdbId}`);
    } catch {
      toast.error('Import thất bại.');
    } finally {
      setImportingId(null);
    }
  };

  const handleDeleteById = () => {
    const id = Number(deleteInputId.trim());
    if (!id) return;
    setDeleteTarget({ id, title: `#${id}` });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Quản lý TV Series</h1>
        <p className="mt-1 text-sm text-slate-400">Tìm kiếm TMDB và import TV series vào CineDB</p>
      </div>

      {/* Search TMDB */}
      <div className="rounded-xl bg-slate-800 p-6">
        <h2 className="mb-4 font-semibold text-white">Tìm kiếm TMDB</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập tên TV series..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Tìm
          </button>
        </form>

        {results.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">TV Series</th>
                  <th className="px-4 py-3">Năm</th>
                  <th className="px-4 py-3">Điểm</th>
                  <th className="px-4 py-3">TMDB ID</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {results.map((s) => (
                  <TmdbTvRow
                    key={s.id}
                    show={s}
                    onImport={handleImport}
                    importing={importingId === s.id}
                  />
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-700 px-4 py-3">
                <p className="text-xs text-slate-500">Trang {page} / {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPage(page - 1); void search(query, page - 1); }}
                    disabled={page <= 1}
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600 disabled:opacity-40"
                  >
                    ← Trước
                  </button>
                  <button
                    onClick={() => { setPage(page + 1); void search(query, page + 1); }}
                    disabled={page >= totalPages}
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600 disabled:opacity-40"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!searching && query && results.length === 0 && (
          <p className="mt-4 text-center text-sm text-slate-500">Không tìm thấy kết quả</p>
        )}
      </div>

      {/* Delete by CineDB ID */}
      <div className="rounded-xl bg-slate-800 p-6">
        <h2 className="mb-1 font-semibold text-white">Xóa TV series theo ID</h2>
        <p className="mb-4 text-sm text-slate-400">
          Nhập ID nội bộ (CineDB) của series cần xóa. Toàn bộ seasons và episodes sẽ bị xóa.
        </p>
        <div className="flex gap-3">
          <input
            type="number"
            value={deleteInputId}
            onChange={(e) => setDeleteInputId(e.target.value)}
            placeholder="CineDB TV Series ID"
            className="w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
          />
          <button
            onClick={handleDeleteById}
            disabled={!deleteInputId.trim()}
            className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Xóa series
          </button>
        </div>
      </div>

      {deleteTarget && (
        <DeleteTvModal
          tvId={deleteTarget.id}
          tvTitle={deleteTarget.title}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); setDeleteInputId(''); }}
        />
      )}
    </div>
  );
}
