# Lộ trình Triển khai CineDB — Hướng dẫn cho Agent/Nhóm Phát triển

> **Mục đích:** Chia nhỏ tài liệu `architecture.md` thành các gói công việc cụ thể, có thứ tự ưu tiên, tiêu chí hoàn thành rõ ràng — để bất kỳ agent (AI hoặc developer) nào cũng có thể nhận và thực hiện độc lập.
>
> **Nguyên tắc:**
> - Mỗi gói công việc (Work Package) tự chứa đủ context, không phụ thuộc ngầm.
> - Prompt cho agent phải kèm input rõ ràng và output kỳ vọng.
> - Ưu tiên theo dependency: infra → database → backend core → frontend core → features → optimization.

---

## Tổng quan quy trình 5 pha

```
Pha 0          Pha 1          Pha 2           Pha 3          Pha 4
Setup &        Backend        Frontend        Features       Production
Infra          Core           Core            nâng cao       Readiness
(1 tuần)       (2-3 tuần)     (2-3 tuần)      (2-3 tuần)     (1-2 tuần)
   │              │              │               │              │
   ▼              ▼              ▼               ▼              ▼
Docker         Database       Next.js app     Recommendation  CI/CD
Git repo       Auth module    Trang chủ       Search nâng cao Monitoring
DB schema      Movie CRUD     Chi tiết phim   Admin dashboard Security audit
Seed data      API core       Tìm kiếm        Notification    Performance
               User module    Auth UI          Report system   Backup
               Search basic   Rating/Comment   Activity log    SEO
```

---

## Pha 0: Khởi tạo Hạ tầng & Dự án

### WP-0.1: Khởi tạo Repository và Cấu trúc dự án

**Agent nhận việc cần biết:**
- Dự án dùng monorepo với 3 thư mục chính: `frontend/`, `backend/`, `recommendation/`
- Backend: NestJS + TypeScript
- Frontend: Next.js 14+ App Router
- Recommendation: Python FastAPI

**Đầu ra kỳ vọng:**

```
cinedb/
├── frontend/              # Next.js project
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── store/
│   ├── types/
│   ├── public/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/               # NestJS project
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── common/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
├── recommendation/        # FastAPI project
│   ├── app/
│   │   ├── main.py
│   │   └── recommender/
│   ├── requirements.txt
│   └── Dockerfile
├── docker/
│   └── docker-compose.yml
├── .github/
│   └── workflows/
├── .gitignore
├── .env.example
└── README.md
```

**Prompt mẫu cho agent:**

