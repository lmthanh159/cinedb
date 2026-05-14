# Phase 3 — Tính năng Nâng cao

> **Thời gian:** 10 ngày  
> **Mục tiêu:** Admin dashboard, Recommendation, TMDB full import, Notifications  
> **Dependency:** Phase 1 + Phase 2 hoàn tất

---

## WP-3.1: Admin Dashboard

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 4 ngày |
| **Agent skill** | Next.js, React, Recharts, Data Tables, Forms |
| **Dependency** | Phase 1 (tất cả admin API endpoints) |

### Prompt cho Agent

```
Xây dựng Admin Dashboard cho CineDB (app/admin/).

[ATTACH: lib/api.ts (admin endpoints), types/, components/ui/, components/auth/ProtectedRoute.tsx]

## Yêu cầu chung

- Layout riêng: app/admin/layout.tsx
  - Sidebar trái (250px): logo, navigation links, collapse button
  - Content area bên phải
  - Header: breadcrumb, admin name, logout
  - Protected: chỉ role=ADMIN mới truy cập (redirect nếu không)

- Navigation links:
  📊 Dashboard
  🎬 Phim (Movies)
  📺 TV Series
  👤 Người (People)
  🏷️ Thể loại (Genres)
  👥 Người dùng (Users)
  💬 Bình luận (Comments)
  🚩 Báo cáo (Reports)
  🔄 TMDB Import

## Trang Dashboard (app/admin/page.tsx)

### Stats Cards (top row)
Fetch: GET /admin/stats → { totalMovies, totalTVSeries, totalUsers, totalRatings, totalComments, newUsersToday }
4 cards: Tổng phim, Tổng users, Tổng đánh giá, Tổng bình luận
Icon + số + so sánh % với tuần trước (nếu API hỗ trợ)

### Charts (dùng Recharts)
- Line chart: Số đánh giá mới mỗi ngày (30 ngày gần nhất)
- Bar chart: Top 10 phim được đánh giá nhiều nhất
- Pie chart: Phân bố thể loại (top 8 genres + Others)

## Trang Movies (app/admin/movies/page.tsx)

### Data Table
- Columns: ID, Poster (40x60), Title, Year, Genres, Rating, Popularity, TMDB ID, Actions
- Features:
  - Search: text input filter by title
  - Filter: dropdown by genre, status (active/deleted)
  - Sort: click column header
  - Pagination: 20 per page
  - Bulk select (checkbox) cho bulk delete

### CRUD
- Nút "Thêm phim" → modal/page form
- Edit icon → modal/page form (prefilled)
- Delete icon → confirm dialog → soft delete

### Movie Form (components/admin/MovieForm.tsx)
- Fields: title*, originalTitle, overview (textarea), releaseDate (date picker), runtime (number), language (select), budget, revenue, status (select)
- Genre select: multi-select checkboxes
- Country select: multi-select dropdown
- Company select: multi-select dropdown
- Poster upload: file input + preview (hoặc URL input)
- Backdrop URL input
- Cast management: search person → add với character name + order
- Trailer: add YouTube URL → extract key

## Trang Users (app/admin/users/page.tsx)

Table: ID, Avatar, Name, Email, Role, Status, Registered, Actions
Actions: Lock/Unlock toggle, Change Role (dropdown USER/ADMIN), View Profile
- Không cho phép lock chính mình
- Confirm dialog trước khi đổi role

## Trang Comments (app/admin/comments/page.tsx)

Table: ID, User, Movie/TV, Content (truncated), Status, Reports Count, Created, Actions
Filter: All / Reported (has reports) / Hidden
Actions: Approve (set ACTIVE), Hide (set HIDDEN), Delete (set DELETED)
- Click content → expand full text
- Click Reports Count → xem danh sách reports

## Trang Reports (app/admin/reports/page.tsx)

Table: ID, Reporter, Content (comment), Reason, Status, Created, Actions
Filter: Pending / Resolved / Dismissed
Actions: Dismiss (set DISMISSED), Hide Content (hide comment + resolve report), Lock User (lock reporter target + resolve)

## Trang TMDB Import (app/admin/tmdb/page.tsx)

- Search bar: tìm phim trên TMDB (GET /admin/tmdb/search/movie?query=...)
- Results: poster + title + year + overview + nút "Import"
- Import button → POST /admin/tmdb/import/movie/:tmdbId → toast success
- Section "Full Import": input pages count + nút trigger
- Section "Sync": nút "Sync Now" + bảng sync logs (GET /admin/tmdb/sync/logs)

## UI Components dùng chung

- DataTable: generic, sortable, filterable, paginated, selectable rows
- ConfirmDialog: "Bạn có chắc chắn?" + Cancel/Confirm buttons
- StatusBadge: green (Active), red (Locked/Deleted), amber (Pending)
- ActionMenu: dropdown (•••) → list actions

## Output
- app/admin/layout.tsx + tất cả pages
- components/admin/ (DataTable, MovieForm, ConfirmDialog, Sidebar, StatsCard, Charts)
```

