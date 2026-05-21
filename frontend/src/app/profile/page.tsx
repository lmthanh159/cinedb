'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Avatar, Button, Input, Pagination } from '@/components/ui';
import { GridSkeleton, ListSkeleton } from '@/components/ui';
import { userApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { cn, formatDate, getImageUrl } from '@/lib/utils';
import { toast } from '@/store/toast-store';
import { useAuthStore } from '@/store/auth-store';
import type { FavoriteItem, UserProfile, UserRating, WatchlistItem } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const e = error as { response?: { data?: { message?: string } } };
    const msg = e.response?.data?.message;
    if (typeof msg === 'string') return msg;
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'password' | 'watchlist' | 'favorites' | 'ratings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Hồ sơ' },
  { id: 'password', label: 'Đổi mật khẩu' },
  { id: 'watchlist', label: 'Danh sách xem' },
  { id: 'favorites', label: 'Yêu thích' },
  { id: 'ratings', label: 'Đánh giá' },
];

const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
];

// ─── MediaItemCard (watchlist / favorites) ────────────────────────────────────

interface MediaItemCardProps {
  title: string;
  posterUrl: string | null;
  year?: number;
  href: string;
}

function MediaItemCard({ title, posterUrl, year, href }: MediaItemCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-800">
        <Image
          src={getImageUrl(posterUrl, 'w342')}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="mt-2">
        <p className="line-clamp-1 text-sm font-medium text-white group-hover:text-blue-400">
          {title}
        </p>
        {year != null && <p className="text-xs text-slate-400">{year}</p>}
      </div>
    </Link>
  );
}

// ─── ProfileTab ───────────────────────────────────────────────────────────────

function ProfileTab({ profile }: { profile: UserProfile }) {
  const { fetchUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [language, setLanguage] = useState(profile.language);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsLoading(true);
    try {
      await userApi.updateProfile({ displayName: displayName.trim(), bio: bio.trim() || undefined, language });
      await fetchUser();
      toast.success('Hồ sơ đã được cập nhật!');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-lg space-y-6">
      {/* Avatar display */}
      <div className="flex items-center gap-4">
        <Avatar src={profile.avatarUrl} name={profile.displayName} size="lg" />
        <div>
          <p className="font-medium text-white">{profile.displayName}</p>
          <p className="text-sm text-slate-400">{profile.email}</p>
          {profile.emailVerified ? (
            <span className="text-xs text-emerald-400">Email đã xác thực</span>
          ) : (
            <span className="text-xs text-amber-400">Chưa xác thực email</span>
          )}
        </div>
      </div>

      <Input
        label="Tên hiển thị"
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Tên của bạn"
      />

      {/* Bio */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-300" htmlFor="bio">
          Giới thiệu
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Viết vài dòng về bạn..."
          rows={3}
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Language */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-300" htmlFor="language">
          Ngôn ngữ
        </label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" isLoading={isLoading}>
        Lưu thay đổi
      </Button>
    </form>
  );
}

// ─── PasswordTab ──────────────────────────────────────────────────────────────

function PasswordTab() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirm) return;
    if (newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirm) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      await userApi.changePassword(oldPassword, newPassword);
      toast.success('Mật khẩu đã được thay đổi!');
      setOldPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <Input
        label="Mật khẩu hiện tại"
        type="password"
        value={oldPassword}
        onChange={(e) => setOldPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
      />
      <Input
        label="Mật khẩu mới"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="new-password"
        helperText="Tối thiểu 8 ký tự"
      />
      <Input
        label="Xác nhận mật khẩu mới"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="••••••••"
        autoComplete="new-password"
        error={confirm && confirm !== newPassword ? 'Mật khẩu không khớp' : undefined}
      />
      <Button type="submit" isLoading={isLoading}>
        Đổi mật khẩu
      </Button>
    </form>
  );
}

// ─── WatchlistTab ─────────────────────────────────────────────────────────────

function WatchlistTab() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    userApi
      .getWatchlist({ page, limit: 20 })
      .then((res) => {
        if (!cancelled) {
          setItems(res.data.data);
          setTotalPages(res.data.meta.totalPages);
        }
      })
      .catch((err) => { if (!cancelled) { toast.error(getApiError(err)); setItems([]); } })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  if (isLoading) return <GridSkeleton count={10} />;
  if (items.length === 0)
    return <p className="py-12 text-center text-slate-400">Danh sách xem trống.</p>;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => {
          const media = item.movie ?? item.series;
          if (!media) return null;
          const href = item.movie ? ROUTES.MOVIE(media.id) : ROUTES.TV_SHOW(media.id);
          return (
            <MediaItemCard
              key={item.id}
              title={media.title}
              posterUrl={media.posterUrl}
              year={media.year}
              href={href}
            />
          );
        })}
      </div>
      <div className="mt-8">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