> Hãy khởi tạo một monorepo cho dự án CineDB với cấu trúc sau:
>
> 1. `backend/`: NestJS project mới (TypeScript strict, Prisma ORM, Jest). Cài sẵn các package: `@nestjs/config`, `@nestjs/jwt`, `@nestjs/passport`, `@nestjs/swagger`, `prisma`, `@prisma/client`, `bcrypt`, `class-validator`, `class-transformer`, `helmet`, `compression`.
>
> 2. `frontend/`: Next.js 16+ App Router project (TypeScript strict, Tailwind CSS, Zustand). Cài sẵn: `zustand`, `axios`, `lucide-react`, `date-fns`.
>
> 3. `recommendation/`: Python project với FastAPI, file `requirements.txt` chứa: `fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `psycopg2-binary`, `sqlalchemy`.
>
> 4. `docker/docker-compose.yml` với services: postgres (16-alpine), redis (7-alpine), elasticsearch (8.12.0 single-node).
>
> 5. File `.env.example` với tất cả biến môi trường cần thiết.
>
> Đảm bảo mỗi sub-project có thể chạy độc lập và có script start/dev trong package.json.

**Tiêu chí hoàn thành:**
- [ ] `docker compose up` khởi động được postgres, redis, elasticsearch
- [ ] `cd backend && npm run start:dev` chạy được NestJS trên port 4000
- [ ] `cd frontend && npm run dev` chạy được Next.js trên port 3000
- [ ] `cd recommendation && uvicorn app.main:app` chạy được trên port 5000
- [ ] `.env.example` đầy đủ biến môi trường

---

### WP-0.2: Thiết kế Database Schema (Prisma)

**Agent nhận việc cần biết:**
- Tham chiếu mục 3.3 trong architecture.md (Database Layer) và mục 5 trong SRS (Yêu cầu dữ liệu)
- Dùng Prisma schema, PostgreSQL
- Cần 15+ bảng chính + bảng trung gian cho quan hệ N-N

**Prompt mẫu cho agent:**

> Dựa trên danh sách thực thể sau, hãy viết file `prisma/schema.prisma` hoàn chỉnh:
>
> **Bảng chính:** users, movies, tv_series, seasons, episodes, people, genres, ratings, comments, watchlist_items, favorite_items, trailers, images, countries, production_companies, reports, activity_logs
>
> **Bảng trung gian:** movie_genres, movie_cast (có field character, order), movie_crew (có field job, department), movie_countries, movie_companies, series_genres, series_cast, series_crew, series_countries, series_companies
>
> **Quy tắc:**
> - `users.user_id` kiểu UUID, auto-generate
> - Các bảng khác dùng auto-increment Int
> - `movies` có soft delete (field `is_deleted` Boolean default false)
> - `ratings` có UNIQUE constraint trên (user_id, movie_id) và (user_id, series_id)
> - `comments` có field `status` enum: ACTIVE, HIDDEN, DELETED
> - `users` có field `role` enum: USER, ADMIN
> - `users` có field `status` enum: ACTIVE, LOCKED, UNVERIFIED
> - Tất cả bảng có `created_at` DateTime default now() và `updated_at` DateTime @updatedAt
> - Định nghĩa đầy đủ relations giữa các model
>
> Sau khi viết schema, tạo migration đầu tiên và file seed data với: 5 genres, 3 countries, 2 production companies, 1 admin user (email: admin@cinedb.com, password hash bcrypt của "Admin@123").

**Tiêu chí hoàn thành:**
- [ ] `npx prisma migrate dev` chạy thành công
- [ ] `npx prisma db seed` tạo dữ liệu mẫu
- [ ] Tất cả relation được test bằng Prisma Studio (`npx prisma studio`)
- [ ] Index được tạo cho các cột thường query (release_date, popularity, vote_average, email)

---

### WP-0.3: Seed Data — Dữ liệu phim mẫu

**Prompt mẫu cho agent:**

> Viết script seed (`prisma/seed.ts`) tạo dữ liệu mẫu đầy đủ cho CineDB:
>
> - 20 thể loại phim (Action, Comedy, Drama, Horror, Sci-Fi, Romance, Thriller, Animation, Documentary, Fantasy, Mystery, Adventure, Crime, Family, History, Music, War, Western, TV Movie, Foreign)
> - 50 quốc gia phổ biến (có iso_code)
> - 10 nhà sản xuất (Warner Bros, Disney, Universal, Paramount, Sony, 20th Century, Lionsgate, A24, Netflix, Marvel Studios)
> - 30 người (diễn viên + đạo diễn) với thông tin tiểu sử
> - 50 phim lẻ với đầy đủ thông tin (title, overview, release_date, runtime, genres, cast, crew, country, poster_url placeholder)
> - 10 phim bộ, mỗi phim 2-3 season, mỗi season 5-10 episode
> - 5 user mẫu với ratings và comments
> - 1 admin user
>
> Dữ liệu phải realistic (có thể lấy tên phim/diễn viên thực, nhưng thông tin mô tả tự viết). Poster URL dùng placeholder: `https://placehold.co/500x750?text={movie_title}`.

**Tiêu chí hoàn thành:**
- [ ] Seed chạy thành công, database có đủ dữ liệu
- [ ] Query test: lấy phim theo thể loại, lấy cast của phim, lấy phim của diễn viên — đều trả kết quả đúng

---

## Pha 1: Backend Core

### WP-1.1: Auth Module

**Dependency:** WP-0.1, WP-0.2

**Agent nhận việc cần biết:**
- JWT Access Token (15 phút) + Refresh Token (7 ngày)
- Bcrypt cho password hashing (salt rounds = 10)
- OAuth2 Google + Facebook (dùng Passport.js strategies)
- Email verification flow (gửi link xác thực qua email)
- Forgot password flow (gửi link reset qua email)
- Account lockout sau 5 lần login sai (30 phút cooldown)
- Rate limiting: 30 req/min cho login, 10 req/min cho register

**Prompt mẫu cho agent:**

> Xây dựng Auth Module trong NestJS cho CineDB với các endpoint sau:
>
> ```
> POST /api/v1/auth/register       — Đăng ký (email, password, display_name)
> POST /api/v1/auth/login           — Đăng nhập (email, password) → {access_token, refresh_token}
> POST /api/v1/auth/refresh         — Refresh token → {access_token}
> POST /api/v1/auth/logout          — Đăng xuất (blacklist token trong Redis)
> POST /api/v1/auth/forgot-password — Gửi email reset password
> POST /api/v1/auth/reset-password  — Reset password bằng token
> GET  /api/v1/auth/verify-email    — Xác thực email bằng token
> GET  /api/v1/auth/google          — OAuth2 Google redirect
> GET  /api/v1/auth/google/callback — OAuth2 Google callback
> ```
>
> **Yêu cầu kỹ thuật:**
> 1. Dùng `@nestjs/passport` với JwtStrategy, GoogleStrategy
> 2. Password: bcrypt, salt rounds 10, validate tối thiểu 8 ký tự (hoa + thường + số + đặc biệt)
> 3. JWT: access_token sign với secret, expire 15m; refresh_token expire 7d, lưu trong DB
> 4. Logout: lưu token JTI vào Redis set `blacklist:token:{jti}` với TTL = remaining expiry
> 5. Login lockout: dùng Redis counter `login_attempts:{email}`, TTL 30 phút
> 6. Guard: tạo `JwtAuthGuard` và `RolesGuard` dùng decorator `@Roles('ADMIN')`
> 7. Validation: dùng class-validator DTOs
> 8. Email: tạo EmailService (interface, mock implementation — thực tế integrate sau)
>
> **Kèm theo:** Unit test cho AuthService (register, login, refresh, lockout logic). Coverage ≥ 80%.