---

## WP-3.2: Recommendation Service

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 4 ngày |
| **Agent skill** | Python, FastAPI, scikit-learn, pandas, PostgreSQL, Machine Learning |
| **Dependency** | WP-0.4 (seed data), WP-1.5 (ratings data) |

### Prompt cho Agent

```
Bạn là ML engineer. Xây dựng Recommendation Service cho CineDB bằng Python FastAPI.

## Context

- Database PostgreSQL có ~500+ movies, ~200+ people, ratings từ users
- Service chạy riêng (port 5000), giao tiếp với NestJS backend qua HTTP
- Cần 2 thuật toán: Content-Based Filtering + Collaborative Filtering → Hybrid

## Cấu trúc dự án

recommendation/
├── app/
│   ├── main.py                    # FastAPI app
│   ├── config.py                  # Settings (DATABASE_URL, etc.)
│   ├── database.py                # SQLAlchemy connection (read-only)
│   ├── models.py                  # SQLAlchemy models (mirror Prisma schema, read-only)
│   ├── recommender/
│   │   ├── __init__.py
│   │   ├── content_based.py       # Content-Based Filtering
│   │   ├── collaborative.py       # Collaborative Filtering
│   │   ├── hybrid.py              # Hybrid combiner
│   │   ├── data_loader.py         # Load data from DB into DataFrames
│   │   └── trainer.py             # Train/retrain models
│   ├── routes/
│   │   ├── recommend.py           # API routes
│   │   └── health.py
│   └── utils.py
├── models/                        # Saved model artifacts (.pkl)
├── requirements.txt
├── Dockerfile
└── scripts/
    └── train.py                   # CLI script to train models

## 1. Data Loader (app/recommender/data_loader.py)

```python
# Load từ PostgreSQL vào pandas DataFrames:
# - movies_df: id, title, genre_ids (list), director_id, cast_ids (list top 5), popularity, vote_average
# - ratings_df: user_id, movie_id, score
# - genres_df: id, name
```

## 2. Content-Based Filtering (app/recommender/content_based.py)

```python
class ContentBasedRecommender:
    def __init__(self):
        self.similarity_matrix = None  # cosine similarity matrix
        self.movie_indices = {}        # movie_id → matrix index

    def train(self, movies_df):
        """
        Feature vector cho mỗi phim:
        - Genre: one-hot encoding (20 genres)
        - Director: one-hot encoding (top 100 directors)
        - Cast: multi-hot encoding (top 200 actors)
        - Popularity: normalized 0-1
        - Vote: normalized 0-1

        Tính cosine similarity matrix (scipy sparse nếu lớn)
        Lưu vào self.similarity_matrix
        """

    def get_similar(self, movie_id: int, limit: int = 12, exclude_ids: list = []) -> list[dict]:
        """
        Trả về top N phim tương tự:
        [{ movie_id: int, score: float }]
        """

    def save(self, path: str): # pickle dump
    def load(self, path: str): # pickle load
```

## 3. Collaborative Filtering (app/recommender/collaborative.py)

```python
class CollaborativeRecommender:
    def __init__(self):
        self.model = None  # TruncatedSVD or NMF
        self.user_factors = None
        self.item_factors = None

    def train(self, ratings_df):
        """
        1. Tạo user-item matrix (scipy sparse, users x movies, values = scores)
        2. TruncatedSVD(n_components=50)
        3. Lưu user_factors, item_factors
        """

    def predict(self, user_id: str, limit: int = 20, exclude_ids: list = []) -> list[dict]:
        """
        Predict scores cho tất cả movies user chưa rate
        Trả về top N: [{ movie_id: int, predicted_score: float }]
        """

    def save(self, path: str):
    def load(self, path: str):
