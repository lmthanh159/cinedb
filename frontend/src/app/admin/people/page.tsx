'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AdminPerson } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/store/toast-store';

// ─── Gender badge ──────────────────────────────────────────────────────────────

function GenderBadge({ gender }: { gender: AdminPerson['gender'] }) {
  const colorMap = {
    MALE: 'bg-blue-500/10 text-blue-400',
    FEMALE: 'bg-pink-500/10 text-pink-400',
    NON_BINARY: 'bg-purple-500/10 text-purple-400',
    UNKNOWN: 'bg-slate-500/10 text-slate-500',
  } as const;
  const labelMap = { MALE: 'Nam', FEMALE: 'Nữ', NON_BINARY: 'Khác', UNKNOWN: '—' } as const;
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', colorMap[gender])}>
      {labelMap[gender]}
    </span>
  );
}

// ─── Person form modal ─────────────────────────────────────────────────────────

interface PersonFormData {
  name: string;
  originalName: string;
  knownForDepartment: string;
  gender: AdminPerson['gender'];
  birthday: string;
  deathday: string;
  placeOfBirth: string;
  profileUrl: string;
  biography: string;
}

const EMPTY_FORM: PersonFormData = {
  name: '',
  originalName: '',
  knownForDepartment: '',
  gender: 'UNKNOWN',
  birthday: '',
  deathday: '',
  placeOfBirth: '',
  profileUrl: '',
  biography: '',
};

interface PersonModalProps {
  person: AdminPerson | null;
  onClose: () => void;
  onSaved: (person: AdminPerson) => void;
}

function PersonModal({ person, onClose, onSaved }: PersonModalProps) {
  const isEdit = person !== null;
  const [form, setForm] = useState<PersonFormData>(
    person
      ? {
          name: person.name,
          originalName: person.originalName ?? '',
          knownForDepartment: person.knownForDepartment ?? '',
          gender: person.gender,
          birthday: person.birthday ? person.birthday.slice(0, 10) : '',
          deathday: person.deathday ? person.deathday.slice(0, 10) : '',
          placeOfBirth: person.placeOfBirth ?? '',
          profileUrl: person.profileUrl ?? '',
          biography: person.biography ?? '',
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);

  const set =
    (key: keyof PersonFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      originalName: form.originalName.trim() || null,
      knownForDepartment: form.knownForDepartment.trim() || undefined,
      gender: form.gender,
      birthday: form.birthday || null,
      deathday: form.deathday || null,
      placeOfBirth: form.placeOfBirth.trim() || null,
      profileUrl: form.profileUrl.trim() || null,
      biography: form.biography.trim() || null,
    };
    try {
      const res = isEdit
        ? await adminApi.updatePerson(person.id, payload)
        : await adminApi.createPerson(payload);
      toast.success(isEdit ? 'Đã cập nhật' : 'Đã thêm diễn viên');
      onSaved(res.data.data);
    } catch {
      toast.error(isEdit ? 'Cập nhật thất bại' : 'Thêm thất bại');
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
        className="w-full max-w-lg rounded-xl bg-slate-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <h2 className="font-semibold text-white">
            {isEdit ? 'Sửa diễn viên' : 'Thêm diễn viên'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-5">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Tên <span className="text-red-400">*</span>
              </label>
              <input
                value={form.name}
                onChange={set('name')}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Tên gốc</label>
              <input
                value={form.originalName}
                onChange={set('originalName')}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Bộ phận</label>
                <input
                  value={form.knownForDepartment}
                  onChange={set('knownForDepartment')}
                  placeholder="Acting, Directing..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Giới tính</label>
                <select
                  value={form.gender}
                  onChange={set('gender')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 focus:border-blue-500 focus:outline-none"
                >
                  <option value="UNKNOWN">—</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="NON_BINARY">Khác</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Ngày sinh</label>
                <input
                  type="date"
                  value={form.birthday}
                  onChange={set('birthday')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Ngày mất</label>
                <input
                  type="date"
                  value={form.deathday}
                  onChange={set('deathday')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Nơi sinh</label>
              <input
                value={form.placeOfBirth}
                onChange={set('placeOfBirth')}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Ảnh đại diện (URL)</label>
              <input
                type="url"
                value={form.profileUrl}
                onChange={set('profileUrl')}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Tiểu sử</label>
              <textarea
                value={form.biography}
                onChange={set('biography')}
                rows={3}
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

// ─── Delete confirm modal ──────────────────────────────────────────────────────

interface DeletePersonModalProps {
  person: AdminPerson;
  onClose: () => void;
  onDeleted: (id: number) => void;
}

function DeletePersonModal({ person, onClose, onDeleted }: DeletePersonModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deletePerson(person.id);
      toast.success('Đã xóa');
      onDeleted(person.id);
    } catch {
      toast.error('Xóa thất bại');
    } finally {
      setDeleting(false);
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
        <h2 className="text-lg font-semibold text-white">Xóa diễn viên?</h2>
        <p className="mt-2 text-sm text-slate-400">
          Bạn chắc chắn muốn xóa{' '}
          <span className="font-medium text-white">{person.name}</span>? Hành động này không thể
          hoàn tác.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600"
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPeoplePage() {
  const [people, setPeople] = useState<AdminPerson[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminPerson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPerson | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchPeople = (p: number, q: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    adminApi
      .getPeople({ page: p, limit: 20, q: q || undefined })
      .then((r) => {
        setPeople(r.data.data);
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
    fetchPeople(1, '');
  }, []);

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPeople(1, query);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchPeople(p, query);
  };

  const handleSaved = (updated: AdminPerson) => {
    setCreateOpen(false);
    setEditTarget(null);
    if (people.find((p) => p.id === updated.id)) {
      setPeople((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      fetchPeople(1, query);
      setPage(1);
    }
  };

  const handleDeleted = (id: number) => {
    setDeleteTarget(null);
    setPeople((prev) => prev.filter((p) => p.id !== id));
    setMeta((m) => ({ ...m, total: m.total - 1 }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Diễn viên & Đạo diễn</h1>
          <p className="mt-1 text-sm text-slate-400">Quản lý người tham gia sản xuất</p>
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
              placeholder="Tên, bộ phận..."
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
          onClick={() => fetchPeople(page, query)}
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
            {loading ? '…' : `${meta.total.toLocaleString()} người`}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-700" />
            ))}
          </div>
        ) : people.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Không tìm thấy</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Người</th>
                  <th className="px-4 py-3">Bộ phận</th>
                  <th className="px-4 py-3">Giới tính</th>
                  <th className="px-4 py-3 text-right">Popularity</th>
                  <th className="px-4 py-3">TMDB ID</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {people.map((person) => (
                  <tr key={person.id} className="text-slate-300 hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-xs text-slate-500">{person.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {person.profileUrl ? (
                          <Image
                            src={person.profileUrl}
                            alt={person.name}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-500">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{person.name}</p>
                          {person.originalName && person.originalName !== person.name && (
                            <p className="truncate text-xs text-slate-500">{person.originalName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {person.knownForDepartment ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <GenderBadge gender={person.gender} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                      {person.popularity.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {person.tmdbId ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditTarget(person)}
                          title="Sửa"
                          className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-500/10"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(person)}
                          title="Xóa"
                          className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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

      {/* Modals */}
      {createOpen && (
        <PersonModal person={null} onClose={() => setCreateOpen(false)} onSaved={handleSaved} />
      )}
      {editTarget && (
        <PersonModal
          person={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
      {deleteTarget && (
        <DeletePersonModal
          person={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