**Tiêu chí hoàn thành:**
- [ ] Đăng ký → nhận email xác thực (mock) → đăng nhập thành công
- [ ] Login sai 5 lần → bị lock → đợi 30 phút hoặc admin mở
- [ ] Access token hết hạn → dùng refresh token lấy token mới
- [ ] Logout → token cũ bị reject
- [ ] Guard `@Roles('ADMIN')` chặn user thường
- [ ] Swagger docs hiển thị đúng tất cả endpoints
- [ ] Unit test pass, coverage ≥ 80%

---

### WP-1.2: Movie Module (CRUD + Query)

**Dependency:** WP-1.1 (cần Auth Guard)

**Prompt mẫu cho agent:**

> Xây dựng Movie Module với các endpoint:
>
> ```
> # Public (không cần auth)
> GET  /api/v1/movies                — Danh sách phim (query: category=popular|now_playing|upcoming|top_rated, page, limit)
> GET  /api/v1/movies/:id            — Chi tiết phim (include: genres, credits top 10, trailers, images, vote stats)
> GET  /api/v1/movies/:id/credits    — Full cast & crew
> GET  /api/v1/movies/:id/images     — Posters + backdrops
> GET  /api/v1/movies/:id/videos     — Trailers
> GET  /api/v1/movies/:id/similar    — Phim tương tự (cùng genre, cùng director)
> GET  /api/v1/movies/:id/reviews    — Đánh giá + bình luận (paginated)
>
> # Admin only
> POST   /api/v1/admin/movies         — Tạo phim mới
> PUT    /api/v1/admin/movies/:id      — Cập nhật phim
> DELETE /api/v1/admin/movies/:id      — Soft delete phim
> POST   /api/v1/admin/movies/:id/media — Upload poster/backdrop (multipart)
> ```
>
> **Yêu cầu:**
> 1. Danh sách phim: hỗ trợ pagination (page, limit, default 20), sort (popularity, vote_average, release_date), filter (genre_id, year, country)
> 2. Chi tiết phim: response gồm tất cả thông tin + aggregated vote_average, vote_count
> 3. Phim tương tự: tìm phim có ≥ 2 genre trùng, hoặc cùng director, exclude phim hiện tại, limit 12
> 4. Redis cache: cache chi tiết phim (TTL 1h), cache danh sách popular (TTL 10m). Invalidate khi admin sửa/xóa
> 5. Soft delete: set is_deleted = true, không hiển thị trong public queries
> 6. Swagger docs cho tất cả endpoints
> 7. DTO validation đầy đủ (CreateMovieDto, UpdateMovieDto, MovieQueryDto)

**Tiêu chí hoàn thành:**
- [ ] GET /movies?category=popular trả đúng dữ liệu, phân trang
- [ ] GET /movies/:id trả đầy đủ thông tin + genres + top credits
- [ ] GET /movies/:id/similar trả phim tương tự hợp lý
- [ ] Admin CRUD hoạt động, non-admin bị reject
- [ ] Cache hit/miss hoạt động đúng
- [ ] Soft delete: phim bị xóa không xuất hiện trong public queries

---

### WP-1.3: TV Series Module

**Dependency:** WP-1.2 (tương tự Movie Module)

**Prompt mẫu cho agent:**

> Xây dựng TV Series Module tương tự Movie Module, với cấu trúc phân cấp Series → Season → Episode:
>
> ```
> GET  /api/v1/tv                                              — Danh sách series
> GET  /api/v1/tv/:id                                          — Chi tiết series (include seasons overview)
> GET  /api/v1/tv/:id/season/:season_number                     — Chi tiết season (include episodes)
> GET  /api/v1/tv/:id/season/:sn/episode/:episode_number        — Chi tiết episode
> GET  /api/v1/tv/:id/credits                                   — Cast & crew của series
> GET  /api/v1/tv/:id/similar                                   — Series tương tự
>
> # Admin
> POST/PUT/DELETE /api/v1/admin/tv                              — CRUD series
> POST/PUT/DELETE /api/v1/admin/tv/:id/season                   — CRUD season
> POST/PUT/DELETE /api/v1/admin/tv/:id/season/:sn/episode       — CRUD episode
> ```
>
> Tham chiếu Movie Module cho patterns (cache, pagination, auth guard, DTO). Season và Episode dùng cascade delete khi xóa parent.

---

### WP-1.4: Person Module

**Dependency:** WP-0.2

**Prompt mẫu cho agent:**

