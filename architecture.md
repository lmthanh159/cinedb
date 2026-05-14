# Tài liệu Kiến trúc Hệ thống CineDB

> **Phiên bản:** 1.0  
> **Ngày tạo:** 08/05/2026  
> **Tham chiếu:** SRS CineDB v1.0  
> **Trạng thái:** Bản thảo

---

## 1. Tổng quan

### 1.1. Giới thiệu

CineDB là một nền tảng cơ sở dữ liệu phim trực tuyến (tương tự TheMovieDB) cho phép người dùng tra cứu, khám phá, đánh giá và tương tác với nội dung điện ảnh. Tài liệu này mô tả kiến trúc tổng quan, các thành phần hệ thống, luồng dữ liệu, chiến lược triển khai và các quyết định thiết kế quan trọng.

### 1.2. Mục tiêu kiến trúc

| Mục tiêu | Mô tả |
|-----------|--------|
| **Hiệu năng** | API response < 500ms, FCP < 2s, hỗ trợ 10.000 CCU |
| **Khả năng mở rộng** | Horizontal scaling qua containerization và load balancing |
| **Bảo mật** | OWASP Top 10 compliance, JWT/OAuth2, HTTPS toàn bộ |
| **Tính khả dụng** | Uptime ≥ 99.5%, failover tự động, health check |
| **Bảo trì** | Modular codebase, CI/CD, tài liệu API tự động |
| **SEO** | SSR/SSG cho trang công khai, structured data, sitemap |

### 1.3. Các nhóm người dùng

- **Khách vãng lai (Guest):** Xem, tìm kiếm, duyệt thông tin phim.
- **Người dùng đã đăng ký (User):** Đánh giá, bình luận, watchlist, yêu thích, theo dõi.
- **Quản trị viên (Admin):** CRUD nội dung, kiểm duyệt, thống kê.

---

## 2. Kiến trúc tổng quan

### 2.1. Phong cách kiến trúc

Hệ thống áp dụng **kiến trúc phân tầng (Layered Architecture)** kết hợp **Modular Monolith** cho backend chính, với các module có khả năng tách thành microservice khi cần mở rộng (đặc biệt là Recommendation Module và Search Module).

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Browser   │  │   Mobile    │  │   Third-party Client    │  │
│  │  (Desktop)  │  │  (Tablet)   │  │     (API Consumer)      │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼──────────────────────┼────────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                     CDN (CloudFront / Cloudflare)                │
│              Static assets, images, cached pages                 │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                REVERSE PROXY / LOAD BALANCER                     │
│                        (Nginx)                                   │
│              SSL Termination, Rate Limiting                      │
└──────────┬──────────────────────────────────┬────────────────────┘
           │                                  │
           ▼                                  ▼
┌────────────────────────┐     ┌────────────────────────────────┐
│    FRONTEND SERVER     │     │        API SERVER               │
│      (Next.js)         │     │        (NestJS)                 │
│                        │     │                                 │
│  • SSR / SSG           │     │  ┌───────────┐ ┌────────────┐  │
│  • React Components    │────▶│  │Auth Module│ │Movie Module│  │
│  • State Management    │     │  └───────────┘ └────────────┘  │
│  • Tailwind CSS        │     │  ┌───────────┐ ┌────────────┐  │
│                        │     │  │User Module│ │Search Module│ │
│                        │     │  └───────────┘ └────────────┘  │
│                        │     │  ┌───────────────────────────┐  │
│                        │     │  │  Recommendation Module    │  │
│                        │     │  └───────────────────────────┘  │
└────────────────────────┘     └──────────┬─────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
         ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
         │   PostgreSQL     │  │    Redis      │  │  Elasticsearch   │
         │  (Primary DB)    │  │   (Cache)     │  │ (Search Engine)  │
         │                  │  │               │  │                  │
         │  • Movie data    │  │  • Session    │  │  • Full-text     │
         │  • User data     │  │  • Cache      │  │  • Autocomplete  │
         │  • Ratings       │  │  • Rate limit │  │  • Fuzzy search  │
         │  • Comments      │  │  • Trending   │  │  • Faceted       │
         └──────────────────┘  └──────────────┘  └──────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │   Object Storage │
         │   (AWS S3)       │
         │                  │
         │  • Posters       │
         │  • Backdrops     │
         │  • Avatars       │
         └──────────────────┘
```

### 2.2. Luồng request tổng quan

```
Client Request
    │
    ▼
CDN (cache static/media) ──cache hit──▶ Response
    │ cache miss
    ▼
