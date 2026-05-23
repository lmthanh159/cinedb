'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Edit2, Flag, Loader2, Send, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { isAxiosError } from 'axios';

import { commentApi, movieApi, tvApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import { toast } from '@/store/toast-store';
import type { Comment, Review } from '@/types';

// ── Internal type ─────────────────────────────────────────────────────────────

interface CommentItem {
  key: string;
  id: number | null;
  rating: number | null;
  content: string | null;
  user: { id: string; displayName: string; avatarUrl: string | null };
  createdAt: string;
  _deleting?: boolean;
  _optimistic?: boolean;
}

function reviewToItem(r: Review): CommentItem {
  return {
    key: r.id != null ? `r-${r.id}` : `u-${r.user.id}`,
    id: r.id ?? null,
    rating: r.rating,
    content: r.comment,
    user: r.user,
    createdAt: r.createdAt,
  };
}

function commentToItem(c: Comment): CommentItem {
  return {
    key: `r-${c.id}`,
    id: c.id,
    rating: null,
    content: c.content,
    user: c.user,
    createdAt: c.createdAt,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: vi });
  } catch {
    return iso.slice(0, 10);
  }
}

// ── UserAvatar ────────────────────────────────────────────────────────────────

function UserAvatar({
  src,
  name,
  size = 40,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className="flex-shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-slate-300"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── ReportModal ───────────────────────────────────────────────────────────────

function ReportModal({ commentId, onClose }: { commentId: number; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await commentApi.reportComment(commentId, reason.trim());
      toast.success('Đã gửi báo cáo');
      onClose();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error('Bạn đã báo cáo bình luận này rồi');
      } else {
        toast.error('Gửi báo cáo thất bại');
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-slate-800 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-white">Báo cáo bình luận</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do báo cáo..."
            rows={3}
            maxLength={500}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Gửi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── CommentCard ───────────────────────────────────────────────────────────────

interface CommentCardProps {
  item: CommentItem;
  currentUserId: string | null;
  onEdit: (id: number, newContent: string) => void;
  onDeleteRequest: (item: CommentItem) => void;
  onReport: (id: number) => void;
}

function CommentCard({ item, currentUserId, onEdit, onDeleteRequest, onReport }: CommentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content ?? '');
  const [editSaving, setEditSaving] = useState(false);

  const isOwner = currentUserId !== null && item.user.id === currentUserId;
  const hasContent = !!item.content?.trim();
  const isLong = (item.content?.length ?? 0) > 200;

  const handleSaveEdit = async () => {
    if (!item.id || !editContent.trim()) return;
    setEditSaving(true);
    try {
      await commentApi.updateComment(item.id, editContent.trim());
      onEdit(item.id, editContent.trim());
      setEditing(false);
      toast.success('Đã cập nhật bình luận');
    } catch {
      toast.error('Cập nhật thất bại');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <article
      className={cn(
        'rounded-lg bg-slate-800 p-4 transition-opacity duration-300',
        item._deleting && 'opacity-50',
        item._optimistic && 'opacity-70',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar src={item.user.avatarUrl} name={item.user.displayName} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">{item.user.displayName}</p>
            <p className="text-xs text-slate-500">{relativeTime(item.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {item.rating !== null && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
              ⭐ {item.rating}/10
            </span>
          )}
          {!item._optimistic && (
            <div className="flex items-center gap-1">
              {isOwner && item.id !== null && hasContent && !editing && (
                <button
                  onClick={() => {
                    setEditContent(item.content ?? '');
                    setEditing(true);
                  }}
                  title="Sửa"
                  className="text-xs text-slate-500 transition-colors hover:text-blue-400"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
              {isOwner && item.id !== null && (
                <button
                  onClick={() => onDeleteRequest(item)}
                  title="Xóa"
                  className="text-xs text-slate-500 transition-colors hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              {!isOwner && currentUserId !== null && item.id !== null && (
                <button
                  onClick={() => onReport(item.id!)}
                  title="Báo cáo"
                  className="text-xs text-slate-600 transition-colors hover:text-red-400"
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {editing ? (
        <div className="mt-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            maxLength={5000}
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
            >
              Hủy
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={editSaving || !editContent.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {editSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              Lưu
            </button>
          </div>
        </div>
      ) : hasContent ? (
        <div className="mt-2">
          <p
            className={cn(
              'text-sm leading-relaxed text-slate-300',
              !expanded && isLong && 'line-clamp-3',
            )}
          >
            {item.content}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs text-blue-400 hover:underline"
            >
              {expanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

// ── CommentSection ────────────────────────────────────────────────────────────

export interface CommentSectionProps {
  movieId: number;
  mediaType: 'movie' | 'tv';
}

const PAGE_SIZE = 10;

export function CommentSection({ movieId, mediaType }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuthStore();

  const [items, setItems] = useState<CommentItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [reportTarget, setReportTarget] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommentItem | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res =
          mediaType === 'movie'
            ? await movieApi.getMovieReviews(movieId, { page: 1, limit: PAGE_SIZE })
            : await tvApi.getTvReviews(movieId, { page: 1, limit: PAGE_SIZE });
        setItems(res.data.data.map((r) => reviewToItem(r)));
        setTotalPages(res.data.meta.totalPages);
        setTotal(res.data.meta.total);
        setPage(1);
      } catch {
        // show empty state
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res =
        mediaType === 'movie'
          ? await movieApi.getMovieReviews(movieId, { page: nextPage, limit: PAGE_SIZE })
          : await tvApi.getTvReviews(movieId, { page: nextPage, limit: PAGE_SIZE });
      setItems((prev) => [...prev, ...res.data.data.map((r) => reviewToItem(r))]);
      setPage(nextPage);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newContent.trim() || submitting || !user) return;
    setSubmitting(true);

    const tempKey = `temp-${Date.now()}`;
    const optimistic: CommentItem = {
      key: tempKey,
      id: null,
      rating: null,
      content: newContent.trim(),
      user: { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl ?? null },
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    const submitted = newContent.trim();
    setItems((prev) => [optimistic, ...prev]);
    setTotal((t) => t + 1);
    setNewContent('');

    try {
      const payload =
        mediaType === 'movie'
          ? { movieId, content: submitted }
          : { seriesId: movieId, content: submitted };
      const res = await commentApi.createComment(payload);
      setItems((prev) =>
        prev.map((item) => (item.key === tempKey ? commentToItem(res.data.data) : item)),
      );
      toast.success('Đã gửi bình luận');
    } catch (err) {
      setItems((prev) => prev.filter((item) => item.key !== tempKey));
      setTotal((t) => t - 1);
      setNewContent(submitted);
      if (isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string })?.message;
        toast.error(
          typeof msg === 'string' && msg.includes('ERR_COMMENT_002')
            ? 'Nội dung vi phạm quy tắc cộng đồng'
            : 'Gửi bình luận thất bại',
        );
      } else {
        toast.error('Gửi bình luận thất bại');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (id: number, newText: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, content: newText } : item)),
    );
  };

  const handleDeleteRequest = (item: CommentItem) => setDeleteTarget(item);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, _deleting: true } : item)));
    try {
      await commentApi.deleteComment(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((t) => t - 1);
      toast.success('Đã xóa bình luận');
    } catch {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, _deleting: false } : item)),
      );
      toast.error('Xóa thất bại');
    }
  };

  const loginRedirect = encodeURIComponent(
    mediaType === 'movie' ? `/movie/${movieId}` : `/tv/${movieId}`,
  );

  return (
    <section aria-label="Bình luận">
      {/* Heading */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">
          Bình luận{' '}
          <span className="text-slate-500">({loading ? '…' : total})</span>
        </h2>
      </div>

      {/* Write form */}
      {isAuthenticated && user ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-3">
            <UserAvatar
              src={user.avatarUrl ?? null}
              name={user.displayName}
              size={36}
            />
            <div className="flex-1">
              <div className="relative">
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Viết bình luận về phim này..."
                  maxLength={5000}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 p-3 pb-6 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <span className="absolute bottom-2 right-3 text-xs text-slate-600">
                  {newContent.length}/5000
                </span>
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !newContent.trim()}
                  className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Gửi bình luận
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-slate-800 px-4 py-3">
          <p className="text-sm text-slate-400">Đăng nhập để bình luận</p>
          <Link
            href={`/login?redirect=${loginRedirect}`}
            className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
          >
            Đăng nhập
          </Link>
        </div>
      )}

      {/* Comment list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-slate-800 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-slate-700" />
                  <div className="h-3 w-20 rounded bg-slate-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <CommentCard
              key={item.key}
              item={item}
              currentUserId={user?.id ?? null}
              onEdit={handleEdit}
              onDeleteRequest={handleDeleteRequest}
              onReport={setReportTarget}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {page < totalPages && !loading && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="mx-auto flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600 disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            Xem thêm bình luận
          </button>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-slate-800 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-white">Xóa bình luận?</h3>
            <p className="mt-2 text-sm text-slate-400">Bình luận sẽ bị xóa vĩnh viễn.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportTarget !== null && (
        <ReportModal commentId={reportTarget} onClose={() => setReportTarget(null)} />
      )}
    </section>
  );
}