> Xây dựng Person Module (diễn viên, đạo diễn, crew):
>
> ```
> GET /api/v1/person/popular            — Người nổi tiếng (sort by popularity)
> GET /api/v1/person/:id                — Chi tiết (bio, birthday, place_of_birth, profile image)
> GET /api/v1/person/:id/movie-credits  — Danh sách phim đã tham gia (cast + crew)
> GET /api/v1/person/:id/tv-credits     — Danh sách TV series đã tham gia
> GET /api/v1/person/:id/images         — Ảnh profile
>
> # Admin
> POST/PUT/DELETE /api/v1/admin/people  — CRUD
> ```
>
> Movie credits trả về theo dạng: `{ cast: [{movie, character, order}], crew: [{movie, job, department}] }`, sắp xếp theo release_date DESC.

---

### WP-1.5: Rating & Comment Module

**Dependency:** WP-1.1, WP-1.2

**Prompt mẫu cho agent:**

> Xây dựng Rating và Comment Module:
>
> **Rating:**
> ```
> POST   /api/v1/movies/:id/rating   — Đánh giá phim (score: 1-10). Upsert: nếu đã đánh giá thì cập nhật.
> DELETE /api/v1/movies/:id/rating   — Xóa đánh giá của mình
> GET    /api/v1/users/me/ratings    — Xem tất cả đánh giá của mình (paginated)
> ```
>
> **Comment:**
> ```
> POST   /api/v1/comments             — Viết bình luận {movie_id/series_id, content}
> PATCH  /api/v1/comments/:id         — Sửa bình luận (chỉ owner)
> DELETE /api/v1/comments/:id         — Xóa bình luận (owner hoặc admin)
> POST   /api/v1/comments/:id/report  — Báo cáo bình luận vi phạm {reason}
> ```
>
> **Quy tắc nghiệp vụ:**
> 1. Rating: UNIQUE(user_id, movie_id). Score phải 1-10 integer.
> 2. Sau mỗi rating thay đổi, recalculate movie.vote_average và vote_count (dùng SQL aggregate, không tính ở app layer)
> 3. Comment: filter từ ngữ cấm (danh sách từ config). Nếu chứa từ cấm → reject với mã ERR_COMMENT_002.
> 4. Report: mỗi user chỉ report 1 comment 1 lần (UNIQUE user_id, comment_id).
> 5. Invalidate cache movie khi rating thay đổi.

---

### WP-1.6: User Module (Profile, Watchlist, Favorites)

**Dependency:** WP-1.1

**Prompt mẫu cho agent:**

> Xây dựng User Module:
>
> ```
> # Profile
> GET   /api/v1/users/me              — Thông tin cá nhân
> PATCH /api/v1/users/me              — Cập nhật profile (display_name, bio, avatar_url, language)
> PATCH /api/v1/users/me/password     — Đổi mật khẩu (old_password, new_password)
>
> # Watchlist
> GET    /api/v1/users/me/watchlist           — Danh sách watchlist (paginated)
> POST   /api/v1/movies/:id/watchlist         — Thêm phim vào watchlist
> DELETE /api/v1/movies/:id/watchlist         — Xóa phim khỏi watchlist
>
> # Favorites
> GET    /api/v1/users/me/favorites           — Danh sách yêu thích (paginated)
> POST   /api/v1/movies/:id/favorite          — Thêm phim vào favorites
> DELETE /api/v1/movies/:id/favorite          — Xóa khỏi favorites
>
> # Activity
> GET    /api/v1/users/me/activity            — Lịch sử hoạt động (paginated, filter by type)
> ```
>
> Watchlist và Favorites hoạt động như toggle: nếu đã có thì xóa, nếu chưa thì thêm (hoặc dùng riêng POST/DELETE).
> Activity log ghi lại tất cả action: RATE, COMMENT, WATCHLIST_ADD, WATCHLIST_REMOVE, FAVORITE_ADD, FAVORITE_REMOVE.

---

### WP-1.7: Search Module (Elasticsearch)

**Dependency:** WP-1.2, WP-0.1 (Elasticsearch container)

**Prompt mẫu cho agent:**

> Xây dựng Search Module tích hợp Elasticsearch:
>
> ```
> GET /api/v1/search/multi?query=...     — Tìm kiếm đa loại (movies + tv + people)
> GET /api/v1/search/movie?query=...     — Tìm phim
> GET /api/v1/search/tv?query=...        — Tìm phim bộ
> GET /api/v1/search/person?query=...    — Tìm người
>
> GET /api/v1/discover/movie?genre=...&year=...&country=...&sort_by=...  — Lọc nâng cao
> GET /api/v1/discover/tv?genre=...
> ```
>
> **Yêu cầu:**
> 1. Tạo Elasticsearch index `movies`, `tv_series`, `people` với mapping phù hợp (text fields dùng standard analyzer, keyword fields cho filter, completion suggester cho autocomplete)
> 2. Sync service: đồng bộ toàn bộ data từ PostgreSQL khi khởi động, sau đó incremental sync mỗi 5 phút (query by updated_at)
> 3. Multi search: query tất cả index, trộn kết quả, trả về grouped by type
> 4. Fuzzy search: tolerance 1-2 ký tự sai chính tả
> 5. Autocomplete: completion suggester, trigger sau 2 ký tự
> 6. Discover: dùng Elasticsearch bool query với must/filter cho genre, year range, country, sort
> 7. Cache kết quả autocomplete trong Redis (TTL 5 phút)
> 8. Fallback: nếu Elasticsearch không khả dụng, fallback sang PostgreSQL ILIKE query

