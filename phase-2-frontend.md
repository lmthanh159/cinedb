# Phase 2 — Frontend Core

> **Thời gian:** 11 ngày  
> **Mục tiêu:** Website hoạt động đầy đủ cho end-user, demo được toàn bộ user flows  
> **Dependency:** Phase 1 hoàn tất (v0.2.0) — API phải sẵn sàng

---

## Quy ước chung cho tất cả WP Frontend

### Context luôn kèm cho agent

```
1. Danh sách API endpoints (copy từ Swagger JSON hoặc phase-1 doc)
2. TypeScript types/interfaces đã tạo (types/index.ts)
3. Existing components (components/ui/, components/movie/ nếu đã có)
4. Layout files (app/layout.tsx)
5. API client (lib/api.ts)
6. Zustand stores (store/)
7. tailwind.config.ts
8. next.config.ts
```

### Design System bắt buộc

```
Colors (Tailwind):
  Primary:    blue-500 (#3B82F6) — accent, links, buttons
  Background: slate-900 (#0F172A) — dark mode default
  Surface:    slate-800 (#1E293B) — cards, panels
  Text:       white / slate-300 (secondary)
  Success:    emerald-500
  Warning:    amber-500
  Error:      red-500
  Rating:     emerald-500 (≥7), amber-500 (5-6.9), red-500 (<5)

Typography:
  Font: Inter (next/font/google)
  Headings: font-bold
  Body: text-sm (14px) to text-base (16px)

Spacing: Tailwind default scale (p-4, gap-6, etc.)
Border radius: rounded-lg (cards), rounded-full (avatars, rating badges)
Transitions: transition-all duration-200
```

---

## WP-2.1: Layout, UI Components & API Client

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 3 ngày |
| **Agent skill** | Next.js 16, React, Tailwind CSS, Zustand, TypeScript |
| **Dependency** | Phase 1 API endpoints sẵn sàng |

### Prompt cho Agent

```
Bạn là senior frontend engineer chuyên React/Next.js. Xây dựng layout, UI component library, và API client cho CineDB.

## Tech Stack
- Next.js 16 (App Router, TypeScript strict)
- Tailwind CSS (dark mode mặc định, class strategy)
- Zustand (state management)
- Axios (HTTP client)
- lucide-react (icons)
- date-fns (date formatting)
- clsx + tailwind-merge (className utility)
- next-themes (dark/light toggle)

## 1. Utility (lib/utils.ts)

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(path: string | null, size: string = 'w500'): string {
  if (!path) return '/placeholder-movie.png';
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getRatingColor(rating: number): string {
  if (rating >= 7) return 'text-emerald-500';
  if (rating >= 5) return 'text-amber-500';
  return 'text-red-500';
}

export function formatDate(date: string | Date, format: string = 'dd/MM/yyyy'): string {
  return dateFnsFormat(new Date(date), format, { locale: vi });
}

export function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
```

## 2. API Client (lib/api.ts)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 → refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await useAuthStore.getState().refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// API functions (typed)
export const movieApi = {
  getMovies: (params: MovieQueryParams) => api.get<PaginatedResponse<Movie>>('/movies', { params }),
  getMovie: (id: number) => api.get<{ data: MovieDetail }>(`/movies/${id}`),
  getMovieCredits: (id: number) => api.get(`/movies/${id}/credits`),
  getMovieVideos: (id: number) => api.get(`/movies/${id}/videos`),
  getMovieSimilar: (id: number) => api.get(`/movies/${id}/similar`),
  getMovieReviews: (id: number, params?: PaginationParams) => api.get(`/movies/${id}/reviews`, { params }),
  rateMovie: (id: number, score: number) => api.post(`/movies/${id}/rating`, { score }),
  deleteRating: (id: number) => api.delete(`/movies/${id}/rating`),
  addToWatchlist: (id: number) => api.post(`/movies/${id}/watchlist`),
  removeFromWatchlist: (id: number) => api.delete(`/movies/${id}/watchlist`),
  addToFavorite: (id: number) => api.post(`/movies/${id}/favorite`),
  removeFromFavorite: (id: number) => api.delete(`/movies/${id}/favorite`),
};