```

## 4. Hybrid Recommender (app/recommender/hybrid.py)

```python
class HybridRecommender:
    def __init__(self, content_based, collaborative):
        self.cb = content_based
        self.cf = collaborative
        self.alpha = 0.4  # weight cho content-based

    def recommend_similar(self, movie_id: int, limit: int = 12) -> list:
        # Chỉ dùng content-based
        return self.cb.get_similar(movie_id, limit)

    def recommend_personalized(self, user_id: str, limit: int = 20, user_ratings: list = []) -> list:
        # Nếu user có < 5 ratings → fallback content-based (dựa trên phim đã rate cao nhất)
        if len(user_ratings) < 5:
            top_rated_movie = max(user_ratings, key=lambda x: x['score'])['movie_id']
            return self.cb.get_similar(top_rated_movie, limit)

        # Hybrid: combine scores
        cb_scores = {}  # from content-based (dựa trên top 3 phim user rate cao nhất)
        cf_scores = self.cf.predict(user_id, limit * 2)

        # Weighted combination
        combined = {}
        for item in cf_scores:
            combined[item['movie_id']] = (1 - self.alpha) * item['predicted_score']
        for movie_id, score in cb_scores.items():
            combined[movie_id] = combined.get(movie_id, 0) + self.alpha * score

        # Sort and return top N
        sorted_items = sorted(combined.items(), key=lambda x: x[1], reverse=True)
        return [{'movie_id': mid, 'score': s} for mid, s in sorted_items[:limit]]
```

## 5. Trainer (app/recommender/trainer.py)

```python
def train_all():
    loader = DataLoader()
    movies_df = loader.load_movies()
    ratings_df = loader.load_ratings()

    cb = ContentBasedRecommender()
    cb.train(movies_df)
    cb.save('models/content_based.pkl')

    cf = CollaborativeRecommender()
    cf.train(ratings_df)
    cf.save('models/collaborative.pkl')

    print(f"Training complete. Movies: {len(movies_df)}, Ratings: {len(ratings_df)}")
```

## 6. API Routes (app/routes/recommend.py)

```
GET /recommend/similar/{movie_id}?limit=12
  → Load models, call hybrid.recommend_similar()
  → Return: { results: [{ movie_id, score }] }

GET /recommend/personalized/{user_id}?limit=20
  → Load models, fetch user ratings from DB
  → Call hybrid.recommend_personalized()
  → Return: { results: [{ movie_id, score }] }

POST /recommend/retrain
  → Run trainer.train_all() (background task)
  → Return: { status: "training_started" }

GET /health
  → Check DB connection + model files exist
  → Return: { status: "ok", models_loaded: true, last_trained: "..." }
```

## 7. NestJS Integration

Sau khi recommendation service sẵn sàng, sửa trong NestJS backend:

src/recommendation/recommendation.service.ts:
- getSimilar(movieId): gọi HTTP GET recommendation-service:5000/recommend/similar/{movieId}
- getPersonalized(userId): gọi HTTP GET .../recommend/personalized/{userId}
- Circuit breaker: nếu service timeout (3s) hoặc down → fallback:
  - Similar: query movies cùng genre (Prisma query)
  - Personalized: return trending movies

## Output

- Tất cả Python files trong recommendation/
- Models trained và saved (models/*.pkl)
- NestJS recommendation module tích hợp
- Fallback hoạt động khi service down
```

---

## WP-2.6: Admin TMDB Import UI

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 1 ngày |
| **Agent skill** | Next.js, React |
| **Dependency** | WP-3.1 (Admin layout), WP-1.10 (TMDB admin API) |

### Prompt cho Agent

```
Thêm trang TMDB Import vào Admin Dashboard.

[ATTACH: app/admin/layout.tsx, components/admin/, lib/api.ts]

Trang app/admin/tmdb/page.tsx:

1. Search Section: input + button "Tìm trên TMDB", results grid (poster + title + year + overview + nút Import)
2. Quick Import: input TMDB ID + button "Import"
3. Full Import: input số pages (default 100) + button "Bắt đầu import" + progress indicator
4. Daily Sync: button "Sync ngay" + last sync time
5. Sync Logs: data table (type, entity, processed, created, updated, errors, status, started_at)
```

---

## WP-3.3: Notifications (Tùy chọn)

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | NestJS, Next.js, WebSocket (tùy chọn) |
| **Dependency** | Phase 2 hoàn tất |

### Prompt cho Agent