---

### WP-1.8: Trending & Genre Module

**Dependency:** WP-1.2

**Prompt mẫu cho agent:**

> Xây dựng Trending và Genre endpoints:
>
> ```
> GET /api/v1/trending/movie/day     — Phim trending hôm nay
> GET /api/v1/trending/movie/week    — Phim trending tuần này
> GET /api/v1/trending/tv/day
> GET /api/v1/trending/tv/week
> GET /api/v1/trending/all/day       — Tất cả (movie + tv) trending
>
> GET /api/v1/genres/movie           — Danh sách thể loại phim
> GET /api/v1/genres/tv              — Danh sách thể loại TV
> ```
>
> **Trending algorithm:**
> ```
> trending_score = (view_count_recent * 1.0) + (rating_count_recent * 2.0) + (comment_count_recent * 1.5)
> ```
> - `_recent` = trong 24h (day) hoặc 7 ngày (week)
> - Tính toán bằng SQL aggregate query, cache kết quả trong Redis (TTL 1h)
> - Cron job (NestJS @Cron) chạy mỗi giờ để refresh cache

---

## Pha 2: Frontend Core

### WP-2.1: Layout & Thiết kế chung

**Dependency:** WP-1.2 (cần API hoạt động)

**Prompt mẫu cho agent:**

> Xây dựng layout và components cơ bản cho CineDB frontend (Next.js 14 + Tailwind CSS):
>
> **Layout:**
> - `app/layout.tsx`: Root layout với ThemeProvider (dark/light mode), font Inter/Plus Jakarta Sans
> - Header: logo, navigation (Movies, TV Shows, People), search bar, auth buttons (Login/Register hoặc user avatar dropdown)
> - Footer: links, copyright
> - Mobile: hamburger menu, search icon expand
>
> **UI Components (trong `components/ui/`):**
> - Button (variants: primary, secondary, ghost, danger; sizes: sm, md, lg)
> - Input, Textarea, Select
> - Modal (portal-based, trap focus, close on Escape)
> - Toast notifications (success, error, info — auto dismiss 5s)
> - Skeleton loader (cho card phim, chi tiết phim)
> - Pagination
> - StarRating (interactive, 1-10, half-star display)
> - Badge (cho genre tags)
> - Avatar
> - Dropdown menu
>
> **Movie Components (trong `components/movie/`):**
> - MovieCard: poster, title, year, vote_average (circular progress), hover effect
> - MovieGrid: responsive grid (2 cột mobile, 3 tablet, 5 desktop)
> - MovieCarousel: horizontal scroll với arrow buttons
> - MovieHero: backdrop image, title, overview, genres, rating, actions (rate, watchlist, favorite)
>
> **Styling:**
> - Color scheme: dark theme mặc định (bg-slate-900, text-white), light theme optional
> - Accent color: blue-500 (tương tự TMDB)
> - Circular rating badge: xanh lá (≥7), vàng (5-6.9), đỏ (<5)
> - Responsive breakpoints: sm:640, md:768, lg:1024, xl:1280

**Tiêu chí hoàn thành:**
- [ ] Layout render đúng trên desktop, tablet, mobile
- [ ] Dark/light mode toggle hoạt động
- [ ] Tất cả UI components có trong Storybook hoặc trang demo `/dev/components`
- [ ] MovieCard hiển thị đúng dữ liệu từ API

---

### WP-2.2: Trang chủ

**Dependency:** WP-2.1, WP-1.8 (trending API)

**Prompt mẫu cho agent:**

> Xây dựng trang chủ CineDB (`app/page.tsx`):
>
> **Sections:**
> 1. Hero banner: phim trending #1, backdrop làm nền, title + overview + nút Xem chi tiết + Xem trailer
> 2. Trending Today: MovieCarousel, toggle day/week
> 3. Popular Movies: MovieCarousel
> 4. Now Playing: MovieCarousel
> 5. Top Rated: MovieCarousel
> 6. Popular TV Shows: MovieCarousel
>
> **Kỹ thuật:**
> - Dùng ISR (revalidate: 60 giây) cho SEO
> - Mỗi section fetch data song song (Promise.all)
> - Skeleton loading cho mỗi section
> - Lazy load sections below the fold

---

### WP-2.3: Trang chi tiết phim

**Dependency:** WP-2.1, WP-1.2

**Prompt mẫu cho agent:**

