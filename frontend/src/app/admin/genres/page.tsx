'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { isAxiosError } from 'axios';

import { adminApi } from '@/lib/api';
import type { AdminGenre } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/store/toast-store';

// ─── Genre form modal ──────────────────────────────────────────────────────────

interface GenreFormData {
  name: string;
  slug: string;
  tmdbId: string;
}

interface GenreModalProps {
  genre: AdminGenre | null;
  onClose: () => void;
  onSaved: (genre: AdminGenre) => void;
}

function GenreModal({ genre, onClose, onSaved }: GenreModalProps) {
  const isEdit = genre !== null;
  const [form, setForm] = useState<GenreFormData>(
    genre
      ? { name: genre.name, slug: genre.slug, tmdbId: genre.tmdbId?.toString() ?? '' }
      : { name: '', slug: '', tmdbId: '' },
  );
  const [saving, setSaving] = useState(false);

  const set =
    (key: keyof GenreFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const tmdbIdNum = form.tmdbId.trim() ? parseInt(form.tmdbId, 10) : null;
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      tmdbId: tmdbIdNum,
    };
    try {
      const res = isEdit
        ? await adminApi.updateGenre(genre.id, payload)
        : await adminApi.createGenre(payload);
      toast.success(isEdit ? 'Đã cập nhật thể loại' : 'Đã thêm thể loại');
      onSaved(res.data.data);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error('Slug hoặc TMDB ID đã tồn tại');
      } else {
        toast.error(isEdit ? 'Cập nhật thất bại' : 'Thêm thất bại');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-slate-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <h2 className="font-semibold text-white">
            {isEdit ? 'Sửa thể loại' : 'Thêm thể loại'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Tên <span className="text-red-400">*</span>
              </label>
              <input
                value={form.name}
                onChange={set('name')}
                required
                placeholder="Action"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Slug{' '}
                <span className="text-slate-500">(tự tạo từ tên nếu để trống)</span>
              </label>
              <input
                value={form.slug}
                onChange={set('slug')}
                placeholder="action"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                TMDB ID <span className="text-slate-500">(tùy chọn)</span>
              </label>
              <input
                type="number"
                value={form.tmdbId}
                onChange={set('tmdbId')}
                placeholder="28"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Lưu' : 'Thêm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminGenresPage() {
  const [genres, setGenres] = useState<AdminGenre[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminGenre | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchGenres = (p: number, q: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    adminApi
      .getAdminGenres({ page: p, limit: 50, q: q || undefined })
      .then((r) => {
        setGenres(r.data.data);
        setMeta({
          page: r.data.meta.page,
          totalPages: r.data.meta.totalPages,
          total: r.data.meta.total,
        });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGenres(1, '');
  }, []);

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setPage(1);
    fetchGenres(1, query);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchGenres(p, query);
  };

  const handleSaved = (updated: AdminGenre) => {
    setCreateOpen(false);
    setEditTarget(null);
    if (genres.find((g) => g.id === updated.id)) {
      setGenres((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } else {
      setGenres((prev) => [updated, ...prev]);
      setMeta((m) => ({ ...m, total: m.total + 1 }));
    }
  };

  const handleDelete = async (genre: AdminGenre) => {
    if (genre.movieCount > 0 || genre.tvCount > 0) {
      toast.error(
        `Không thể xóa: đang dùng bởi ${genre.movieCount} phim và ${genre.tvCount} TV series`,
      );
      return;
    }
    setDeletingId(genre.id);
    try {
      await adminApi.deleteGenre(genre.id);
      toast.success('Đã xóa thể loại');
      setGenres((prev) => prev.filter((g) => g.id !== genre.id));
      setMeta((m) => ({ ...m, total: m.total - 1 }));
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error('Không thể xóa: thể loại đang được sử dụng');
      } else {
        toast.error('Xóa thất bại');
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Thể loại</h1>
          <p className="mt-1 text-sm text-slate-400">Quản lý thể loại phim và TV series</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
        >
          <Plus className="h-4 w-4" />
          Thêm mới
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tên, slug..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Tìm
          </button>
        </form>
        <button
          onClick={() => fetchGenres(page, query)}
          className="rounded-lg bg-slate-700 px-3 py-2 text-slate-400 hover:bg-slate-600 hover:text-white"
          title="Tải lại"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-slate-800">
        <div className="border-b border-slate-700 px-5 py-3">
          <span className="text-sm text-slate-400">
            {loading ? '…' : `${meta.total} thể loại`}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-700" />
            ))}
          </div>
        ) : genres.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Không tìm thấy</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Tên</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3 text-center">Phim</th>
                  <th className="px-4 py-3 text-center">TV</th>
                  <th className="px-4 py-3">TMDB ID</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {genres.map((genre) => {
                  const inUse = genre.movieCount > 0 || genre.tvCount > 0;
                  const isDeleting = deletingId === genre.id;
                  return (
                    <tr key={genre.id} className="text-slate-300 hover:bg-slate-700/20">
                      <td className="px-4 py-3 text-xs text-slate-500">{genre.id}</td>
                      <td className="px-4 py-3 font-medium text-white">{genre.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{genre.slug}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'text-xs',
                            genre.movieCount > 0 ? 'text-blue-400' : 'text-slate-600',
                          )}
                        >
                          {genre.movieCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'text-xs',
                            genre.tvCount > 0 ? 'text-purple-400' : 'text-slate-600',
                          )}
                        >
                          {genre.tvCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {genre.tmdbId ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditTarget(genre)}
                            title="Sửa"
                            className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-500/10"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(genre)}
                            disabled={isDeleting || inUse}
                            title={
                              inUse
                                ? `Đang dùng bởi ${genre.movieCount + genre.tvCount} media`
                                : 'Xóa'
                            }
                            className={cn(
                              'rounded-lg p-1.5 transition-colors',
                              inUse
                                ? 'cursor-not-allowed text-slate-600'
                                : 'text-red-400 hover:bg-red-500/10',
                              isDeleting && 'opacity-50',
                            )}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700 px-5 py-3">
            <p className="text-xs text-slate-500">
              Trang {meta.page} / {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1}
                className="rounded-lg bg-slate-700 p-1.5 text-slate-300 hover:bg-slate-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => handlePage(page + 1)}
                disabled={page >= meta.totalPages}
                className="rounded-lg bg-slate-700 p-1.5 text-slate-300 hover:bg-slate-600 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {createOpen && (
        <GenreModal genre={null} onClose={() => setCreateOpen(false)} onSaved={handleSaved} />
      )}
      {editTarget && (
        <GenreModal
          genre={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