```
Xây dựng hệ thống Notification in-app cho CineDB.

## Backend

Bảng Notification (thêm vào Prisma schema):
- id, userId, type (NEW_MOVIE, COMMENT_REPLY, RATING_RESPONSE, ADMIN_ACTION), title, content, link, read (boolean), createdAt

Endpoints:
GET    /api/v1/notifications          — Danh sách (paginated, unread first)
GET    /api/v1/notifications/unread-count — Số chưa đọc
PATCH  /api/v1/notifications/:id/read — Đánh dấu đã đọc
PATCH  /api/v1/notifications/read-all — Đánh dấu tất cả đã đọc

Triggers (trong các services khác):
- Admin thêm phim thuộc genre user follow → notify
- Có reply comment trên phim user đã comment → notify
- Admin moderate comment của user → notify

## Frontend

Header: bell icon + badge (unread count)
Click bell → dropdown danh sách notifications (max 10, "Xem tất cả" link)
Click notification → mark read + navigate to link
Trang /notifications: full list, paginated
```

---

## Checkpoint Pha 3

```
╔══════════════════════════════════════════════════════╗
║  CHECKPOINT PHA 3                                    ║
║                                                      ║
║  ✅ Admin: dashboard stats, CRUD movies/users/comments║
║  ✅ Admin: TMDB search + import hoạt động            ║
║  ✅ Recommendation: similar movies hợp lý            ║
║  ✅ Recommendation: personalized (≥5 ratings)        ║
║  ✅ Fallback khi recommendation service down         ║
║  ✅ Database: ≥ 5000 phim (full import done)         ║
║  ✅ Daily sync cron configured                       ║
║                                                      ║
║  → Tag v0.4.0                                        ║
╚══════════════════════════════════════════════════════╝
```

---

---

# Phase 4 — Production Readiness

> **Thời gian:** 8 ngày  
> **Mục tiêu:** Hệ thống an toàn, ổn định, có thể monitor, triển khai production  
> **Dependency:** Phase 3 hoàn tất

---

## WP-4.1: CI/CD Pipeline

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | GitHub Actions, Docker, Linux, CI/CD |
| **Dependency** | Phase 2 hoàn tất |

### Prompt cho Agent

```
Tạo CI/CD pipeline bằng GitHub Actions cho CineDB monorepo.

## File 1: .github/workflows/ci.yml

Trigger: push to develop, PR to develop/main

Jobs:

### lint-and-build
- Checkout code
- Setup Node.js 20
- Install dependencies (npm ci) cho backend + frontend
- Run lint: cd backend && npm run lint; cd frontend && npm run lint
- Run build: cd backend && npm run build; cd frontend && npm run build

### test-backend
- Checkout + setup Node.js
- Start services: postgres + redis (GitHub Actions services)
- Run migrations: cd backend && npx prisma migrate deploy
- Run seed: cd backend && npx prisma db seed
- Run tests: cd backend && npm run test -- --coverage --ci
- Upload coverage report artifact

### test-frontend
- Checkout + setup Node.js
- Run tests: cd frontend && npm run test -- --ci (nếu có)

### security
- npm audit --audit-level high (backend + frontend)
- Fail nếu có critical vulnerabilities

## File 2: .github/workflows/deploy.yml

Trigger: push tag v* to main

Jobs:

### build-and-push
- Build Docker images: cinedb-backend, cinedb-frontend, cinedb-recommendation
- Push to GitHub Container Registry (ghcr.io)
- Tag with version + latest

### deploy
- SSH to production server
- Pull latest images
- docker compose -f docker-compose.prod.yml pull
- docker compose -f docker-compose.prod.yml up -d
- Health check: curl http://localhost:4000/health (retry 5 times)
- If health check fails: rollback to previous images

## File 3: docker-compose.prod.yml

Production compose file:
- Tất cả services (postgres, redis, ES, backend, frontend, recommendation, nginx)
- Environment variables từ .env.production
- Restart policies: unless-stopped
- Logging: json-file with max-size 10m, max-file 3
- Resource limits cho ES (mem_limit: 2g)

## File 4: docker/nginx/nginx.conf

Nginx reverse proxy:
- server cinedb.example.com → proxy_pass frontend:3000
- server api.cinedb.example.com → proxy_pass backend:4000
- SSL (placeholder, actual cert via certbot)
- Gzip compression
- Security headers (X-Frame-Options, X-Content-Type-Options, HSTS)
- Rate limiting zone

## File 5: Dockerfiles (production)

### docker/Dockerfile.backend
Multi-stage build:
- Stage 1: install + build
- Stage 2: copy dist + node_modules (production only) + prisma
- CMD: node dist/main.js

### docker/Dockerfile.frontend
Multi-stage build:
- Stage 1: npm run build (standalone output)
- Stage 2: copy .next/standalone + static + public
- CMD: node server.js

## Output
- Tất cả workflow files, Dockerfiles, nginx config, docker-compose.prod.yml
```

