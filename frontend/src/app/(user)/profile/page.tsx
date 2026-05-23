'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Heart, Star } from 'lucide-react';

import { Avatar, Button, Input } from '@/components/ui';
import { userApi } from '@/lib/api';
import { toast } from '@/store/toast-store';
import { useAuthStore } from '@/store/auth-store';
import type { UserProfile } from '@/types';

const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
];

function getApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const e = error as { response?: { data?: { message?: string } } };
    const msg = e.response?.data?.message;
    if (typeof msg === 'string') return msg;
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | null }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 rounded-xl bg-slate-800 py-5">
      <div className="text-slate-400">{icon}</div>
      <span className="text-2xl font-bold text-white">{value ?? '—'}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { fetchUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [watchlistCount, setWatchlistCount] = useState<number | null>(null);
  const [favoritesCount, setFavoritesCount] = useState<number | null>(null);
  const [ratingsCount, setRatingsCount] = useState<number | null>(null);

  // Profile form
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [language, setLanguage] = useState('vi');
  const [saving, setSaving] = useState(false);

  // Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    Promise.all([
      userApi.getMe(),
      userApi.getWatchlist({ page: 1, limit: 1 }),
      userApi.getFavorites({ page: 1, limit: 1 }),
      userApi.getRatings({ page: 1, limit: 1 }),
    ]).then(([profileRes, watchlistRes, favRes, ratingRes]) => {
      const p = profileRes.data.data;
      setProfile(p);
      setDisplayName(p.displayName);
      setBio(p.bio ?? '');
      setLanguage(p.language);
      setWatchlistCount(watchlistRes.data.meta.total);
      setFavoritesCount(favRes.data.meta.total);
      setRatingsCount(ratingRes.data.meta.total);
    }).catch(() => toast.error('Không thể tải hồ sơ'));
  }, []);

  const handleSaveProfile = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await userApi.updateProfile({ displayName: displayName.trim(), bio: bio.trim() || undefined, language });
      await fetchUser();
      toast.success('Hồ sơ đã được cập nhật!');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) return;
    if (newPassword.length < 8) { toast.error('Mật khẩu mới phải có ít nhất 8 ký tự.'); return; }
    if (newPassword !== confirmPassword) { toast.error('Mật khẩu xác nhận không khớp.'); return; }
    setChangingPw(true);
    try {
      await userApi.changePassword(oldPassword, newPassword);
      toast.success('Mật khẩu đã được thay đổi!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setChangingPw(false);
    }
  };

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 animate-pulse rounded-full bg-slate-800" />
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
          </div>
        </div>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 flex-1 animate-pulse rounded-xl bg-slate-800" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Avatar + name + email */}
      <div className="flex items-center gap-4">
        <Avatar src={profile.avatarUrl} name={profile.displayName} size="lg" />
        <div>
          <p className="text-lg font-semibold text-white">{profile.displayName}</p>
          <p className="text-sm text-slate-400">{profile.email}</p>
          {profile.emailVerified
            ? <span className="text-xs text-emerald-400">Email đã xác thực</span>
            : <span className="text-xs text-amber-400">Chưa xác thực email</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <StatCard icon={<Bookmark className="h-5 w-5" />} label="Watchlist" value={watchlistCount} />
        <StatCard icon={<Heart className="h-5 w-5" />} label="Yêu thích" value={favoritesCount} />
        <StatCard icon={<Star className="h-5 w-5" />} label="Đánh giá" value={ratingsCount} />
      </div>

      {/* Edit profile */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-white">Chỉnh sửa hồ sơ</h2>
        <form onSubmit={handleSaveProfile} className="max-w-lg space-y-5">
          <Input
            label="Tên hiển thị"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tên của bạn"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300" htmlFor="bio">Giới thiệu</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Viết vài dòng về bạn..."
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300" htmlFor="language">Ngôn ngữ</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <Button type="submit" isLoading={saving}>Lưu thay đổi</Button>
        </form>
      </section>

      {/* Change password */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-white">Đổi mật khẩu</h2>
        <form onSubmit={handleChangePassword} className="max-w-lg space-y-5">
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
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            error={confirmPassword && confirmPassword !== newPassword ? 'Mật khẩu không khớp' : undefined}
          />
          <Button type="submit" isLoading={changingPw}>Đổi mật khẩu</Button>
        </form>
      </section>
    </div>
  );
}