export const searchApi = {
  multiSearch: (query: string, page?: number) => api.get('/search/multi', { params: { query, page } }),
  autocomplete: (query: string) => api.get('/search/autocomplete', { params: { query, limit: 5 } }),
  discoverMovies: (params: DiscoverParams) => api.get('/discover/movie', { params }),
};

export const authApi = {
  register: (data: RegisterData) => api.post('/auth/register', data),
  login: (data: LoginData) => api.post('/auth/login', data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/users/me'),
};

export const trendingApi = {
  getTrending: (mediaType: string, timeWindow: string) => api.get(`/trending/${mediaType}/${timeWindow}`),
};

export const genreApi = {
  getMovieGenres: () => api.get('/genres/movie'),
  getTVGenres: () => api.get('/genres/tv'),
};
```

## 3. TypeScript Types (types/index.ts)

Định nghĩa đầy đủ interfaces cho:
- Movie, MovieDetail, MovieQueryParams
- TVSeries, TVSeriesDetail
- Season, Episode
- Person, PersonDetail
- Genre, Country, ProductionCompany
- Rating, Comment, Trailer, Image
- User, UserProfile
- PaginatedResponse<T>, PaginationParams
- AuthTokens, RegisterData, LoginData
- SearchResult, DiscoverParams

Mỗi interface phải match chính xác với API response shape.

## 4. Zustand Stores

### store/auth-store.ts
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<string>;
  fetchUser: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
}
// Persist refreshToken trong localStorage (hoặc httpOnly cookie nếu BFF)
// accessToken chỉ trong memory (Zustand state)
```

### store/ui-store.ts
```typescript
interface UIState {
  isSidebarOpen: boolean;
  isSearchOpen: boolean;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
  toggleSearch: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}
```

## 5. UI Components (components/ui/)

Tạo các components sau, mỗi component là 1 file, sử dụng Tailwind + cn():

### Button
- Variants: primary (bg-blue-500), secondary (bg-slate-700), ghost (bg-transparent), danger (bg-red-500)
- Sizes: sm, md, lg
- States: disabled, loading (spinner icon)
- Props: variant, size, isLoading, leftIcon, rightIcon, children, ...HTMLButtonProps

### Input
- Types: text, email, password (toggle show/hide icon)
- States: error (red border + error message below)
- Props: label, error, helperText, leftIcon, ...HTMLInputProps

### Modal
- Portal-based (createPortal to document.body)
- Backdrop click to close, Escape key to close
- Trap focus inside modal
- Animation: fade in/out + scale
- Props: isOpen, onClose, title, children, size ('sm'|'md'|'lg'|'xl')

### Toast (notification system)
- Types: success (green), error (red), info (blue), warning (amber)
- Auto-dismiss after 5 seconds
- Stack multiple toasts
- Dùng Zustand store hoặc context
- Function: toast.success('Message'), toast.error('Message')

### Skeleton
- MovieCardSkeleton: shimmer animation, poster ratio + text lines
- MovieDetailSkeleton: hero area + content placeholders
- ListSkeleton: multiple rows

### Pagination
- Props: currentPage, totalPages, onPageChange
- Display: « 1 2 3 ... 10 »
- Mobile: simplified (prev/next + page number)

### StarRating
- Interactive: click/hover to select score (1-10)
- Display mode: show score with stars filled
- Circular progress variant (như TMDB): SVG circle, color by score
- Props: value, onChange, readonly, size

### Badge
- Variants: default, genre (rounded-full bg-slate-700)
- Props: variant, children

### Avatar
- Circular image with fallback (initials or icon)
- Sizes: sm (32px), md (40px), lg (64px)
- Props: src, alt, name (for fallback initials), size

### Dropdown
- Trigger + menu (absolute positioned)
- Click outside to close
- Keyboard navigation (arrow keys + enter)
- Props: trigger, items: { label, onClick, icon?, divider? }[]

## 6. Movie Components (components/movie/)

### MovieCard
- Aspect ratio: 2:3 (poster ratio)
- Content: poster image (next/image, fill, object-cover), title, year, rating badge (circular)
- Hover: scale-105, shadow-lg, show action buttons (watchlist, favorite)
- Click: navigate to /movie/{id}
- Props: movie: Movie (id, title, posterUrl, releaseDate, voteAverage)

### MovieGrid
- Responsive grid: grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5, gap-4
- Props: movies: Movie[], isLoading (show skeletons)

### MovieCarousel
- Horizontal scroll container (overflow-x-auto, snap-x)
- Arrow buttons (left/right) cho desktop, swipe cho mobile
- Section title + "See All" link
- Props: title, movies, viewAllLink?, isLoading

### MovieHero
- Full-width backdrop image (800px height desktop, 400px mobile)
- Gradient overlay (from transparent to slate-900)
- Content overlay: poster (left), info (right): title, tagline, genres as badges, year, runtime, rating
- Action buttons: Rate, Watchlist, Favorite, Watch Trailer
- Props: movie: MovieDetail

## 7. Layout (app/layout.tsx)

### Header (components/layout/Header.tsx)
- Sticky top, bg-slate-900/80 backdrop-blur
- Logo (link to /): "CineDB" text hoặc SVG
- Navigation links: Movies, TV Shows, People (desktop)
- Search: icon click → expand search bar (mobile: full-width overlay)
- Auth area:
  - Guest: Login + Register buttons
  - Logged in: Avatar + Dropdown (Profile, Watchlist, Favorites, Logout; Admin Dashboard nếu ADMIN)
- Mobile: hamburger menu → slide-out drawer

### Footer (components/layout/Footer.tsx)
- Links: About, API, Contact, Terms, Privacy
- Copyright: © 2026 CineDB
- Social links placeholder

### SearchBar (components/layout/SearchBar.tsx)
- Input with search icon
- Debounce 300ms → call autocomplete API
- Dropdown suggestions: poster thumbnail (40x60) + title + year + media type badge (Movie/TV/Person)
- Enter → navigate to /search?query=...
- Click suggestion → navigate to detail page
- Escape → close dropdown

## Output mong đợi

Tất cả files trên. Kiểm tra:
1. `npm run build` — không lỗi
2. `npm run dev` → layout hiển thị (header + footer + placeholder content)
3. Dark/light mode toggle hoạt động
4. Search bar: gõ text → dropdown xuất hiện (mock data OK nếu API chưa sẵn sàng)
5. Responsive: DevTools 375px → hamburger menu, 768px → 2-col grid, 1440px → full layout
6. Tất cả UI components render đúng (tạo trang /dev/components để preview)
```

### Tiêu chí hoàn thành

- [ ] Layout header + footer render đúng trên desktop/tablet/mobile
- [ ] Dark/light mode toggle
- [ ] Search bar autocomplete dropdown
- [ ] MovieCard hiển thị poster, title, year, rating badge
- [ ] MovieGrid responsive (2→3→4→5 columns)
- [ ] MovieCarousel horizontal scroll với arrows
- [ ] Modal, Toast, Skeleton hoạt động
- [ ] API client configured, auth interceptor hoạt động
- [ ] Zustand auth store persist tokens
- [ ] `npm run build` pass

---

## WP-2.2: Trang chủ

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | Next.js 16 SSR/ISR, React, Data Fetching |
| **Dependency** | WP-2.1, WP-1.8 (Trending API) |

### Prompt cho Agent

```
Xây dựng trang chủ CineDB (app/page.tsx).

[ATTACH: components/movie/ (MovieCard, MovieCarousel, MovieHero), components/ui/, lib/api.ts, types/]

## Layout trang chủ

1. Hero Banner — phim trending #1
   - Full-width backdrop image
   - Title, overview (max 3 dòng, truncate), genres, rating
   - Buttons: "Xem chi tiết", "Xem trailer"
   - Auto-rotate mỗi 8 giây (top 5 trending, dots indicator)

2. Trending Today — MovieCarousel
   - Toggle: Hôm nay / Tuần này (tab buttons)
   - Fetch: GET /trending/movie/day hoặc /week
   - "Xem tất cả" → /trending

3. Phim phổ biến — MovieCarousel
   - Fetch: GET /movies?category=popular&limit=20
   - "Xem tất cả" → /movies?category=popular

4. Đang chiếu — MovieCarousel
   - GET /movies?category=now_playing&limit=20

5. Sắp ra mắt — MovieCarousel
   - GET /movies?category=upcoming&limit=20

6. Đánh giá cao — MovieCarousel
   - GET /movies?category=top_rated&limit=20

7. TV Shows phổ biến — MovieCarousel
   - GET /tv?category=popular&limit=20

## Kỹ thuật

- Rendering: ISR, revalidate: 60 (mỗi 60 giây regenerate)
- Data fetch: server component, dùng fetch() trực tiếp (không axios, để tận dụng Next.js cache)
- Tất cả sections fetch song song: Promise.all([...])
- SEO: generateMetadata() → title "CineDB — Khám phá thế giới điện ảnh", description, og:image (backdrop trending #1)
- Loading: app/loading.tsx với skeleton cho trang chủ
- Error: app/error.tsx với thông báo thân thiện + nút retry

## Responsive

- Desktop: hero 600px height, carousels 5 cards visible
- Tablet: hero 400px, carousels 3 cards
- Mobile: hero 300px, carousels 2 cards, sections stacked

## Output

- app/page.tsx (server component, ISR)
- app/loading.tsx
- app/error.tsx
- Components mới nếu cần (HeroBanner, TrendingSection)
```

---

## WP-2.3: Trang chi tiết phim

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | Next.js 16 SSG/ISR, React, YouTube Embed |
| **Dependency** | WP-2.1, WP-1.2 (Movie Detail API) |

### Prompt cho Agent

```
Xây dựng trang chi tiết phim (app/movie/[id]/page.tsx).

[ATTACH: components/, lib/api.ts, types/, store/auth-store.ts]

## Layout

1. Hero Section — backdrop full-width (500px height)
   - Gradient overlay: linear-gradient(to right, slate-900 20%, transparent 60%)
   - Poster bên trái (300x450, rounded-lg, shadow)
   - Info bên phải: title (h1), original title (italic, nếu khác), tagline, genres as badges, year + runtime + country, rating (circular badge CineDB score + TMDB score nhỏ hơn), overview

2. Action Buttons (ngay dưới info)
   - 🎬 Xem trailer (mở modal YouTube embed)
   - ⭐ Đánh giá (mở modal StarRating 1-10, submit → POST /movies/:id/rating)
   - 🔖 Watchlist (toggle icon, POST/DELETE /movies/:id/watchlist)
   - ❤️ Yêu thích (toggle icon, POST/DELETE /movies/:id/favorite)
   - Nếu chưa login: click → hiện tooltip "Đăng nhập để sử dụng" + link login

3. Cast Section
   - Horizontal scroll, mỗi item: avatar tròn (w185), tên, character name
   - Click → /person/{id}
   - "Xem tất cả" → expand full cast

4. Media Section (tabs)
   - Tab Trailer: grid thumbnails, click → mở modal embed YouTube (iframe, src=https://www.youtube.com/embed/{key})
   - Tab Poster: grid ảnh, click → lightbox gallery (prev/next)
   - Tab Backdrop: tương tự

5. Reviews Section
   - Danh sách: avatar + username + rating (stars) + date + comment text
   - "Viết đánh giá" button (logged in only) → expand form (rating + textarea)
   - Pagination (load more button)

6. Similar Movies — MovieCarousel
   - GET /movies/:id/similar

## Kỹ thuật

- Rendering: generateStaticParams cho top 200 movies (query DB), fallback: 'blocking'
- ISR: revalidate: 3600 (1 giờ)
- SEO: generateMetadata → title "{movieTitle} ({year}) — CineDB", description: overview, og:image: posterUrl
- Structured data: JSON-LD Movie schema (name, datePublished, director, actor, aggregateRating)
- User actions (rate, watchlist, favorite): client component, check auth state
- YouTube modal: lazy load iframe, autoplay=1 when opened

## Responsive

- Desktop: poster bên trái + info bên phải (flex row)
- Mobile: poster centered above info (flex col), hero height reduced
- Cast: horizontal scroll trên mọi device
- Tabs: scrollable tab headers trên mobile

## Output

- app/movie/[id]/page.tsx
- app/movie/[id]/loading.tsx
- components/movie/MovieHero.tsx (nếu chưa có)
- components/movie/CastList.tsx
- components/movie/MediaTabs.tsx
- components/movie/ReviewSection.tsx
- components/movie/TrailerModal.tsx
- components/movie/RatingModal.tsx
```

---

## WP-2.4: Trang tìm kiếm & Discover

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | Next.js, React, URL Query Params Sync |
| **Dependency** | WP-2.1, WP-1.7 (Search API) |

### Prompt cho Agent

```
Xây dựng trang Search và Discover cho CineDB.

[ATTACH: components/, lib/api.ts, types/]

## 1. Search Page (app/search/page.tsx) — Client-side rendered

URL: /search?query=avengers&type=movie&page=1

- Tabs: Tất cả | Phim ({count}) | TV ({count}) | Người ({count})
- Results: list layout (poster nhỏ 92x138 bên trái, title + year + overview snippet bên phải)
- Fetch: GET /search/multi?query=... (tab Tất cả) hoặc /search/movie, /search/tv, /search/person
- Empty state: "Không tìm thấy kết quả cho '{query}'. Thử từ khóa khác?"
- Pagination: phía dưới
- URL sync: query params cập nhật khi đổi tab hoặc page (useRouter + useSearchParams)

## 2. Discover Page (app/discover/movie/page.tsx) — Client-side rendered

URL: /discover/movie?genres=28,12&year_min=2020&sort_by=popularity.desc&page=1

- Sidebar (desktop) / Drawer (mobile):
  - Thể loại: multi-select checkboxes (fetch từ GET /genres/movie)
  - Năm: range slider hoặc 2 select dropdowns (1970 → current year)
  - Quốc gia: searchable dropdown (fetch danh sách countries)
  - Điểm đánh giá: range slider (0 → 10, step 0.5)
  - Nút "Áp dụng" + "Xóa bộ lọc"

- Sort bar: Dropdown sort by (Phổ biến, Đánh giá, Ngày phát hành, Tên A-Z)
- Results: MovieGrid
- Pagination
- URL sync: tất cả filters sync với URL query params
- Mobile: nút "Bộ lọc" → slide-out drawer chứa filters

Tương tự cho /discover/tv.

## Responsive
- Search results: list layout trên mọi device, poster ẩn trên mobile rất nhỏ (< 400px)
- Discover: sidebar 250px trên desktop, drawer trên mobile/tablet
```

---

## WP-2.5: Auth UI (Login, Register, Profile)

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | Next.js, React Forms, Zustand, Auth Flow |
| **Dependency** | WP-2.1, WP-1.1 (Auth API) |

### Prompt cho Agent

```
Xây dựng Auth pages và Protected routes cho CineDB.

[ATTACH: store/auth-store.ts, lib/api.ts, components/ui/]

## 1. Login Page (app/login/page.tsx)

- Form: Email input, Password input (toggle visibility), "Quên mật khẩu?" link
- Buttons: "Đăng nhập", "Đăng nhập với Google" (icon), "Đăng nhập với Facebook" (icon)
- Link: "Chưa có tài khoản? Đăng ký"
- Submit: authApi.login() → zustand store login → redirect đến trang trước (stored in query param ?redirect=/movie/123 hoặc /)
- Error: hiển thị dưới form (inline error message)
- Loading: button disabled + spinner khi submitting

## 2. Register Page (app/register/page.tsx)

- Form: Display Name, Email, Password, Confirm Password
- Password strength indicator (bar: weak/medium/strong, real-time validation)
- Password rules hiển thị: ✓ 8+ ký tự, ✓ chữ hoa, ✓ chữ thường, ✓ số, ✓ ký tự đặc biệt
- Submit: authApi.register() → hiện thông báo "Đăng ký thành công! Kiểm tra email để xác thực."
- Link: "Đã có tài khoản? Đăng nhập"

## 3. Forgot Password (app/forgot-password/page.tsx)

- Form: Email
- Submit → hiện thông báo "Nếu email tồn tại, link đặt lại mật khẩu đã được gửi."

## 4. Profile Page (app/profile/page.tsx) — Protected

- Tabs:
  - Hồ sơ: avatar, display name, bio, language select → edit form
  - Đổi mật khẩu: old password, new password, confirm
  - Watchlist: MovieGrid (fetch GET /users/me/watchlist)
  - Yêu thích: MovieGrid (fetch GET /users/me/favorites)
  - Đánh giá: list (movie poster + title + my rating + date)
  - Hoạt động: timeline (action icon + description + time)
- Mobile: tabs → horizontal scroll hoặc dropdown select

## 5. Auth Callback (app/auth/callback/page.tsx)

- Nhận tokens từ URL params (sau OAuth redirect)
- Set tokens vào Zustand store
- Redirect to /

## 6. Protected Route HOC/Middleware

```typescript
// components/auth/ProtectedRoute.tsx
'use client';
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) return <LoadingSkeleton />;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
```

Wrap các trang cần auth: profile, watchlist, favorites, admin.

## 7. Auth State Hydration

Khi app load:
1. Check localStorage cho refreshToken
2. Nếu có → call refreshAccessToken()
3. Nếu thành công → fetchUser() → set isAuthenticated
4. Nếu fail → clear tokens, redirect nếu ở protected page

Implement trong app/layout.tsx hoặc provider component.

## Output
- app/login/page.tsx
- app/register/page.tsx
- app/forgot-password/page.tsx
- app/profile/page.tsx
- app/auth/callback/page.tsx
- components/auth/ProtectedRoute.tsx
- components/auth/AuthProvider.tsx (hydration logic)
```

---

## Checkpoint Pha 2

```
╔══════════════════════════════════════════════════════╗
║  CHECKPOINT PHA 2                                    ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  User Flows:                                         ║
║  ✅ Trang chủ hiển thị trending, popular, carousels  ║
║  ✅ Click phim → chi tiết đầy đủ (info, cast, media) ║
║  ✅ Xem trailer trong modal YouTube                  ║
║  ✅ Tìm kiếm "Avengers" → kết quả chính xác         ║
║  ✅ Autocomplete dropdown hoạt động                  ║
║  ✅ Discover: lọc genre + year → results đúng        ║
║  ✅ Đăng ký → đăng nhập → thấy avatar               ║
║  ✅ Đánh giá phim → điểm cập nhật                    ║
║  ✅ Toggle watchlist + favorites                     ║
║  ✅ Profile page hiển thị tabs                       ║
║  ✅ Đăng xuất → trở về guest                         ║
║                                                      ║
║  Responsive:                                         ║
║  ✅ Desktop 1440px: full layout                      ║
║  ✅ Tablet 768px: 2-3 col grid                       ║
║  ✅ Mobile 375px: 1-2 col, hamburger menu            ║
║                                                      ║
║  Quality:                                            ║
║  ✅ npm run build pass                               ║
║  ✅ Lighthouse SEO ≥ 90 (public pages)               ║
║  ✅ No console errors                                ║
║  ✅ Dark mode hoạt động                              ║
║                                                      ║
║  → Tag v0.3.0                                        ║
╚══════════════════════════════════════════════════════╝
```