---

## WP-4.2: Monitoring & Logging

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | Prometheus, Grafana, Winston, Docker |
| **Dependency** | Phase 3 |

### Prompt cho Agent

```
Thêm monitoring và structured logging cho CineDB.

## 1. Structured Logging (Backend)

Cài winston. Tạo src/common/logger/logger.service.ts:
- Format: JSON { timestamp, level, service, requestId, userId, method, path, statusCode, duration, message }
- Transport: console (dev) + file (production: logs/app.log, rotate daily, keep 30 days)
- NestJS Logger override: replace default logger với WinstonLogger

Tạo src/common/interceptors/request-logging.interceptor.ts:
- Log mỗi request: method, url, user, duration, status
- Generate requestId (UUID) cho mỗi request, attach to response header X-Request-ID

## 2. Health Check Endpoints

Tạo src/health/health.controller.ts:
- GET /health → { status: "ok", uptime, timestamp }
- GET /health/db → test prisma.$queryRaw('SELECT 1')
- GET /health/redis → test redis.ping()
- GET /health/es → test elasticsearch.cluster.health()

## 3. Prometheus Metrics (tùy chọn)

Cài prom-client. Tạo src/common/metrics/:
- Export /metrics endpoint
- Metrics: http_request_duration_seconds (histogram), http_requests_total (counter), active_connections (gauge)

## 4. Docker Compose additions

Thêm vào docker-compose.prod.yml:
- Prometheus: scrape backend:4000/metrics mỗi 15s
- Grafana: port 3001, provisioned dashboards (API performance, error rate)
- Loki (lightweight log aggregator) + Promtail (log shipper) — thay ELK cho đơn giản

## Output
- Logger service + request interceptor
- Health check endpoints
- Prometheus metrics (optional)
- Docker services cho monitoring stack
- Grafana dashboard JSON files
```

---

## WP-4.3: Security Hardening

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | Web Security, NestJS, OWASP |
| **Dependency** | Phase 3 |

### Prompt cho Agent

```
Thực hiện security audit và hardening cho CineDB.

## Checklist cần implement/verify

### HTTP Security (src/main.ts)
1. Helmet.js đã enabled (verify config):
   - contentSecurityPolicy: script-src 'self' 'unsafe-inline' (cho Next.js); img-src 'self' image.tmdb.org
   - hsts: maxAge 31536000, includeSubDomains
   - frameguard: deny
2. CORS: chỉ whitelist FRONTEND_URL (không dùng origin: true trong production)
3. Compression enabled
4. Body parser limit: 10mb (prevent large payload DoS)

### Input Validation
5. Global ValidationPipe: whitelist: true (strip unknown fields), forbidNonWhitelisted: true
6. Verify tất cả DTOs có class-validator decorators
7. Comment content: sanitize-html (strip tất cả HTML tags trước khi save)
8. File upload (nếu có): validate mimetype + size (max 5MB images)

### Authentication Security
9. JWT secrets ≥ 32 characters (verify .env)
10. Bcrypt salt rounds ≥ 10
11. Account lockout: 5 attempts / 30 min (verify)
12. Refresh token rotation: khi dùng refresh token, xóa cũ + tạo mới
13. Token blacklist TTL = remaining token expiry (verify)

### Rate Limiting
14. Global: 100 req/min per IP
15. Auth endpoints: 30 req/min (login), 10 req/min (register)
16. Verify ThrottlerGuard applied

### Data Protection
17. Không log passwords, tokens, hoặc PII
18. Database: password column KHÔNG EVER xuất hiện trong API response (verify select/exclude trong Prisma queries)
19. Error responses: không leak stack traces trong production (verify exception filter)

### Dependency Security
20. npm audit --production: 0 critical, 0 high
21. Update vulnerable packages
22. Lock versions (package-lock.json committed)

### Production Config
23. Swagger UI disabled khi NODE_ENV=production
24. Debug mode off
25. Verbose error messages off

## Output
- Sửa code theo checklist
- File SECURITY_AUDIT.md: checklist đánh dấu ✅ mỗi mục
- Danh sách vulnerabilities found + fixed
```

---