> Xây dựng trang chi tiết phim (`app/movie/[id]/page.tsx`):
>
> **Layout:**
> 1. Hero section: backdrop image full-width, overlay gradient, poster bên trái, thông tin bên phải (title, tagline, genres as badges, release_date, runtime, vote_average circular badge, overview)
> 2. Action buttons: Rate, Add to Watchlist, Add to Favorites, Watch Trailer (nếu đã login; nếu chưa → hiện tooltip "Đăng nhập để sử dụng")
> 3. Cast section: horizontal scroll danh sách diễn viên (ảnh tròn, tên, character)
> 4. Media section: tabs (Trailers, Posters, Backdrops)
>    - Trailer: click mở modal embed YouTube
>    - Posters/Backdrops: lightbox gallery
> 5. Reviews section: danh sách đánh giá từ users, paginated
> 6. Similar Movies: MovieCarousel
>
> **SEO:** generateMetadata() trả title, description, og:image (poster)
> **Rendering:** SSG với generateStaticParams cho top 100 phim, fallback: 'blocking'

---

### WP-2.4: Trang tìm kiếm & Discover

**Dependency:** WP-2.1, WP-1.7

**Prompt mẫu cho agent:**

> Xây dựng trang tìm kiếm và discover:
>
> **Search (`app/search/page.tsx`):**
> - URL: `/search?query=...`
> - Hiển thị kết quả grouped by tabs: All, Movies, TV Shows, People
> - Mỗi tab có count badge
> - Kết quả dạng list (poster nhỏ + title + year + overview snippet)
> - Pagination
>
> **Discover (`app/discover/movie/page.tsx`):**
> - Sidebar filters: Genre (multi-select checkboxes), Year (range slider hoặc select), Country (dropdown), Rating (range slider ≥ X)
> - Sort by: Popularity, Rating, Release Date, Title (A-Z)
> - Results: MovieGrid
> - URL query params sync: `/discover/movie?genre=28,12&year=2024&sort_by=popularity.desc`
> - Mobile: filters trong slide-out drawer
>
> **Search Bar (Header):**
> - Autocomplete dropdown sau 2 ký tự (debounce 300ms)
> - Hiển thị top 5 gợi ý (poster thumbnail + title + year + type badge)
> - Enter → redirect to `/search?query=...`
> - Click gợi ý → redirect to chi tiết

---

### WP-2.5: Auth UI (Login, Register, Profile)

**Dependency:** WP-2.1, WP-1.1

**Prompt mẫu cho agent:**

> Xây dựng các trang Authentication:
>
> **Login (`app/login/page.tsx`):**
> - Form: email, password, nút "Quên mật khẩu?"
> - Nút "Đăng nhập với Google", "Đăng nhập với Facebook"
> - Redirect đến trang trước đó sau khi login thành công
> - Hiển thị error message khi sai thông tin
>
> **Register (`app/register/page.tsx`):**
> - Form: display_name, email, password, confirm_password
> - Real-time password strength indicator
> - Sau khi đăng ký: hiển thị thông báo kiểm tra email
>
> **Profile (`app/profile/page.tsx`):** (protected route)
> - Tabs: Profile Info, Watchlist, Favorites, Ratings, Activity
> - Edit profile: display_name, bio, avatar upload
> - Change password form
>
> **Auth State Management (Zustand store):**
> - `useAuthStore`: user, isAuthenticated, login(), logout(), refreshToken()
> - Persist access_token trong memory, refresh_token trong httpOnly cookie
> - Auto refresh token khi access_token gần hết hạn
> - Axios interceptor: attach token, handle 401 → refresh → retry

---

## Pha 3: Features Nâng cao

### WP-3.1: Admin Dashboard

**Dependency:** Pha 1 hoàn tất

**Prompt mẫu cho agent:**

> Xây dựng Admin Dashboard (`app/admin/`):
>
> **Layout:** Sidebar navigation (Dashboard, Movies, TV Shows, People, Genres, Users, Comments, Reports)
>
> **Pages:**
> 1. Dashboard: stats cards (total movies, users, ratings, comments), charts (ratings per day line chart, top genres pie chart, new users per week bar chart)
> 2. Movies: data table (search, filter by genre/status, sort, pagination), nút Add/Edit/Delete, form CRUD đầy đủ
> 3. Users: data table, actions (lock/unlock, change role)
> 4. Comments: data table filter by status (all/reported/hidden), actions (approve/hide/delete)
> 5. Reports: danh sách báo cáo chưa xử lý, xem nội dung bị báo cáo, actions (dismiss/hide content/lock user)
>
> **Kỹ thuật:** Protected route (role = ADMIN). Charts dùng Recharts.

---

### WP-3.2: Recommendation Service

**Dependency:** WP-0.3 (seed data), WP-1.5 (ratings data)

**Prompt mẫu cho agent:**