// ─── FavoritesTab ─────────────────────────────────────────────────────────────

function FavoritesTab() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    userApi
      .getFavorites({ page, limit: 20 })
      .then((res) => {
        if (!cancelled) {
          setItems(res.data.data);
          setTotalPages(res.data.meta.totalPages);
        }
      })
      .catch((err) => { if (!cancelled) { toast.error(getApiError(err)); setItems([]); } })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  if (isLoading) return <GridSkeleton count={10} />;
  if (items.length === 0)
    return <p className="py-12 text-center text-slate-400">Chưa có phim yêu thích nào.</p>;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => {
          const media = item.movie ?? item.series;
          if (!media) return null;
          const href = item.movie ? ROUTES.MOVIE(media.id) : ROUTES.TV_SHOW(media.id);
          return (
            <MediaItemCard
              key={item.id}
              title={media.title}
              posterUrl={media.posterUrl}
              year={media.year}
              href={href}
            />
          );
        })}
      </div>
      <div className="mt-8">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

// ─── RatingsTab ───────────────────────────────────────────────────────────────

function RatingsTab() {
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    userApi
      .getRatings({ page, limit: 20 })
      .then((res) => {
        if (!cancelled) {
          setRatings(res.data.data);
          setTotalPages(res.data.meta.totalPages);
        }
      })
      .catch((err) => { if (!cancelled) { toast.error(getApiError(err)); setRatings([]); } })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  if (isLoading) return <ListSkeleton count={5} />;
  if (ratings.length === 0)
    return <p className="py-12 text-center text-slate-400">Chưa có đánh giá nào.</p>;

  return (
    <div>
      <div className="space-y-3">
        {ratings.map((item) => {
          const media = item.movie ?? item.series;
          if (!media) return null;
          const href = item.movie ? ROUTES.MOVIE(media.id) : ROUTES.TV_SHOW(media.id);
          return (
            <Link
              key={item.id}
              href={href}
              className="flex items-center gap-4 rounded-lg bg-slate-800 p-3 transition-colors hover:bg-slate-700"
            >
              <div className="relative h-[69px] w-[46px] flex-shrink-0 overflow-hidden rounded bg-slate-700">
                <Image
                  src={getImageUrl(media.posterUrl, 'w92')}
                  alt={media.title}
                  fill
                  sizes="46px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium text-white">{media.title}</p>
                <div className="mt-1 flex items-center gap-1 text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-medium">{item.score} / 10</span>
                </div>
              </div>
              <p className="flex-shrink-0 text-xs text-slate-500">
                {formatDate(item.createdAt)}
              </p>
            </Link>
          );
        })}
      </div>
      <div className="mt-8">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

// ─── ProfileContent ───────────────────────────────────────────────────────────

function ProfileContent() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    userApi
      .getMe()
      .then((res) => setProfile(res.data.data))
      .catch((err) => setProfileError(getApiError(err)));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Tài khoản</h1>

      {/* Tab navigation — horizontal scroll on mobile */}
      <div className="mb-8 border-b border-slate-800">
        <nav role="tablist" className="-mb-px flex overflow-x-auto" aria-label="Profile tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-shrink-0 border-b-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div
        role="tabpanel"
        id={`${activeTab}-panel`}
        aria-labelledby={`${activeTab}-tab`}
      >
        {activeTab === 'profile' && (
          profileError
            ? <p className="py-12 text-center text-red-400">{profileError}</p>
            : profile
              ? <ProfileTab profile={profile} />
              : <div className="space-y-4 max-w-lg">
                  <div className="h-16 w-16 animate-pulse rounded-full bg-slate-800" />
                  <div className="h-10 w-full animate-pulse rounded-lg bg-slate-800" />
                  <div className="h-20 w-full animate-pulse rounded-lg bg-slate-800" />
                </div>
        )}
        {activeTab === 'password' && <PasswordTab />}
        {activeTab === 'watchlist' && <WatchlistTab />}
        {activeTab === 'favorites' && <FavoritesTab />}
        {activeTab === 'ratings' && <RatingsTab />}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