## WP-4.4: SEO & Performance

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | Next.js, SEO, Web Performance, Lighthouse |
| **Dependency** | Phase 3 |

### Prompt cho Agent

```
Tối ưu SEO và Performance cho CineDB frontend.

## SEO

### 1. Metadata cho mỗi trang

Verify/add generateMetadata() cho:
- Trang chủ: title "CineDB — Khám phá thế giới điện ảnh", description, og:image
- Chi tiết phim: title "{movieTitle} ({year}) — CineDB", description=overview (truncated 160 chars), og:image=posterUrl, og:type="video.movie"
- Chi tiết TV: tương tự
- Chi tiết Person: title "{name} — CineDB", og:image=profileUrl
- Search: title "Tìm kiếm: {query} — CineDB" (noindex)
- Discover: title "Khám phá phim {genre} — CineDB"

### 2. Structured Data (JSON-LD)

Thêm JSON-LD vào <head> cho:
- Trang chủ: WebSite schema (name, url, potentialAction: SearchAction)
- Chi tiết phim: Movie schema (name, datePublished, director, actor[], aggregateRating, image, description)
- Chi tiết Person: Person schema (name, image, birthDate, description)

### 3. Sitemap & Robots

app/sitemap.ts:
- Generate dynamic sitemap từ database (top 10000 movies, all genres, top 1000 TV, top 500 people)
- Format: [{ url, lastModified, changeFrequency, priority }]

app/robots.ts:
- Allow: /
- Disallow: /admin, /profile, /api
- Sitemap: https://cinedb.example.com/sitemap.xml

### 4. Canonical URLs
Thêm <link rel="canonical"> cho mọi trang public.

### 5. Alt text
Verify tất cả next/image có alt text meaningful (movie title, person name).

## Performance

### 6. Image Optimization
- Tất cả ảnh phim dùng next/image với sizes prop phù hợp
- Poster: sizes="(max-width: 768px) 50vw, 200px"
- Backdrop: sizes="100vw", priority cho hero images
- Lazy loading cho ảnh below the fold (default behavior)
- Placeholder: blur (generate blurDataURL hoặc dùng color placeholder)

### 7. Code Splitting
- Dynamic import cho: TrailerModal, Gallery/Lightbox, Recharts (admin), RatingModal
- Dùng next/dynamic với { loading: () => <Skeleton /> }

### 8. Prefetching
- next/link prefetch cho movie cards (default on)
- Prefetch on hover cho search results

### 9. API Optimization
- Response compression (verify Nginx gzip)
- Backend: select chỉ fields cần thiết trong Prisma queries (không select * )
- Pagination limit max 50

### 10. Lighthouse Audit

Chạy Lighthouse cho 3 trang chính, target:
- Performance: ≥ 80
- Accessibility: ≥ 90
- Best Practices: ≥ 90
- SEO: ≥ 95

Fix tất cả issues cho đến khi đạt target.

## Output
- Updated metadata cho mỗi page
- JSON-LD components
- app/sitemap.ts, app/robots.ts
- Dynamic imports added
- Lighthouse report screenshots
- PERFORMANCE_REPORT.md: scores trước/sau optimization
```

---

## Checkpoint Phase 4

```
╔══════════════════════════════════════════════════════╗
║  CHECKPOINT PHA 4                                    ║
║                                                      ║
║  CI/CD:                                              ║
║  ✅ Push → auto lint + test + build trong GitHub     ║
║  ✅ Tag → auto build Docker + deploy                 ║
║  ✅ Health check + rollback hoạt động                ║
║                                                      ║
║  Monitoring:                                         ║
║  ✅ Structured JSON logs                             ║
║  ✅ Health endpoints: /health, /health/db, etc.      ║
║  ✅ Grafana dashboard accessible (nếu setup)         ║
║                                                      ║
║  Security:                                           ║
║  ✅ Security audit checklist 100%                    ║
║  ✅ npm audit: 0 critical/high                       ║
║  ✅ Swagger disabled in production                   ║
║  ✅ Rate limiting verified                           ║
║                                                      ║
║  Performance:                                        ║
║  ✅ Lighthouse Performance ≥ 80                      ║
║  ✅ Lighthouse SEO ≥ 95                              ║
║  ✅ Sitemap + robots.txt accessible                  ║
║  ✅ JSON-LD structured data                          ║
║                                                      ║
║  → Tag v1.0.0-rc1, sẵn sàng Go-live                 ║
╚══════════════════════════════════════════════════════╝
```