> Xây dựng Recommendation microservice bằng Python FastAPI:
>
> **Endpoints:**
> ```
> GET /recommend/similar/{movie_id}?limit=12         — Phim tương tự (content-based)
> GET /recommend/personalized/{user_id}?limit=20     — Gợi ý cá nhân (hybrid)
> POST /recommend/retrain                             — Retrain model (admin trigger)
> GET /health                                         — Health check
> ```
>
> **Thuật toán:**
>
> 1. Content-Based Filtering:
>    - Feature vector cho mỗi phim: genre one-hot + director one-hot + top 5 cast one-hot + keyword TF-IDF
>    - Cosine similarity matrix (pre-computed, lưu pickle file)
>    - Query: lấy top N similar từ matrix
>
> 2. Collaborative Filtering:
>    - User-item rating matrix (scipy sparse)
>    - SVD decomposition (TruncatedSVD, k=50)
>    - Predict score = U * Sigma * Vt
>    - Pre-compute nightly via cron
>
> 3. Hybrid:
>    - score = 0.4 * content_score + 0.6 * collaborative_score
>    - Filter: exclude movies user đã rated/watchlisted
>    - Fallback: nếu user < 5 ratings → return content-based only + trending
>
> **Data pipeline:**
> - Kết nối PostgreSQL (read-only replica nếu có)
> - Load data lên pandas DataFrame
> - Train/retrain mỗi đêm (cron job hoặc trigger API)
> - Lưu model artifacts: `models/content_similarity.pkl`, `models/svd_model.pkl`
>
> **NestJS integration:**
> - Tạo RecommendationService trong backend, gọi FastAPI qua HTTP
> - Cache kết quả trong Redis (TTL 6h cho personalized, TTL 1h cho similar)
> - Circuit breaker: nếu recommendation service down, fallback trả phim cùng genre + popular

---

### WP-3.3: Notification System (tuỳ chọn)

**Prompt tóm tắt cho agent:**

> Xây dựng hệ thống thông báo in-app:
> - Bảng `notifications` (user_id, type, content, read, created_at)
> - Trigger: phim mới từ đạo diễn/diễn viên user follow, reply comment, admin action
> - API: GET /notifications, PATCH /notifications/:id/read, PATCH /notifications/read-all
> - Frontend: bell icon trong header với badge count, dropdown danh sách notifications

---

## Pha 4: Production Readiness

### WP-4.1: CI/CD Pipeline

**Prompt mẫu cho agent:**

> Tạo GitHub Actions workflow (`.github/workflows/`):
>
> 1. `ci.yml` (trigger on push/PR to main):
>    - Lint (eslint frontend + backend)
>    - Unit test (Jest backend, coverage report)
>    - Build check (Next.js build, NestJS build)
>    - E2E test (Playwright — login flow, search flow, rating flow)
>    - Security scan (npm audit, OWASP ZAP baseline)
>
> 2. `deploy.yml` (trigger on tag v*):
>    - Build Docker images (frontend, backend, recommendation)
>    - Push to container registry (Docker Hub hoặc GitHub Container Registry)
>    - SSH deploy to VPS: pull images, docker compose up -d
>    - Health check after deploy
>    - Rollback nếu health check fail

---

### WP-4.2: Monitoring & Logging

**Prompt mẫu cho agent:**

> Thêm monitoring và logging vào hệ thống:
>
> 1. **NestJS logging:** Structured JSON logs (winston), log mỗi request (method, path, status, duration, user_id)
> 2. **Prometheus metrics:** NestJS middleware export metrics tại `/metrics` (http_request_duration, http_requests_total, active_connections)
> 3. **Docker Compose thêm:**
>    - Prometheus (scrape API server mỗi 15s)
>    - Grafana (dashboards: API performance, error rate, DB connections)
>    - ELK hoặc Loki + Grafana cho log aggregation
> 4. **Health check endpoints:** GET /health (API), GET /health/db, GET /health/redis, GET /health/elasticsearch
> 5. **Alerting rules:** Prometheus alertmanager → Slack/email khi error rate > 1% hoặc response time P95 > 1s

---

### WP-4.3: Security Hardening

**Prompt mẫu cho agent:**

> Thực hiện security hardening cho production:
>
> 1. Helmet.js headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
> 2. CORS config: chỉ cho phép frontend domain
> 3. Rate limiting: `@nestjs/throttler` (100 req/min global, 30 req/min auth endpoints)
> 4. Input sanitization: `sanitize-html` cho comment content
> 5. SQL injection: verify tất cả queries dùng Prisma parameterized (audit code)
> 6. HTTPS: Nginx SSL config với Let's Encrypt auto-renew
> 7. Environment variables: không commit secrets, dùng `.env` + Docker secrets
> 8. Dependency audit: `npm audit fix`, pin versions
> 9. API documentation: Swagger UI chỉ enable trong development

---

### WP-4.4: SEO & Performance

**Prompt mẫu cho agent:**

