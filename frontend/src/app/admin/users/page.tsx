'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Search,
  Shield,
  ShieldOff,
  Unlock,
  User,
  X,
} from 'lucide-react';

import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { AdminUser } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/store/toast-store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fmtLockExpiry(lockedUntil: string) {
  const d = new Date(lockedUntil);
  if (d < new Date()) return 'Hết hạn';
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AdminUser['status'] }) {
  const map = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-400',
    LOCKED: 'bg-red-500/10 text-red-400',
    UNVERIFIED: 'bg-amber-500/10 text-amber-400',
  } as const;
  const label = { ACTIVE: 'Active', LOCKED: 'Locked', UNVERIFIED: 'Unverified' } as const;
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', map[status])}>
      {label[status]}
    </span>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: AdminUser['role'] }) {
  return (
    <span
      className={cn(
        'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-700 text-slate-400',
      )}
    >
      {role === 'ADMIN' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {role}
    </span>
  );
}

// ─── Lock Modal ───────────────────────────────────────────────────────────────

interface LockModalProps {
  user: AdminUser;
  onClose: () => void;
  onLocked: (updated: AdminUser) => void;
}

function LockModal({ user, onClose, onLocked }: LockModalProps) {
  const [minutes, setMinutes] = useState(60);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const PRESETS = [
    { label: '1 giờ', value: 60 },
    { label: '6 giờ', value: 360 },
    { label: '1 ngày', value: 1440 },
    { label: '7 ngày', value: 10080 },
  ];

  const handleLock = async () => {
    setLoading(true);
    try {
      const res = await adminApi.lockUser(user.id, minutes, reason || 'Vi phạm quy định cộng đồng.');
      toast.success(`Đã khóa tài khoản "${user.displayName}"`);
      onLocked(res.data.data);
    } catch {
      toast.error('Khóa tài khoản thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl bg-slate-800 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-semibold text-white">Khóa tài khoản</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-400">
          Khóa tài khoản{' '}
          <span className="font-medium text-white">{user.displayName}</span> ({user.email})
        </p>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Thời hạn khóa</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setMinutes(p.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  minutes === p.value
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={minutes}
            min={1}
            max={10080}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            placeholder="Số phút"
          />
          <p className="mt-1 text-xs text-slate-500">
            {minutes < 60 ? `${minutes} phút` : minutes < 1440 ? `${(minutes / 60).toFixed(1)} giờ` : `${(minutes / 1440).toFixed(1)} ngày`}
          </p>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Lý do (tùy chọn)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Vi phạm quy định cộng đồng"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-600"
          >
            Hủy
          </button>
          <button
            onClick={handleLock}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Khóa
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Role change confirm ───────────────────────────────────────────────────────

interface RoleConfirmProps {
  user: AdminUser;
  newRole: AdminUser['role'];
  onClose: () => void;
  onConfirmed: (updated: AdminUser) => void;
}

function RoleConfirmModal({ user, newRole, onClose, onConfirmed }: RoleConfirmProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await adminApi.updateUser(user.id, { role: newRole });
      toast.success(`Đã đổi quyền "${user.displayName}" → ${newRole}`);
      onConfirmed(res.data.data);
    } catch {
      toast.error('Đổi quyền thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl bg-slate-800 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-semibold text-white">Xác nhận đổi quyền</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-6 text-sm text-slate-400">
          Đổi quyền của{' '}
          <span className="font-medium text-white">{user.displayName}</span> sang{' '}
          <span className={cn('font-medium', newRole === 'ADMIN' ? 'text-purple-400' : 'text-slate-300')}>
            {newRole}
          </span>
          ?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-600"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user: me } = useAuthStore();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [lockTarget, setLockTarget] = useState<AdminUser | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [roleTarget, setRoleTarget] = useState<{ user: AdminUser; newRole: AdminUser['role'] } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchUsers = (p: number, q: string, role: string, status: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    adminApi
      .getUsers({ page: p, limit: 20, q: q || undefined, role: role || undefined, status: status || undefined })
      .then((r) => {
        setUsers(r.data.data);
        setMeta({ page: r.data.meta.page, totalPages: r.data.meta.totalPages, total: r.data.meta.total });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers(1, '', '', '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, query, filterRole, filterStatus);
  };

  const handleFilter = (role: string, status: string) => {
    setFilterRole(role);
    setFilterStatus(status);
    setPage(1);
    fetchUsers(1, query, role, status);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchUsers(p, query, filterRole, filterStatus);
  };

  const handleUnlock = async (user: AdminUser) => {
    setUnlockingId(user.id);
    try {
      const res = await adminApi.unlockUser(user.id);
      toast.success(`Đã mở khóa "${user.displayName}"`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data.data : u)));
    } catch {
      toast.error('Mở khóa thất bại.');
    } finally {
      setUnlockingId(null);
    }
  };

  const updateUser = (updated: AdminUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Người dùng</h1>
        <p className="mt-1 text-sm text-slate-400">Quản lý tài khoản và phân quyền</p>
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
              placeholder="Tên, email..."
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
          value={filterRole}
          onChange={(e) => handleFilter(e.target.value, filterStatus)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Tất cả quyền</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => handleFilter(filterRole, e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="LOCKED">LOCKED</option>
          <option value="UNVERIFIED">UNVERIFIED</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <span className="text-sm text-slate-400">
            {meta.total > 0 ? `${meta.total} người dùng` : 'Không có dữ liệu'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-700" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Không tìm thấy người dùng</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Người dùng</th>
                  <th className="px-5 py-3">Quyền</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-center">Đánh giá</th>
                  <th className="px-5 py-3 text-center">Bình luận</th>
                  <th className="px-5 py-3">Ngày tạo</th>
                  <th className="px-5 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.map((u) => (
                  <tr key={u.id} className="text-slate-300 hover:bg-slate-700/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <Image
                            src={u.avatarUrl}
                            alt={u.displayName}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{u.displayName}</p>
                          <p className="truncate text-xs text-slate-500">{u.email}</p>
                          {u.status === 'LOCKED' && u.lockedUntil && (
                            <p className="text-xs text-red-400">Hết hạn: {fmtLockExpiry(u.lockedUntil)}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-5 py-3 text-center text-slate-400">{u.totalRatings}</td>
                    <td className="px-5 py-3 text-center text-slate-400">{u.totalComments}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-500">{fmtDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {/* Lock / Unlock */}
                        {u.id !== me?.id && (
                          u.status === 'LOCKED' ? (
                            <button
                              onClick={() => handleUnlock(u)}
                              disabled={unlockingId === u.id}
                              title="Mở khóa"
                              className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                            >
                              {unlockingId === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => setLockTarget(u)}
                              title="Khóa"
                              className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                            >
                              <Lock className="h-4 w-4" />
                            </button>
                          )
                        )}
                        {/* Role toggle */}
                        {u.id !== me?.id && (
                          <button
                            onClick={() => setRoleTarget({ user: u, newRole: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                            title={u.role === 'ADMIN' ? 'Hạ về USER' : 'Nâng lên ADMIN'}
                            className={cn(
                              'rounded-lg p-1.5 transition-colors',
                              u.role === 'ADMIN'
                                ? 'text-slate-400 hover:bg-slate-700'
                                : 'text-purple-400 hover:bg-purple-500/10',
                            )}
                          >
                            {u.role === 'ADMIN' ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
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

      {lockTarget && (
        <LockModal
          user={lockTarget}
          onClose={() => setLockTarget(null)}
          onLocked={(updated) => { updateUser(updated); setLockTarget(null); }}
        />
      )}

      {roleTarget && (
        <RoleConfirmModal
          user={roleTarget.user}
          newRole={roleTarget.newRole}
          onClose={() => setRoleTarget(null)}
          onConfirmed={(updated) => { updateUser(updated); setRoleTarget(null); }}
        />
      )}
    </div>
  );
}