Nginx (reverse proxy)
    │
    ├── /api/*  ──▶  API Server (NestJS)
    │                    │
    │                    ├── Auth Guard (JWT verify)
    │                    ├── Validation Pipe
    │                    ├── Service Layer
    │                    ├── Repository Layer
    │                    │       │
    │                    │       ├── Redis (cache check)
    │                    │       ├── PostgreSQL (data)
    │                    │       └── Elasticsearch (search)
    │                    │
    │                    └── Response
    │
    └── /*      ──▶  Frontend Server (Next.js SSR)
                         │
                         ├── Server-side data fetch ──▶ API Server
                         ├── HTML render
                         └── Response
```

---

## 3. Chi tiết các thành phần

### 3.1. Frontend Layer

**Công nghệ:** React 18+ với Next.js 14+ (App Router)

#### Cấu trúc thư mục

```
frontend/
├── app/                    # Next.js App Router
│   ├── (public)/           # Routes công khai
│   │   ├── page.tsx            # Trang chủ
│   │   ├── movie/[id]/         # Chi tiết phim
│   │   ├── tv/[id]/            # Chi tiết phim bộ
│   │   ├── person/[id]/        # Chi tiết diễn viên
│   │   ├── search/             # Tìm kiếm
│   │   └── discover/           # Khám phá / lọc
│   ├── (auth)/             # Routes xác thực
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (user)/             # Routes người dùng (protected)
│   │   ├── profile/
│   │   ├── watchlist/
│   │   ├── favorites/
│   │   └── history/
│   ├── admin/              # Routes quản trị (protected)
│   │   ├── dashboard/
│   │   ├── movies/
│   │   ├── users/
│   │   ├── comments/
│   │   └── reports/
│   └── api/                # API Routes (BFF pattern)
├── components/
│   ├── ui/                 # Atomic components (Button, Input, Modal...)
│   ├── movie/              # Movie card, list, detail...
│   ├── layout/             # Header, Footer, Sidebar...
│   └── shared/             # SearchBar, Pagination, Rating...
├── lib/
│   ├── api.ts              # API client (axios/fetch wrapper)
│   ├── auth.ts             # Auth utilities
│   └── utils.ts            # Helper functions
├── store/                  # State management (Zustand)
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
└── styles/                 # Global styles, Tailwind config
```

#### Chiến lược Rendering

| Trang | Rendering | Lý do |
|-------|-----------|-------|
| Trang chủ | ISR (revalidate: 60s) | Nội dung cập nhật thường xuyên, SEO cần thiết |
| Chi tiết phim | SSG + ISR | SEO quan trọng, dữ liệu ít thay đổi |
| Chi tiết diễn viên | SSG + ISR | Tương tự chi tiết phim |
| Tìm kiếm | CSR | Nội dung dynamic, không cần index |
| Profile / Watchlist | CSR | Dữ liệu cá nhân, không cần SEO |
| Admin dashboard | CSR | Bảo mật, không cần SEO |

#### Responsive Breakpoints

```
Mobile:    320px  – 767px   → Layout 1 cột, hamburger menu
Tablet:    768px  – 1199px  → Layout 2 cột, sidebar thu gọn
Desktop:   1200px+          → Layout đầy đủ, sidebar mở rộng
```

### 3.2. Backend Layer (API Server)

**Công nghệ:** Node.js 20+ với NestJS 10+

#### Cấu trúc Module

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── common/                 # Shared resources
│   │   ├── decorators/
│   │   ├── filters/            # Exception filters
│   │   ├── guards/             # Auth, Role guards
│   │   ├── interceptors/       # Logging, Transform
│   │   ├── pipes/              # Validation pipes
│   │   ├── dto/                # Base DTOs
│   │   └── utils/
│   │
│   ├── auth/                   # Authentication Module
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/         # JWT, Google, Facebook
│   │   ├── guards/
│   │   └── dto/
│   │
│   ├── user/                   # User Module
│   │   ├── user.module.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── entities/
│   │   └── dto/
│   │
│   ├── movie/                  # Movie Module
│   │   ├── movie.module.ts
│   │   ├── movie.controller.ts
│   │   ├── movie.service.ts
│   │   ├── entities/
│   │   └── dto/
│   │
│   ├── tv/                     # TV Series Module
│   │   ├── tv.module.ts
│   │   ├── tv.controller.ts
│   │   ├── tv.service.ts
│   │   ├── entities/           # Series, Season, Episode
│   │   └── dto/
│   │
│   ├── person/                 # Person Module (Actor, Director)
│   │   ├── person.module.ts
│   │   ├── person.controller.ts
│   │   ├── person.service.ts
│   │   ├── entities/
│   │   └── dto/
│   │
│   ├── rating/                 # Rating Module
│   │   ├── rating.module.ts
│   │   ├── rating.controller.ts
│   │   ├── rating.service.ts
│   │   └── dto/
│   │
│   ├── comment/                # Comment Module
│   │   ├── comment.module.ts
│   │   ├── comment.controller.ts
│   │   ├── comment.service.ts
│   │   └── dto/
│   │
│   ├── search/                 # Search Module
│   │   ├── search.module.ts
│   │   ├── search.controller.ts
│   │   ├── search.service.ts   # Elasticsearch integration
│   │   └── dto/
│   │
│   ├── recommendation/         # Recommendation Module
│   │   ├── recommendation.module.ts
│   │   ├── recommendation.controller.ts
│   │   ├── recommendation.service.ts
│   │   └── dto/
│   │
│   ├── media/                  # Media Module (Images, Trailers)
│   │   ├── media.module.ts
│   │   ├── media.controller.ts
│   │   ├── media.service.ts    # S3 integration
│   │   └── dto/
│   │
│   ├── admin/                  # Admin Module
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── dto/
│   │
│   └── database/               # Database configuration
│       ├── database.module.ts
│       ├── migrations/
│       └── seeds/
│
├── prisma/
│   └── schema.prisma           # Database schema
├── test/                       # E2E tests
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

#### API Endpoints chính

```
# Authentication
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
GET    /api/v1/auth/oauth/google
GET    /api/v1/auth/oauth/facebook

# Users
GET    /api/v1/users/me
PATCH  /api/v1/users/me
PATCH  /api/v1/users/me/password
GET    /api/v1/users/me/watchlist
GET    /api/v1/users/me/favorites
GET    /api/v1/users/me/ratings
GET    /api/v1/users/me/activity

# Movies
GET    /api/v1/movies                       # List (popular, now_playing, upcoming, top_rated)
GET    /api/v1/movies/:id
GET    /api/v1/movies/:id/credits
GET    /api/v1/movies/:id/images
GET    /api/v1/movies/:id/videos
GET    /api/v1/movies/:id/similar
GET    /api/v1/movies/:id/reviews
POST   /api/v1/movies/:id/rating
DELETE /api/v1/movies/:id/rating
POST   /api/v1/movies/:id/watchlist
DELETE /api/v1/movies/:id/watchlist
POST   /api/v1/movies/:id/favorite
DELETE /api/v1/movies/:id/favorite

# TV Series
GET    /api/v1/tv
GET    /api/v1/tv/:id
GET    /api/v1/tv/:id/season/:season_number
GET    /api/v1/tv/:id/season/:season_number/episode/:episode_number

# People
GET    /api/v1/person/:id
GET    /api/v1/person/:id/movie-credits
GET    /api/v1/person/:id/tv-credits

# Search
GET    /api/v1/search/multi?query=...
GET    /api/v1/search/movie?query=...
GET    /api/v1/search/tv?query=...
GET    /api/v1/search/person?query=...

# Discover (filter)
GET    /api/v1/discover/movie?genre=...&year=...&country=...&sort_by=...
GET    /api/v1/discover/tv?genre=...

# Genres
GET    /api/v1/genres/movie
GET    /api/v1/genres/tv

# Trending
GET    /api/v1/trending/:media_type/:time_window

# Comments
POST   /api/v1/comments
PATCH  /api/v1/comments/:id
DELETE /api/v1/comments/:id
POST   /api/v1/comments/:id/report

# Recommendations
GET    /api/v1/recommendations/personalized

# Admin
GET    /api/v1/admin/users
PATCH  /api/v1/admin/users/:id
POST   /api/v1/admin/movies
PUT    /api/v1/admin/movies/:id
DELETE /api/v1/admin/movies/:id
GET    /api/v1/admin/comments
PATCH  /api/v1/admin/comments/:id/moderate
GET    /api/v1/admin/reports
PATCH  /api/v1/admin/reports/:id
GET    /api/v1/admin/stats
```

#### Request Pipeline

```
Request
  │
  ▼
Middleware (CORS, Helmet, Compression, Logger)
  │
  ▼
Rate Limiter (per IP / per user)
  │
  ▼
Guard (JWT Authentication → Role Authorization)
  │
  ▼
Pipe (Validation, Transform)
  │
  ▼
Controller → Service → Repository
  │
  ▼
Interceptor (Response Transform, Cache, Logging)
  │
  ▼
Exception Filter (Error formatting)
  │
  ▼
Response
```

### 3.3. Database Layer

**Công nghệ:** PostgreSQL 16+  
**ORM:** Prisma

#### Sơ đồ ERD (quan hệ chính)

```
┌──────────┐     ┌──────────────┐     ┌───────────┐
│   User   │────<│   Rating     │>────│   Movie   │
│          │────<│   Comment    │>────│           │
│          │────<│   Watchlist  │>────│           │
│          │────<│   Favorite   │>────│           │
│          │     └──────────────┘     │           │
│          │                          │           │>────┐
└──────────┘     ┌──────────────┐     │           │     │
                 │  MovieCast   │>────│           │     │
┌──────────┐     │              │     └───────────┘     │
│  Person  │────<│              │                       │
│          │────<│  MovieCrew   │     ┌───────────┐     │
│          │     └──────────────┘     │   Genre   │─────┘
│          │                          └───────────┘  (movie_genre)
│          │     ┌──────────────┐
│          │────<│  SeriesCast  │>────┐
└──────────┘     └──────────────┘     │
                                      │
┌──────────┐     ┌──────────────┐     │
│  Season  │────<│   Episode    │     │
│          │     └──────────────┘     │
│          │>────┐                    │
└──────────┘     │                    │
                 │  ┌───────────┐     │
                 └──│ TVSeries  │─────┘
                    └───────────┘

  ┌──────────┐   ┌──────────┐   ┌───────────────────┐
  │ Trailer  │   │  Image   │   │ProductionCompany  │
  │          │   │          │   │                   │
  └──────────┘   └──────────┘   └───────────────────┘
  (belongs to     (belongs to    (N-N with Movie,
   Movie/TV)      Movie/TV/       TVSeries)
                  Person)

  ┌──────────┐   ┌──────────┐
  │ Country  │   │  Report  │
  └──────────┘   └──────────┘
  (N-N with       (user reports
   Movie/TV)      comments)
```

#### Bảng dữ liệu chính

| Bảng | Mô tả | Khóa chính |
|------|--------|------------|
| `users` | Thông tin người dùng | `user_id` (UUID) |
| `movies` | Phim lẻ | `movie_id` (SERIAL) |
| `tv_series` | Phim bộ | `series_id` (SERIAL) |
| `seasons` | Mùa phim | `season_id` (SERIAL) |
| `episodes` | Tập phim | `episode_id` (SERIAL) |
| `people` | Diễn viên / đạo diễn | `person_id` (SERIAL) |
| `genres` | Thể loại phim | `genre_id` (SERIAL) |
| `ratings` | Đánh giá (1-10) | `rating_id` (SERIAL) |
| `comments` | Bình luận | `comment_id` (SERIAL) |
| `watchlist_items` | Watchlist | `watchlist_id` (SERIAL) |
| `favorite_items` | Yêu thích | `favorite_id` (SERIAL) |
| `trailers` | Trailer (YouTube/Vimeo) | `trailer_id` (SERIAL) |
| `images` | Hình ảnh (poster, backdrop) | `image_id` (SERIAL) |
| `countries` | Quốc gia | `country_id` (SERIAL) |
| `production_companies` | Nhà sản xuất | `company_id` (SERIAL) |
| `movie_genres` | N-N Movie ↔ Genre | Composite |
| `movie_cast` | N-N Movie ↔ Person (vai diễn) | Composite |
| `movie_crew` | N-N Movie ↔ Person (đoàn phim) | Composite |
| `movie_countries` | N-N Movie ↔ Country | Composite |
| `reports` | Báo cáo vi phạm | `report_id` (SERIAL) |
| `activity_logs` | Lịch sử hoạt động | `log_id` (SERIAL) |

#### Chiến lược Index

```sql
-- Tìm kiếm & lọc hiệu năng cao
CREATE INDEX idx_movies_title ON movies USING gin(to_tsvector('simple', title));
CREATE INDEX idx_movies_release_date ON movies(release_date DESC);
CREATE INDEX idx_movies_popularity ON movies(popularity DESC);
CREATE INDEX idx_movies_vote_average ON movies(vote_average DESC);
CREATE INDEX idx_movies_is_deleted ON movies(is_deleted) WHERE is_deleted = false;

-- Quan hệ & join
CREATE INDEX idx_ratings_user_movie ON ratings(user_id, movie_id);
CREATE INDEX idx_ratings_movie ON ratings(movie_id);
CREATE INDEX idx_comments_movie ON comments(movie_id, created_at DESC);
CREATE INDEX idx_watchlist_user ON watchlist_items(user_id);
CREATE INDEX idx_favorites_user ON favorite_items(user_id);
CREATE INDEX idx_movie_genres_genre ON movie_genres(genre_id);
CREATE INDEX idx_movie_cast_person ON movie_cast(person_id);

-- Unique constraints
CREATE UNIQUE INDEX idx_ratings_unique ON ratings(user_id, movie_id);
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### 3.4. Cache Layer

**Công nghệ:** Redis 7+

#### Chiến lược Cache

| Key Pattern | TTL | Mục đích |
|-------------|-----|----------|
| `movie:{id}` | 1 giờ | Chi tiết phim |
| `movie:{id}:credits` | 1 giờ | Cast & crew |
| `movies:popular:{page}` | 10 phút | Danh sách phim phổ biến |
| `movies:trending:{window}` | 1 giờ | Phim trending |
| `movies:top_rated:{page}` | 30 phút | Phim được đánh giá cao |
| `search:autocomplete:{prefix}` | 5 phút | Gợi ý tìm kiếm |
| `person:{id}` | 2 giờ | Chi tiết diễn viên |
| `genre:list` | 24 giờ | Danh sách thể loại |
| `user:{id}:session` | 30 phút | Session data |
| `ratelimit:{ip}:{endpoint}` | 1 phút | Rate limiting counter |
| `blacklist:token:{jti}` | 15 phút | Blacklisted JWT tokens |

#### Cache Invalidation

- **Write-through:** Khi cập nhật phim/đánh giá, xóa cache liên quan ngay lập tức.
- **TTL-based:** Các danh sách (popular, trending) tự hết hạn theo TTL.
- **Pattern delete:** Khi admin sửa phim, xóa tất cả key `movie:{id}*`.

### 3.5. Search Engine

**Công nghệ:** Elasticsearch 8+ (hoặc Meilisearch làm thay thế nhẹ hơn)

#### Index Mapping

```json
{
  "movies": {
    "mappings": {
      "properties": {
        "title":          { "type": "text", "analyzer": "standard" },
        "original_title": { "type": "text" },
        "overview":       { "type": "text" },
        "genres":         { "type": "keyword" },
        "release_date":   { "type": "date" },
        "vote_average":   { "type": "float" },
        "popularity":     { "type": "float" },
        "country":        { "type": "keyword" },
        "language":       { "type": "keyword" },
        "cast":           { "type": "text" },
        "director":       { "type": "text" },
        "suggest":        { "type": "completion" }
      }
    }
  }
}
```

#### Đồng bộ dữ liệu

```
PostgreSQL ──(trigger/CDC)──▶ Sync Worker ──▶ Elasticsearch

Cơ chế:
  • Sync đầy đủ (full re-index): chạy hàng đêm via cron job
  • Sync incremental: dùng updated_at timestamp, chạy mỗi 5 phút
  • Real-time: khi admin thêm/sửa phim, push event qua Redis Pub/Sub
```

### 3.6. Recommendation Module

**Công nghệ:** Python microservice (FastAPI + scikit-learn / TensorFlow Recommenders)

#### Thuật toán

```
┌─────────────────────────────────────────────────┐
│             HYBRID RECOMMENDER                   │
│                                                  │
│  ┌───────────────────┐  ┌─────────────────────┐  │
│  │  Content-Based     │  │  Collaborative      │  │
│  │  Filtering         │  │  Filtering          │  │
│  │                    │  │                     │  │
│  │  Input:            │  │  Input:             │  │
│  │  • Genre vectors   │  │  • User-item matrix │  │
│  │  • Keyword TF-IDF  │  │  • Rating history   │  │
│  │  • Cast/Director   │  │                     │  │
│  │                    │  │  Method:            │  │
│  │  Method:           │  │  • Matrix factor.   │  │
│  │  • Cosine simil.   │  │  • KNN              │  │
│  └────────┬───────────┘  └─────────┬───────────┘  │
│           │                        │              │
│           ▼                        ▼              │
│      ┌─────────────────────────────────┐          │
│      │     Weighted Combination         │          │
│      │  score = α·CB + (1-α)·CF        │          │
│      │  α = 0.4 (tunable)              │          │
│      └──────────────┬──────────────────┘          │
│                     │                             │
│                     ▼                             │
│              Ranked Results                       │
└─────────────────────────────────────────────────┘
```

#### API giao tiếp

```
Backend (NestJS) ──HTTP/gRPC──▶ Recommendation Service (FastAPI)
                                    │
                                    ├── GET /recommend/similar/{movie_id}
                                    ├── GET /recommend/personalized/{user_id}
                                    └── POST /recommend/retrain (admin trigger)
```

#### Fallback

- Nếu user mới (< 5 ratings) → trả về phim trending/popular.
- Nếu recommendation service down → trả về phim cùng thể loại.

---

## 4. Authentication & Authorization

### 4.1. Luồng xác thực

```
┌─────────────────── Email/Password Login ───────────────────┐
│                                                             │
│  Client ──POST /auth/login──▶ API Server                    │
│                                    │                        │
│                         Verify credentials (bcrypt)         │
│                                    │                        │
│                         Generate JWT pair:                  │
│                         • Access Token  (15 min)            │
│                         • Refresh Token (7 days)            │
│                                    │                        │
│  Client ◀── { access_token, refresh_token } ── API Server   │
│                                                             │
│  Subsequent requests:                                       │
│  Client ──Authorization: Bearer {access_token}──▶ API       │
│                                                             │
│  Token refresh:                                             │
│  Client ──POST /auth/refresh { refresh_token }──▶ API       │
│  Client ◀── { new_access_token } ── API                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────── OAuth2 Login (Google) ──────────────────┐
│                                                             │
│  Client ──redirect──▶ Google OAuth Consent                  │
│  Google ──redirect──▶ /auth/oauth/google/callback?code=...  │
│  API Server ──exchange code──▶ Google (get user profile)    │
│  API Server: find/create user → generate JWT pair           │
│  Client ◀── { access_token, refresh_token }                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.2. Phân quyền (RBAC)

| Endpoint Pattern | Guest | User | Admin |
|------------------|-------|------|-------|
| `GET /movies/*` | ✅ | ✅ | ✅ |
| `GET /search/*` | ✅ | ✅ | ✅ |
| `POST /movies/:id/rating` | ❌ | ✅ | ✅ |
| `POST /comments` | ❌ | ✅ | ✅ |
| `POST /movies/:id/watchlist` | ❌ | ✅ | ✅ |
| `GET /users/me` | ❌ | ✅ | ✅ |
| `PATCH /users/me` | ❌ | ✅ | ✅ |
| `POST /admin/movies` | ❌ | ❌ | ✅ |
| `GET /admin/users` | ❌ | ❌ | ✅ |
| `PATCH /admin/comments/:id/moderate` | ❌ | ❌ | ✅ |
| `GET /admin/stats` | ❌ | ❌ | ✅ |

### 4.3. Chính sách bảo mật

- Mật khẩu: bcrypt (salt rounds ≥ 10), tối thiểu 8 ký tự (hoa + thường + số + đặc biệt).
- Khóa tài khoản sau 5 lần đăng nhập sai liên tiếp (mở lại sau 30 phút).
- Rate limiting: 100 req/min (API), 30 req/min (login), 10 req/min (register).
- HTTPS bắt buộc, HSTS header, CSP header.
- Input sanitization chống XSS, parameterized queries chống SQL Injection.
- CSRF token cho form-based actions.

---

## 5. Luồng dữ liệu chính

### 5.1. Tìm kiếm phim

```
User nhập "Aveng"
      │
      ▼
Frontend debounce (300ms)
      │
      ▼
GET /api/v1/search/multi?query=aveng
      │
      ▼
API Server → Search Module
      │
      ├── Check Redis cache: search:autocomplete:aveng
      │       │
      │       ├── HIT → return cached results
      │       └── MISS ↓
      │
      ├── Query Elasticsearch (fuzzy + completion suggester)
      │       │
      │       └── Results: [{movie: "Avengers"}, {movie: "Avengers: Endgame"}, ...]
      │
      ├── Cache results in Redis (TTL: 5 min)
      │
      └── Return JSON response
```

### 5.2. Đánh giá phim

```
User chọn 8 sao cho phim #123
      │
      ▼
POST /api/v1/movies/123/rating  { score: 8 }
      │
      ▼
Auth Guard → verify JWT → extract user_id
      │
      ▼
Rating Service:
      │
      ├── Check existing rating: SELECT ... WHERE user_id=? AND movie_id=123
      │       │
      │       ├── EXISTS → UPDATE score = 8 (upsert)
      │       └── NOT EXISTS → INSERT new rating
      │
      ├── Recalculate movie average:
      │   UPDATE movies SET
      │     vote_average = (SELECT AVG(score) FROM ratings WHERE movie_id=123),
      │     vote_count = (SELECT COUNT(*) FROM ratings WHERE movie_id=123)
      │   WHERE movie_id = 123
      │
      ├── Invalidate cache: DEL movie:123, movies:top_rated:*
      │
      └── Return { success: true, new_average: 7.8 }
```

### 5.3. Gợi ý cá nhân hóa

```
User truy cập trang chủ (đã đăng nhập)
      │
      ▼
GET /api/v1/recommendations/personalized
      │
      ▼
Recommendation Service:
      │
      ├── Check Redis cache: recommendations:user:{user_id}
      │       │
      │       ├── HIT → return cached
      │       └── MISS ↓
      │
      ├── Fetch user data:
      │   • Rating history (from PostgreSQL)
      │   • Favorite genres
      │   • Watchlist
      │
      ├── Check minimum data:
      │       │
      │       ├── < 5 ratings → Fallback: return trending movies
      │       └── ≥ 5 ratings → Run hybrid recommender
      │
      ├── Hybrid algorithm:
      │   • Content-Based: cosine similarity on genre/cast vectors
      │   • Collaborative: matrix factorization (pre-computed nightly)
      │   • Combine: weighted score
      │   • Filter: exclude already rated/watchlisted
      │   • Rank: top 20 results
      │
      ├── Cache results (TTL: 6 hours)
      │
      └── Return recommended movie list
```

---

## 6. Triển khai & Hạ tầng

### 6.1. Kiến trúc triển khai

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                     │
│                                                              │
│  ┌──────────────┐                                           │
│  │  CloudFlare   │  ← DNS, DDoS protection, CDN edge        │
│  │  / CloudFront │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│  ┌──────▼───────┐                                           │
│  │    Nginx      │  ← SSL termination, load balancing        │
│  │  (2 instances)│                                           │
│  └──┬────────┬──┘                                           │
│     │        │                                               │
│  ┌──▼──┐  ┌──▼──┐                                           │
│  │FE-1 │  │FE-2 │  ← Next.js containers                     │
│  └─────┘  └─────┘                                           │
│     │        │                                               │
│  ┌──▼──┐  ┌──▼──┐  ┌──────┐                                │
│  │API-1│  │API-2│  │API-3 │  ← NestJS containers            │
│  └──┬──┘  └──┬──┘  └──┬───┘                                │
│     │        │        │                                      │
│  ┌──▼────────▼────────▼──┐                                  │
│  │      Service Layer     │                                  │
│  │                        │                                  │
│  │  ┌─────┐ ┌─────┐ ┌──────────────┐                       │
│  │  │ PG  │ │Redis│ │Elasticsearch │                       │
│  │  │Primary│ │     │ │              │                       │
│  │  │  ↕  │ │     │ │              │                       │
│  │  │ PG  │ │     │ │              │                       │
│  │  │Replica│ │     │ │              │                       │
│  │  └─────┘ └─────┘ └──────────────┘                       │
│  │                                                          │
│  │  ┌────────────────┐  ┌──────────────┐                    │
│  │  │ Recommendation │  │   AWS S3      │                    │
│  │  │ (FastAPI)       │  │ (media files) │                    │
│  │  └────────────────┘  └──────────────┘                    │
│  └──────────────────────────────────────┘                    │
│                                                              │
│  ┌──────────────────────────────────────┐                    │
│  │         MONITORING & LOGGING         │                    │
│  │  Prometheus + Grafana + ELK Stack    │                    │
│  └──────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### 6.2. Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://api:4000/api/v1
    depends_on: [api]

  api:
    build: ./backend
    ports: ["4000:4000"]
    environment:
      - DATABASE_URL=postgresql://cinedb:password@postgres:5432/cinedb
      - REDIS_URL=redis://redis:6379
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - JWT_SECRET=${JWT_SECRET}
      - S3_BUCKET=${S3_BUCKET}
    depends_on: [postgres, redis, elasticsearch]

  recommendation:
    build: ./recommendation
    ports: ["5000:5000"]
    environment:
      - DATABASE_URL=postgresql://cinedb:password@postgres:5432/cinedb
    depends_on: [postgres]

  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      - POSTGRES_DB=cinedb
      - POSTGRES_USER=cinedb
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    ports: ["9200:9200"]
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - es_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  es_data:
```

### 6.3. CI/CD Pipeline

```
┌──────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│ Push │───▶│  Build   │───▶│   Test   │───▶│  Docker   │───▶│  Deploy  │
│ (Git)│    │  (npm)   │    │(Jest,E2E)│    │Build+Push │    │ (Server) │
└──────┘    └──────────┘    └──────────┘    └───────────┘    └──────────┘
                                │
                                ├── Unit tests (coverage ≥ 80%)
                                ├── Integration tests
                                ├── E2E tests (Playwright)
                                └── Security scan (OWASP ZAP)
```

### 6.4. Chiến lược Backup

| Đối tượng | Phương pháp | Tần suất | Lưu giữ |
|-----------|-------------|----------|---------|
| PostgreSQL | `pg_dump` full backup | Hàng ngày 2:00 AM | 30 ngày |
| PostgreSQL | WAL archiving | Liên tục | 7 ngày |
| Redis | RDB snapshot | Mỗi 6 giờ | 7 ngày |
| Elasticsearch | Snapshot API → S3 | Hàng ngày | 14 ngày |
| S3 (media) | Cross-region replication | Liên tục | Vĩnh viễn |

---

## 7. Monitoring & Observability

### 7.1. Metrics chính cần giám sát

| Metric | Ngưỡng cảnh báo | Công cụ |
|--------|-----------------|---------|
| API Response Time (P95) | > 500ms | Prometheus + Grafana |
| API Error Rate (5xx) | > 1% | Prometheus + Alertmanager |
| CPU Usage | > 80% sustained 5min | Node Exporter |
| Memory Usage | > 85% | Node Exporter |
| Database connections | > 80% pool | pg_stat_activity |
| Redis memory | > 80% maxmemory | Redis Exporter |
| Elasticsearch cluster health | Yellow/Red | ES Exporter |
| Disk usage | > 85% | Node Exporter |
| SSL certificate expiry | < 14 days | Blackbox Exporter |

### 7.2. Logging

```
Application Logs (JSON structured)
      │
      ▼
Filebeat (log shipper)
      │
      ▼
Logstash (parse, transform)
      │
      ▼
Elasticsearch (store, index)
      │
      ▼
Kibana (visualize, search, alert)
```

Mỗi log entry chứa: `timestamp`, `level`, `service`, `request_id`, `user_id`, `method`, `path`, `status_code`, `duration_ms`, `message`.

---

## 8. Quyết định kiến trúc (ADR)

### ADR-001: Chọn Modular Monolith thay vì Microservices

- **Bối cảnh:** Dự án là đồ án/MVP, team nhỏ, cần triển khai nhanh.
- **Quyết định:** Backend dùng Modular Monolith (NestJS modules), chỉ tách Recommendation thành microservice riêng vì dùng Python.
- **Hệ quả:** Đơn giản hóa deployment, dễ refactor; có thể tách module thành microservice sau khi scale.

### ADR-002: Chọn PostgreSQL thay vì MongoDB

- **Bối cảnh:** Dữ liệu phim có cấu trúc quan hệ rõ ràng (movie ↔ genre, movie ↔ person).
- **Quyết định:** PostgreSQL cho dữ liệu quan hệ, hỗ trợ JSONB cho dữ liệu linh hoạt.
- **Hệ quả:** ACID compliance, query phức tạp hiệu quả, full-text search tích hợp (bổ trợ Elasticsearch).

### ADR-003: Chọn Elasticsearch cho Search thay vì PostgreSQL full-text search

- **Bối cảnh:** Cần fuzzy search, autocomplete, faceted filtering hiệu năng cao.
- **Quyết định:** Elasticsearch cho search chính, PostgreSQL full-text search làm fallback.
- **Hệ quả:** Search chất lượng cao hơn, thêm complexity vận hành; fallback đảm bảo service availability.

### ADR-004: JWT stateless kết hợp Redis blacklist

- **Bối cảnh:** Cần stateless auth cho scaling, nhưng cũng cần revoke token khi logout.
- **Quyết định:** Short-lived access token (15 phút) + refresh token (7 ngày). Redis blacklist cho revoked tokens.
- **Hệ quả:** Scalable, token tự hết hạn nhanh nên blacklist nhỏ; cần Redis khả dụng cho logout feature.

---

## 9. Stack công nghệ tổng hợp

| Layer | Công nghệ | Phiên bản |
|-------|-----------|-----------|
| Frontend Framework | Next.js (React) | 14+ |
| Frontend Styling | Tailwind CSS | 3+ |
| Frontend State | Zustand | 4+ |
| Backend Framework | NestJS (Node.js) | 10+ |
| Backend Language | TypeScript | 5+ |
| Primary Database | PostgreSQL | 16+ |
| ORM | Prisma | 5+ |
| Cache | Redis | 7+ |
| Search Engine | Elasticsearch | 8+ |
| Recommendation | FastAPI (Python) | 0.100+ |
| ML Libraries | scikit-learn, TensorFlow | Latest |
| Authentication | Passport.js + JWT | Latest |
| Object Storage | AWS S3 | — |
| CDN | CloudFront / Cloudflare | — |
| Email | SendGrid / Amazon SES | — |
| Containerization | Docker + Docker Compose | 24+ |
| Reverse Proxy | Nginx | 1.25+ |
| CI/CD | GitHub Actions | — |
| Monitoring | Prometheus + Grafana | Latest |
| Logging | ELK Stack | 8+ |
| API Documentation | Swagger / OpenAPI 3.0 | — |

---

## 10. Tham chiếu

- SRS CineDB v1.0 — Tài liệu đặc tả yêu cầu phần mềm
- TheMovieDB API Documentation — https://developers.themoviedb.org/3
- NestJS Documentation — https://docs.nestjs.com
- Next.js Documentation — https://nextjs.org/docs
- Prisma Documentation — https://www.prisma.io/docs
- Elasticsearch Guide — https://www.elastic.co/guide
- OWASP Top 10 — https://owasp.org/www-project-top-ten/