> Tối ưu SEO và performance:
>
> **SEO:**
> 1. generateMetadata() cho tất cả trang công khai (title, description, og:image, twitter:card)
> 2. Structured data JSON-LD cho phim (Movie schema), người (Person schema)
> 3. `sitemap.xml` dynamic (generate từ database: top 1000 movies, all genres)
> 4. `robots.txt`
> 5. Canonical URLs
> 6. Alt text cho tất cả images
>
> **Performance:**
> 1. Image optimization: next/image với CDN loader, responsive sizes, lazy loading
> 2. Code splitting: dynamic import cho modal, gallery, charts
> 3. Prefetch: next/link prefetch cho movie cards on hover
> 4. API response compression (gzip/brotli via Nginx)
> 5. Database query optimization: explain analyze cho slow queries, add missing indexes
> 6. Lighthouse audit: target score ≥ 80 cho Performance, Accessibility, SEO

---

## Bảng tổng hợp Work Packages

| Pha | Mã | Tên | Dependency | Ước lượng | Ưu tiên |
|-----|----|-----|------------|-----------|---------|
| 0 | WP-0.1 | Khởi tạo repo + Docker | — | 1 ngày | Cao |
| 0 | WP-0.2 | Database schema (Prisma) | WP-0.1 | 1 ngày | Cao |
| 0 | WP-0.3 | Seed data | WP-0.2 | 1 ngày | Cao |
| 1 | WP-1.1 | Auth Module | WP-0.2 | 3 ngày | Cao |
| 1 | WP-1.2 | Movie Module | WP-1.1 | 3 ngày | Cao |
| 1 | WP-1.3 | TV Series Module | WP-1.2 | 2 ngày | Cao |
| 1 | WP-1.4 | Person Module | WP-0.2 | 1 ngày | Cao |
| 1 | WP-1.5 | Rating & Comment | WP-1.1, WP-1.2 | 2 ngày | Cao |
| 1 | WP-1.6 | User Module | WP-1.1 | 2 ngày | Cao |
| 1 | WP-1.7 | Search Module (ES) | WP-1.2 | 3 ngày | Cao |
| 1 | WP-1.8 | Trending & Genre | WP-1.2 | 1 ngày | Trung bình |
| 2 | WP-2.1 | Layout & Components | WP-1.2 | 3 ngày | Cao |
| 2 | WP-2.2 | Trang chủ | WP-2.1 | 2 ngày | Cao |
| 2 | WP-2.3 | Chi tiết phim | WP-2.1 | 2 ngày | Cao |
| 2 | WP-2.4 | Tìm kiếm & Discover | WP-2.1, WP-1.7 | 2 ngày | Cao |
| 2 | WP-2.5 | Auth UI | WP-2.1, WP-1.1 | 2 ngày | Cao |
| 3 | WP-3.1 | Admin Dashboard | Pha 1 | 4 ngày | Trung bình |
| 3 | WP-3.2 | Recommendation Service | WP-0.3, WP-1.5 | 4 ngày | Trung bình |
| 3 | WP-3.3 | Notification | Pha 2 | 2 ngày | Thấp |
| 4 | WP-4.1 | CI/CD | Pha 2 | 2 ngày | Cao |
| 4 | WP-4.2 | Monitoring & Logging | Pha 3 | 2 ngày | Trung bình |
| 4 | WP-4.3 | Security Hardening | Pha 3 | 2 ngày | Cao |
| 4 | WP-4.4 | SEO & Performance | Pha 3 | 2 ngày | Trung bình |

**Tổng ước lượng:** ~48 ngày công (1 developer) hoặc ~4-5 tuần (2 developers song song)

---

## Hướng dẫn sử dụng với AI Agent

### Quy trình giao việc cho agent

```
1. Chọn Work Package tiếp theo (theo dependency + priority)
2. Copy prompt mẫu tương ứng
3. Kèm context:
   - Link/nội dung architecture.md (phần liên quan)
   - Code hiện tại của project (file cấu trúc, schema, existing modules)
   - Biến môi trường / config đang dùng
4. Yêu cầu agent:
   - Viết code hoàn chỉnh
   - Viết unit test
   - Cập nhật Swagger docs
   - Liệt kê file đã tạo/sửa
5. Review output:
   - Chạy test
   - Chạy lint
   - Test thủ công endpoint bằng Postman/curl
   - Commit nếu pass
6. Chuyển sang Work Package tiếp theo
```

### Tips cho prompt hiệu quả

1. **Luôn cung cấp schema hiện tại:** Copy nội dung `prisma/schema.prisma` vào prompt để agent biết cấu trúc DB.
2. **Cung cấp code mẫu từ module đã hoàn thành:** Ví dụ khi làm TV Module, kèm code Movie Module để agent giữ convention nhất quán.
3. **Chỉ rõ pattern đang dùng:** "Dùng Repository pattern như MovieService, cache pattern như MovieController."
4. **Yêu cầu test cụ thể:** "Viết unit test cho: tạo rating mới, cập nhật rating, xóa rating, tính lại vote_average."
5. **Giới hạn scope:** Mỗi lần chỉ giao 1 Work Package. Không giao cả Pha cùng lúc.
