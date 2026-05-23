'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';

import { adminApi } from '@/lib/api';
import type { AdminComment } from '@/types';
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

// ─── Status badge ─────────────────────────────────────────────────────────────

function CommentStatusBadge({ status }: { status: AdminComment['status'] }) {
  const map = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-400',
    HIDDEN: 'bg-amber-500/10 text-amber-400',
    DELETED: 'bg-red-500/10 text-red-400',
  } as const;
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', map[status])}>
      {status}
    </span>
  );
}

// ─── Comment row ──────────────────────────────────────────────────────────────

interface CommentRowProps {
  comment: AdminComment;
  onHide: (id: number) => Promise<void>;
  onRestore: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  loadingId: number | null;
}

function CommentRow({ comment, onHide, onRestore, onDelete, loadingId }: CommentRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isLoading = loadingId === comment.id;

  const media = comment.movie ?? comment.series;

  return (
    <tr className="border-b border-slate-700/50 text-slate-300 hover:bg-slate-700/20">
      <td className="px-4 py-3 text-xs text-slate-500">{comment.id}</td>
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{comment.user.displayName}</p>
          <p className="truncate text-xs text-slate-500">{comment.user.email}</p>
        </div>
      </td>
      <td className="max-w-[240px] px-4 py-3">
        <div
          className="cursor-pointer"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Thu gọn' : 'Xem thêm'}
        >
          <p className={cn('text-sm', expanded ? 'whitespace-pre-wrap' : 'line-clamp-2')}>
            {comment.content}
          </p>
          {comment.content.length > 80 && (
            <span className="text-xs text-blue-400">{expanded ? '↑ Thu gọn' : '↓ Xem thêm'}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {media && (
          <p className="max-w-[120px] truncate text-xs text-slate-400" title={media.title}>
            {media.title}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <CommentStatusBadge status={comment.status} />
      </td>
      <td className="px-4 py-3 text-center">
        {comment.reportCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
            <AlertTriangle className="h-3 w-3" />
            {comment.reportCount}
          </span>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{fmtDate(comment.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {comment.status === 'ACTIVE' && (
            <button
              onClick={() => onHide(comment.id)}
              disabled={isLoading}
              title="Ẩn bình luận"
              className="rounded-lg p-1.5 text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
            </button>
          )}
          {(comment.status === 'HIDDEN' || comment.status === 'DELETED') && (
            <button
              onClick={() => onRestore(comment.id)}
              disabled={isLoading}
              title="Khôi phục"
              className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          {comment.status !== 'DELETED' && (
            <button
              onClick={() => onDelete(comment.id)}
              disabled={isLoading}
              title="Xóa"
              className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabMode = 'all' | 'reported';

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const [tab, setTab] = useState<TabMode>('all');
  const [filterStatus, setFilterStatus] = useState('');
  const [query, setQuery] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  const fetchComments = (p: number, mode: TabMode, status: string, q: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    adminApi
      .getComments({
        page: p,
        limit: 20,
        reportedOnly: mode === 'reported' ? true : undefined,
        status: status || undefined,
        q: q || undefined,
      })
      .then((r) => {
        setComments(r.data.data);
        setMeta({ page: r.data.meta.page, totalPages: r.data.meta.totalPages, total: r.data.meta.total });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchComments(1, 'all', '', '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (t: TabMode) => {
    setTab(t);
    setPage(1);
    setFilterStatus('');
    fetchComments(1, t, '', query);
  };

  const handleFilter = (status: string) => {
    setFilterStatus(status);
    setPage(1);
    fetchComments(1, tab, status, query);
  };

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setPage(1);
    fetchComments(1, tab, filterStatus, query);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchComments(p, tab, filterStatus, query);
  };

  const updateComment = (updated: AdminComment) => {
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleHide = async (id: number) => {
    setLoadingId(id);
    try {
      const res = await adminApi.hideComment(id, true);
      toast.success('Đã ẩn bình luận');
      updateComment(res.data.data);
    } catch {
      toast.error('Ẩn thất bại.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleRestore = async (id: number) => {
    setLoadingId(id);
    try {
      const res = await adminApi.restoreComment(id);
      toast.success('Đã khôi phục bình luận');
      updateComment(res.data.data);
    } catch {
      toast.error('Khôi phục thất bại.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setLoadingId(id);
    try {
      const res = await adminApi.deleteAdminComment(id);
      toast.success('Đã xóa bình luận');
      updateComment(res.data.data);
    } catch {
      toast.error('Xóa thất bại.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bình luận & Báo cáo</h1>
        <p className="mt-1 text-sm text-slate-400">Kiểm duyệt bình luận và xử lý báo cáo</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-800 p-1 w-fit">
        <button
          onClick={() => handleTabChange('all')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            tab === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white',
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Tất cả bình luận
        </button>
        <button
          onClick={() => handleTabChange('reported')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            tab === 'reported' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-white',
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          Bị báo cáo
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nội dung, user, phim..."
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

        <select
          value={filterStatus}
          onChange={(e) => handleFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="HIDDEN">HIDDEN</option>
          <option value="DELETED">DELETED</option>
        </select>

        <button
          onClick={() => fetchComments(page, tab, filterStatus, query)}
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
            {loading ? '…' : `${meta.total} bình luận`}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-700" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Không có bình luận</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Người dùng</th>
                  <th className="px-4 py-3">Nội dung</th>
                  <th className="px-4 py-3">Phim/TV</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Báo cáo</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => (
                  <CommentRow
                    key={c.id}
                    comment={c}
                    onHide={handleHide}
                    onRestore={handleRestore}
                    onDelete={handleDelete}
                    loadingId={loadingId}
                  />
                ))}
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
    </div>
  );
}
