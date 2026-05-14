# Phase 0 — Khởi tạo Hạ tầng

> **Thời gian:** 3 ngày  
> **Mục tiêu:** Dự án chạy được trên local, database có schema và dữ liệu thực từ TMDB.  
> **Dependency:** Không (phase đầu tiên)

---

## WP-0.1: TMDB API Key & Biến môi trường

### Thông tin

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 30 phút |
| **Thực hiện** | Thủ công (không cần agent) |
| **Output** | File `.env` với TMDB_API_KEY hợp lệ |

### Hướng dẫn

1. Truy cập https://www.themoviedb.org/signup → tạo tài khoản
2. Settings → API → Request API Key → chọn Developer
3. Điền thông tin (App name: CineDB, URL: localhost, Purpose: Educational)
4. Nhận API Key v3
5. Kiểm tra:
```bash
curl "https://api.themoviedb.org/3/movie/550?api_key=YOUR_KEY"
# Phải trả về JSON thông tin phim Fight Club
```
6. Lưu key — sẽ dùng cho `.env` ở WP-0.2

---

## WP-0.2: Khởi tạo Repository & Docker

### Thông tin

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 1 ngày |
| **Agent skill** | DevOps, NestJS, Next.js, Docker, Python |
| **Input** | TMDB API Key từ WP-0.1 |
| **Output** | Monorepo chạy được với Docker |

### Prompt cho Agent

```
Bạn là một senior full-stack engineer. Hãy khởi tạo monorepo cho dự án CineDB — một website cơ sở dữ liệu phim trực tuyến tương tự TheMovieDB.

## Yêu cầu cấu trúc thư mục

cinedb/
├── backend/                 # NestJS API server
├── frontend/                # Next.js 16 web app
├── recommendation/          # Python FastAPI microservice
├── docker/
│   └── docker-compose.yml   # Development services
├── .env.example
├── .gitignore
└── README.md

## 1. Backend (NestJS)

Khởi tạo NestJS project với TypeScript strict mode:

```bash
nest new backend --package-manager npm --strict
```

Cài đặt các dependencies:
- Core: @nestjs/config, @nestjs/swagger, @nestjs/schedule, @nestjs/throttler
- Auth: @nestjs/jwt, @nestjs/passport, passport, passport-jwt, passport-google-oauth20, bcrypt
- Database: prisma, @prisma/client
- Cache: @nestjs/cache-manager, cache-manager, cache-manager-redis-yet, redis
- Validation: class-validator, class-transformer
- Security: helmet, compression
- Search: @elastic/elasticsearch
- HTTP: axios
- Rate limit: bottleneck
- Dev: @types/bcrypt, @types/passport-jwt, @types/passport-google-oauth20

Cấu hình trong src/main.ts:
- Swagger UI tại /api/docs
- Global ValidationPipe với transform: true, whitelist: true
- Helmet middleware
- Compression
- CORS cho FRONTEND_URL từ env
- Listen port từ env (default 4000)

Cấu hình trong src/app.module.ts:
- ConfigModule.forRoot({ isGlobal: true })
- ThrottlerModule.forRoot({ ttl: 60000, limit: 100 })
- Import các module placeholder (sẽ implement sau)

Tạo src/common/ với:
- filters/http-exception.filter.ts — Global exception filter, trả JSON format { statusCode, message, error, timestamp, path }
- interceptors/transform.interceptor.ts — Wrap response thành { data, meta? }
- interceptors/logging.interceptor.ts — Log method, url, duration
- decorators/roles.decorator.ts — @Roles('ADMIN', 'USER')
- guards/jwt-auth.guard.ts — Placeholder (sẽ implement đầy đủ ở WP-1.1)
- guards/roles.guard.ts — Placeholder

## 2. Frontend (Next.js 16)

Khởi tạo Next.js 16 project:

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Cài đặt thêm:
- State: zustand
- HTTP: axios
- Icons: lucide-react
- Date: date-fns
- UI (optional): clsx, tailwind-merge

Cấu hình:
- next.config.ts: images.remotePatterns cho image.tmdb.org và placehold.co
- tailwind.config.ts: dark mode "class", extend colors với brand colors
- Tạo lib/api.ts: axios instance với baseURL = process.env.NEXT_PUBLIC_API_URL, interceptor cho auth token
- Tạo lib/utils.ts: cn() function (clsx + tailwind-merge)
- Tạo store/auth-store.ts: Zustand store placeholder { user, token, isAuthenticated, login, logout }
- Tạo types/index.ts: TypeScript interfaces placeholder cho Movie, TVSeries, Person, User, Genre, Rating, Comment

Tạo app/layout.tsx cơ bản với:
- Font: Inter (from next/font/google)
- ThemeProvider (dark/light mode) — dùng next-themes hoặc tự viết bằng context
- Metadata: title "CineDB", description

Tạo app/page.tsx placeholder:
- Hiển thị "CineDB — Coming Soon" với styling cơ bản
- Link đến /api/docs (backend Swagger)

## 3. Recommendation (Python FastAPI)

Tạo cấu trúc:
```
recommendation/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app
│   ├── config.py        # Settings from env
│   └── recommender/
│       ├── __init__.py
│       ├── content_based.py   # Placeholder
│       └── collaborative.py   # Placeholder
├── requirements.txt
├── Dockerfile
└── .env.example
```

requirements.txt:
```
fastapi==0.115.0
uvicorn[standard]==0.32.0
scikit-learn==1.8.0
pandas==3.0.0
numpy==2.4.0
scipy==1.17.1
psycopg2-binary==2.9.10
sqlalchemy==2.0.36
python-dotenv==1.0.1
```

app/main.py:
- GET /health → { status: "ok" }
- GET /recommend/similar/{movie_id} → placeholder trả []
- GET /recommend/personalized/{user_id} → placeholder trả []
- CORS middleware cho frontend URL

Dockerfile:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000"]
```

## 4. Docker Compose

File docker/docker-compose.yml:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: cinedb
      POSTGRES_USER: cinedb
      POSTGRES_PASSWORD: cinedb_dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cinedb"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    ports: ["9200:9200"]
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    volumes:
      - es_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  postgres_data:
  es_data:
```

## 5. File .env.example

Tạo .env.example ở root với TẤT CẢ biến môi trường sau:

```env
# App
NODE_ENV=development
APP_PORT=4000
APP_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://cinedb:cinedb_dev_password@localhost:5432/cinedb

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# JWT
JWT_ACCESS_SECRET=cinedb-access-secret-change-in-production-min-32-chars
JWT_REFRESH_SECRET=cinedb-refresh-secret-change-in-production-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# OAuth (để trống cho dev, fill khi cần)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback

# TMDB
TMDB_API_KEY=your-tmdb-api-key-here
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/
TMDB_RATE_LIMIT=4
TMDB_DEFAULT_LANGUAGE=vi-VN
TMDB_FALLBACK_LANGUAGE=en-US

# Storage (để trống cho dev)
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=

# Email (để trống cho dev)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@cinedb.local
```

Tạo thêm file .env (copy từ .env.example, fill TMDB_API_KEY thật).
Tạo frontend/.env.local:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## 6. .gitignore

```
node_modules/
.env
.env.local
.next/
dist/
build/
*.pyc
__pycache__/
.venv/
*.pkl
postgres_data/
es_data/
.DS_Store
```

## 7. README.md

Viết README hướng dẫn setup cho developer mới:
- Prerequisites (Node.js 20+, Docker, Python 3.12+)
- Quick start (docker compose up, npm install, npm run start:dev)
- Cấu trúc project
- Các scripts có sẵn
- Link đến tài liệu

## Yêu cầu kỹ thuật bổ sung

- TypeScript strict: true trong cả backend và frontend
- ESLint + Prettier đã cấu hình
- Tất cả package.json có script: dev, build, start, lint, test
- Backend: script "prisma:migrate", "prisma:generate", "prisma:studio", "prisma:seed"
- tsconfig paths alias: @/* cho cả 2 project

## Output mong đợi

Liệt kê TẤT CẢ file đã tạo. Đảm bảo:
1. `cd docker && docker compose up -d` → 3 services healthy
2. `cd backend && npm install && npm run start:dev` → Swagger UI tại http://localhost:4000/api/docs
3. `cd frontend && npm install && npm run dev` → Trang "CineDB — Coming Soon" tại http://localhost:3000
4. `cd recommendation && pip install -r requirements.txt && uvicorn app.main:app --port 5000` → GET /health trả OK
```

### Tiêu chí hoàn thành

- [ ] `docker compose up -d` → postgres, redis, elasticsearch healthy
- [ ] Backend Swagger UI accessible tại `/api/docs`
- [ ] Frontend hiển thị placeholder page
- [ ] Recommendation /health trả 200
- [ ] `.env.example` đầy đủ
- [ ] README.md có hướng dẫn setup
- [ ] Git init, .gitignore configured
- [ ] `npm run build` pass cho cả backend và frontend
- [ ] `npm run lint` không error

### Lỗi thường gặp

- Elasticsearch cần 1-2 phút để start, đừng panic nếu health check fail ban đầu
- Elasticsearch cần ít nhất 2GB RAM — nếu máy yếu, set `ES_JAVA_OPTS=-Xms256m -Xmx256m`
- Port conflict: kiểm tra 3000, 4000, 5000, 5432, 6379, 9200 chưa bị chiếm
- Next.js 16 cần Node.js >= 20

---

## WP-0.3: Database Schema (Prisma)

### Thông tin

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 1 ngày |
| **Agent skill** | Prisma, PostgreSQL, Database Design |
| **Input** | Backend project từ WP-0.2 |
| **Output** | prisma/schema.prisma hoàn chỉnh + migration thành công |
| **Dependency** | WP-0.2 |

### Prompt cho Agent

```
Bạn là một database architect. Dự án CineDB (NestJS + Prisma + PostgreSQL) cần database schema hoàn chỉnh.

## Context

Đây là hệ thống website cơ sở dữ liệu phim tương tự TheMovieDB. Dữ liệu phim sẽ được import từ TMDB API, nên mỗi entity cần có field tmdb_id để mapping.

Backend đã khởi tạo, Prisma đã cài. Bạn cần viết file prisma/schema.prisma.

## Yêu cầu Schema

### Enums

```prisma
enum UserRole {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  LOCKED
  UNVERIFIED
}

enum CommentStatus {
  ACTIVE
  HIDDEN
  DELETED
}

enum ReportStatus {
  PENDING
  RESOLVED
  DISMISSED
}

enum MediaType {
  MOVIE
  TV
}

enum GenderType {
  UNKNOWN
  FEMALE
  MALE
  NON_BINARY
}
```

### Models (viết đầy đủ với relations, indexes, constraints)

**1. User**
- id: UUID, auto-generate (dùng @default(uuid()))
- email: String, unique, max 255
- passwordHash: String? (nullable vì OAuth users không có password)
- displayName: String, max 100
- avatarUrl: String?
- bio: String? (text dài)
- role: UserRole, default USER
- status: UserStatus, default UNVERIFIED
- emailVerified: Boolean, default false
- oauthProvider: String? (google, facebook)
- oauthId: String?
- language: String, default "vi"
- loginAttempts: Int, default 0
- lockedUntil: DateTime?
- createdAt: DateTime, default now()
- updatedAt: DateTime, @updatedAt
- Relations: ratings[], comments[], watchlistItems[], favoriteItems[], reports[], activityLogs[]
- Index: email (unique), oauthProvider + oauthId (unique compound, optional)

**2. Movie**
- id: Int, auto-increment
- tmdbId: Int?, unique
- title: String, max 500
- originalTitle: String?
- overview: String? (text)
- releaseDate: DateTime?
- runtime: Int? (phút)
- language: String?, max 10
- budget: BigInt?, default 0
- revenue: BigInt?, default 0
- status: String?, max 50 (Released, Post Production, etc.)
- voteAverage: Float, default 0 (điểm CineDB users)
- voteCount: Int, default 0
- tmdbVoteAverage: Float, default 0 (điểm từ TMDB)
- tmdbVoteCount: Int, default 0
- popularity: Float, default 0
- posterUrl: String?
- backdropUrl: String?
- isDeleted: Boolean, default false (soft delete)
- isAdminEdited: Boolean, default false
- adminEditedFields: Json? (array of field names)
- tmdbLastSynced: DateTime?
- createdAt, updatedAt
- Relations: genres[] (N-N), cast[] (MovieCast), crew[] (MovieCrew), countries[] (N-N), companies[] (N-N), ratings[], comments[], watchlistItems[], favoriteItems[], trailers[], images[]
- Index: tmdbId (unique), releaseDate DESC, popularity DESC, voteAverage DESC, isDeleted (partial where false), title (full-text gin index — thêm bằng raw SQL trong migration)

**3. TVSeries**
- id: Int, auto-increment
- tmdbId: Int?, unique
- title, originalTitle, overview (tương tự Movie)
- firstAirDate: DateTime?
- lastAirDate: DateTime?
- status: String? (Returning Series, Ended, Canceled)
- numberOfSeasons: Int, default 0
- numberOfEpisodes: Int, default 0
- voteAverage, voteCount, tmdbVoteAverage, tmdbVoteCount, popularity (tương tự Movie)
- posterUrl, backdropUrl
- isDeleted, isAdminEdited, adminEditedFields, tmdbLastSynced
- createdAt, updatedAt
- Relations: seasons[], genres[] (N-N), cast[] (SeriesCast), crew[] (SeriesCrew), countries[], companies[], ratings[], comments[], watchlistItems[], favoriteItems[], trailers[], images[]

**4. Season**
- id: Int, auto-increment
- seriesId: Int (FK → TVSeries)
- tmdbId: Int?
- seasonNumber: Int
- name: String?
- overview: String?
- airDate: DateTime?
- posterUrl: String?
- episodeCount: Int, default 0
- createdAt, updatedAt
- Relations: series (TVSeries), episodes[]
- Unique compound: seriesId + seasonNumber

**5. Episode**
- id: Int, auto-increment
- seasonId: Int (FK → Season)
- tmdbId: Int?
- episodeNumber: Int
- name: String?
- overview: String?
- airDate: DateTime?
- runtime: Int?
- stillUrl: String?
- voteAverage: Float, default 0
- voteCount: Int, default 0
- createdAt, updatedAt
- Unique compound: seasonId + episodeNumber

**6. Person**
- id: Int, auto-increment
- tmdbId: Int?, unique
- name: String, max 300
- originalName: String?
- biography: String? (text)
- birthday: DateTime?
- deathday: DateTime?
- placeOfBirth: String?
- gender: GenderType, default UNKNOWN
- profileUrl: String?
- popularity: Float, default 0
- knownForDepartment: String? (Acting, Directing, etc.)
- tmdbLastSynced: DateTime?
- createdAt, updatedAt
- Relations: movieCast[], movieCrew[], seriesCast[], seriesCrew[], images[]

**7. Genre**
- id: Int, auto-increment
- tmdbId: Int?, unique
- name: String, max 100
- slug: String, unique
- createdAt, updatedAt
- Relations: movies[] (N-N), tvSeries[] (N-N)

**8. Rating**
- id: Int, auto-increment
- userId: UUID (FK → User)
- movieId: Int? (FK → Movie, nullable)
- seriesId: Int? (FK → TVSeries, nullable)
- score: Int (1-10, validate ở application layer)
- createdAt, updatedAt
- Unique compound: userId + movieId (khi movieId != null)
- Unique compound: userId + seriesId (khi seriesId != null)
- Index: movieId, seriesId, userId

**9. Comment**
- id: Int, auto-increment
- userId: UUID (FK)
- movieId: Int? (FK, nullable)
- seriesId: Int? (FK, nullable)
- content: String (text, max 5000)
- status: CommentStatus, default ACTIVE
- createdAt, updatedAt
- Index: movieId + createdAt DESC, seriesId + createdAt DESC

**10. WatchlistItem**
- id: Int, auto-increment
- userId: UUID (FK)
- movieId: Int? (FK, nullable)
- seriesId: Int? (FK, nullable)
- addedAt: DateTime, default now()
- Unique compound: userId + movieId, userId + seriesId

**11. FavoriteItem** (tương tự WatchlistItem)

**12. Trailer**
- id: Int, auto-increment
- movieId: Int? (FK, nullable)
- seriesId: Int? (FK, nullable)
- name: String?
- key: String (YouTube video ID)
- site: String, default "YouTube"
- type: String? (Trailer, Teaser, Clip, Featurette)
- official: Boolean, default false
- publishedAt: DateTime?
- createdAt, updatedAt

**13. Image**
- id: Int, auto-increment
- movieId: Int? (FK, nullable)
- seriesId: Int? (FK, nullable)
- personId: Int? (FK, nullable)
- filePath: String
- type: String (poster, backdrop, still, profile)
- width: Int?
- height: Int?
- createdAt: DateTime, default now()

**14. Country**
- id: Int, auto-increment
- isoCode: String, unique, max 10
- name: String, max 200
- Relations: movies[] (N-N), tvSeries[] (N-N)

**15. ProductionCompany**
- id: Int, auto-increment
- tmdbId: Int?, unique
- name: String
- logoUrl: String?
- originCountry: String?
- Relations: movies[] (N-N), tvSeries[] (N-N)

**16. MovieCast** (bảng trung gian explicit)
- id: Int, auto-increment
- movieId: Int (FK)
- personId: Int (FK)
- character: String?
- displayOrder: Int, default 0
- Unique compound: movieId + personId + character (tránh duplicate)

**17. MovieCrew**
- id: Int, auto-increment
- movieId: Int (FK)
- personId: Int (FK)
- job: String? (Director, Writer, Producer...)
- department: String? (Directing, Writing, Production...)
- Unique compound: movieId + personId + job

**18. SeriesCast** (tương tự MovieCast, FK → seriesId)
**19. SeriesCrew** (tương tự MovieCrew, FK → seriesId)

**20. Report** (báo cáo vi phạm)
- id: Int, auto-increment
- reporterId: UUID (FK → User, người báo cáo)
- commentId: Int? (FK → Comment, nullable)
- targetUserId: UUID? (FK → User, nullable)
- reason: String
- status: ReportStatus, default PENDING
- resolvedBy: UUID? (FK → User, admin xử lý)
- resolvedAt: DateTime?
- createdAt, updatedAt
- Unique compound: reporterId + commentId (mỗi user chỉ report 1 comment 1 lần)

**21. ActivityLog**
- id: Int, auto-increment
- userId: UUID (FK)
- action: String (RATE, COMMENT, WATCHLIST_ADD, WATCHLIST_REMOVE, FAVORITE_ADD, FAVORITE_REMOVE, LOGIN, PROFILE_UPDATE)
- entityType: String? (MOVIE, TV, COMMENT)
- entityId: Int?
- metadata: Json?
- createdAt: DateTime, default now()
- Index: userId + createdAt DESC

**22. TmdbSyncLog**
- id: Int, auto-increment
- syncType: String (full_import, daily_sync, on_demand)
- entityType: String (movie, tv, person)
- totalProcessed: Int, default 0
- totalCreated: Int, default 0
- totalUpdated: Int, default 0
- totalErrors: Int, default 0
- errorDetails: Json?
- startedAt: DateTime
- completedAt: DateTime?
- status: String (running, completed, failed)
- createdAt: DateTime, default now()

**23. RefreshToken** (lưu refresh tokens)
- id: Int, auto-increment
- userId: UUID (FK)
- token: String, unique
- expiresAt: DateTime
- createdAt: DateTime, default now()
- Index: token (unique), userId

### Bảng trung gian implicit (Prisma N-N)

Dùng implicit many-to-many cho các quan hệ đơn giản:
- Movie ↔ Genre (bảng _MovieGenres)
- Movie ↔ Country (bảng _MovieCountries)
- Movie ↔ ProductionCompany (bảng _MovieCompanies)
- TVSeries ↔ Genre (bảng _TVSeriesGenres)
- TVSeries ↔ Country (bảng _TVSeriesCountries)
- TVSeries ↔ ProductionCompany (bảng _TVSeriesCompanies)

### Quy tắc chung

1. Tất cả FK phải có onDelete phù hợp:
   - User bị xóa → ratings, comments, watchlist SET NULL hoặc CASCADE (chọn CASCADE)
   - Movie bị xóa → ratings, comments CASCADE
   - Season bị xóa → episodes CASCADE
   - TVSeries bị xóa → seasons CASCADE
2. Prisma generator: client output default
3. Database provider: postgresql

## Sau khi viết schema

1. Khởi tạo Prisma: `npx prisma init` (nếu chưa)
2. Chạy migration: `npx prisma migrate dev --name init`
3. Generate client: `npx prisma generate`
4. Kiểm tra bằng Prisma Studio: `npx prisma studio`

## Output

1. File prisma/schema.prisma hoàn chỉnh
2. Migration chạy thành công
3. Prisma Studio hiển thị tất cả bảng
4. Thêm raw SQL migration cho full-text index nếu cần:
   ```sql
   CREATE INDEX idx_movies_title_fts ON "Movie" USING gin(to_tsvector('simple', "title"));
   CREATE INDEX idx_tv_series_title_fts ON "TVSeries" USING gin(to_tsvector('simple', "title"));
   CREATE INDEX idx_people_name_fts ON "Person" USING gin(to_tsvector('simple', "name"));
   ```
```

### Tiêu chí hoàn thành

- [ ] `npx prisma migrate dev` chạy thành công, không lỗi
- [ ] `npx prisma studio` hiển thị tất cả 23+ bảng
- [ ] Tất cả relations hiển thị đúng (click vào table thấy related records)
- [ ] Unique constraints đúng (test insert duplicate → error)
- [ ] Indexes được tạo (kiểm tra bằng `\di` trong psql hoặc query pg_indexes)
- [ ] Enums hiển thị đúng values
- [ ] `npx prisma generate` không warning

### Lỗi thường gặp

- Prisma không hỗ trợ partial unique index trực tiếp → dùng @@unique với nullable fields (Prisma cho phép multiple NULL trong unique)
- BigInt trong Prisma cần serialize đặc biệt khi trả JSON (thêm serializer)
- Implicit many-to-many cần cả hai model có relations khai báo
- Compound unique trên nullable fields: Prisma hỗ trợ nhưng cần test kỹ

---

## WP-0.4: Seed Data & TMDB Quick Import

### Thông tin

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 1 ngày |
| **Agent skill** | Prisma, TypeScript, TMDB API, Data pipeline |
| **Input** | Schema từ WP-0.3, TMDB API Key từ WP-0.1 |
| **Output** | Seed data + 100 phim thực từ TMDB |
| **Dependency** | WP-0.2, WP-0.3 |

### Prompt cho Agent

```
Bạn là một data engineer. Dự án CineDB (NestJS + Prisma + PostgreSQL) cần seed data và script import phim từ TMDB API.

## Context

Database schema đã sẵn sàng (Prisma). TMDB API Key đã có. Cần tạo 2 thứ:

1. **Prisma Seed** (chạy bằng `npx prisma db seed`): Dữ liệu tĩnh (genres, countries, admin user)
2. **TMDB Quick Import Script**: Fetch và import 100 phim từ TMDB API

## File cần tạo

### File 1: prisma/seed.ts

```typescript
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. GENRES — 20 thể loại (tmdb_id mapping chính xác với TMDB)
  const genres = [
    { tmdbId: 28, name: 'Action', slug: 'action' },
    { tmdbId: 12, name: 'Adventure', slug: 'adventure' },
    { tmdbId: 16, name: 'Animation', slug: 'animation' },
    { tmdbId: 35, name: 'Comedy', slug: 'comedy' },
    { tmdbId: 80, name: 'Crime', slug: 'crime' },
    { tmdbId: 99, name: 'Documentary', slug: 'documentary' },
    { tmdbId: 18, name: 'Drama', slug: 'drama' },
    { tmdbId: 10751, name: 'Family', slug: 'family' },
    { tmdbId: 14, name: 'Fantasy', slug: 'fantasy' },
    { tmdbId: 36, name: 'History', slug: 'history' },
    { tmdbId: 27, name: 'Horror', slug: 'horror' },
    { tmdbId: 10402, name: 'Music', slug: 'music' },
    { tmdbId: 9648, name: 'Mystery', slug: 'mystery' },
    { tmdbId: 10749, name: 'Romance', slug: 'romance' },
    { tmdbId: 878, name: 'Science Fiction', slug: 'science-fiction' },
    { tmdbId: 10770, name: 'TV Movie', slug: 'tv-movie' },
    { tmdbId: 53, name: 'Thriller', slug: 'thriller' },
    { tmdbId: 10752, name: 'War', slug: 'war' },
    { tmdbId: 37, name: 'Western', slug: 'western' },
  ];

  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: {},
      create: genre,
    });
  }
  console.log(`✅ ${genres.length} genres seeded`);

  // 2. COUNTRIES — 50 quốc gia phổ biến nhất
  // Tạo danh sách với iso_code (ISO 3166-1 alpha-2) và tên tiếng Anh
  // Bao gồm: US, GB, FR, DE, JP, KR, CN, IN, AU, CA, IT, ES, BR, MX, RU,
  // SE, DK, NO, FI, NL, BE, CH, AT, PL, CZ, HU, RO, UA, TR, TH, VN, PH,
  // ID, MY, SG, TW, HK, NZ, ZA, AR, CL, CO, EG, IL, AE, SA, IE, PT, GR, HR
  // (viết đầy đủ 50 countries với tên)

  // 3. PRODUCTION COMPANIES — 15 studio lớn
  const companies = [
    { tmdbId: 174, name: 'Warner Bros. Pictures', originCountry: 'US' },
    { tmdbId: 2, name: 'Walt Disney Pictures', originCountry: 'US' },
    { tmdbId: 33, name: 'Universal Pictures', originCountry: 'US' },
    { tmdbId: 4, name: 'Paramount Pictures', originCountry: 'US' },
    { tmdbId: 5, name: 'Columbia Pictures', originCountry: 'US' },
    { tmdbId: 25, name: '20th Century Studios', originCountry: 'US' },
    { tmdbId: 1632, name: 'Lionsgate', originCountry: 'US' },
    { tmdbId: 41077, name: 'A24', originCountry: 'US' },
    { tmdbId: 21, name: 'Metro-Goldwyn-Mayer', originCountry: 'US' },
    { tmdbId: 420, name: 'Marvel Studios', originCountry: 'US' },
    { tmdbId: 923, name: 'Legendary Entertainment', originCountry: 'US' },
    { tmdbId: 82819, name: 'Netflix', originCountry: 'US' },
    { tmdbId: 7505, name: 'Studio Ghibli', originCountry: 'JP' },
    { tmdbId: 3166, name: 'New Line Cinema', originCountry: 'US' },
    { tmdbId: 9993, name: 'DC Entertainment', originCountry: 'US' },
  ];

  for (const company of companies) {
    await prisma.productionCompany.upsert({
      where: { tmdbId: company.tmdbId },
      update: {},
      create: company,
    });
  }
  console.log(`✅ ${companies.length} companies seeded`);

  // 4. ADMIN USER
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@cinedb.com' },
    update: {},
    create: {
      email: 'admin@cinedb.com',
      passwordHash: adminPassword,
      displayName: 'CineDB Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
  console.log('✅ Admin user seeded (admin@cinedb.com / Admin@123)');

  // 5. TEST USERS — 5 users
  const userPassword = await bcrypt.hash('User@123', 10);
  const testUsers = [
    { email: 'user1@test.com', displayName: 'Nguyễn Văn A' },
    { email: 'user2@test.com', displayName: 'Trần Thị B' },
    { email: 'user3@test.com', displayName: 'Lê Văn C' },
    { email: 'user4@test.com', displayName: 'Phạm Thị D' },
    { email: 'user5@test.com', displayName: 'Hoàng Văn E' },
  ];

  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        ...user,
        passwordHash: userPassword,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });
  }
  console.log(`✅ ${testUsers.length} test users seeded`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Thêm vào package.json:
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

### File 2: scripts/tmdb-import.ts

Script import phim từ TMDB. Yêu cầu:

1. **Config**: đọc TMDB_API_KEY, TMDB_BASE_URL, DATABASE_URL từ .env
2. **Rate limiter**: tối đa 4 requests/giây (dùng simple sleep 250ms giữa mỗi request)
3. **Flow**:
   a. Fetch genre list từ TMDB → map với genres đã seed (bằng tmdb_id)
   b. Fetch 5 pages popular movies (GET /movie/popular?page=1..5)
   c. Với mỗi movie trong kết quả (100 movies):
      - GET /movie/{tmdb_id}?append_to_response=credits,videos,images&language=vi-VN
      - Nếu overview trống (tiếng Việt không có) → fetch lại với language=en-US
      - Map dữ liệu TMDB → Prisma entities
      - Upsert movie (on conflict tmdb_id)
      - Upsert people từ credits.cast (top 15) và credits.crew (Director, Writer, Producer)
      - Create MovieCast records (character, order)
      - Create MovieCrew records (job, department)
      - Create Trailer records từ videos.results (filter: site=YouTube, type=Trailer|Teaser)
      - Link genres (connect by tmdb_id)
   d. Log progress: "Importing movie X/100: Title (year)"

4. **Image URL construction**:
   - poster: `https://image.tmdb.org/t/p/w500{poster_path}`
   - backdrop: `https://image.tmdb.org/t/p/w1280{backdrop_path}`
   - profile: `https://image.tmdb.org/t/p/w185{profile_path}`

5. **Error handling**: nếu 1 movie fail, log error và tiếp tục (không dừng cả script)

6. **Summary**: cuối cùng log tổng số movies imported, people imported, errors

Script chạy bằng: `npx ts-node scripts/tmdb-import.ts`

### File 3: scripts/tmdb-import-tv.ts (tương tự cho TV Series)

Fetch 2 pages popular TV (40 series):
- GET /tv/popular?page=1..2
- GET /tv/{tmdb_id}?append_to_response=credits,videos,images
- Với mỗi series, fetch thêm seasons:
  - GET /tv/{tmdb_id}/season/{season_number} (cho mỗi season)
  - Lưu seasons + episodes
- Upsert tương tự movie

## Lưu ý mapping TMDB → CineDB

```
TMDB field            → CineDB field
─────────────────────────────────────
id                    → tmdbId
title                 → title
original_title        → originalTitle
overview              → overview
release_date          → releaseDate (parse ISO date)
runtime               → runtime
original_language     → language
budget                → budget (BigInt)
revenue               → revenue (BigInt)
status                → status
vote_average          → tmdbVoteAverage (LƯU VÀO TMDB SCORE, KHÔNG PHẢI CINEDB SCORE)
vote_count            → tmdbVoteCount
popularity            → popularity
poster_path           → posterUrl (prepend base URL)
backdrop_path         → backdropUrl (prepend base URL)
genre_ids             → genres (connect by tmdb_id)

credits.cast[].id           → Person.tmdbId
credits.cast[].name         → Person.name
credits.cast[].character    → MovieCast.character
credits.cast[].order        → MovieCast.displayOrder
credits.cast[].profile_path → Person.profileUrl
credits.cast[].gender       → Person.gender (0=UNKNOWN, 1=FEMALE, 2=MALE, 3=NON_BINARY)
credits.cast[].known_for_department → Person.knownForDepartment

videos.results[].key  → Trailer.key
videos.results[].name → Trailer.name
videos.results[].site → Trailer.site
videos.results[].type → Trailer.type
```

## Output mong đợi

1. `npx prisma db seed` → genres, countries, companies, users seeded
2. `npx ts-node scripts/tmdb-import.ts` → 100 movies imported (~3 phút)
3. `npx ts-node scripts/tmdb-import-tv.ts` → 40 TV series imported (~5 phút)
4. Prisma Studio: movies table có ~100 rows, mỗi movie có genres, cast, trailers linked
5. Kiểm tra: movie có cast → click cast → thấy person → person có movies
```

### Tiêu chí hoàn thành

- [ ] `npx prisma db seed` → thành công, log hiển thị counts
- [ ] `npx ts-node scripts/tmdb-import.ts` → 90+ movies imported (một số có thể fail)
- [ ] Prisma Studio: Movie table có data, click vào 1 movie thấy genres, cast, trailers
- [ ] Person table có 200+ records
- [ ] Trailer table có records với YouTube keys hợp lệ
- [ ] Genre linkages đúng (movie Action có genre Action)
- [ ] Cast order đúng (cast[0] là diễn viên chính)
- [ ] Image URLs hoạt động (copy posterUrl → paste vào browser → thấy ảnh)
- [ ] TV Series có seasons và episodes

### Lỗi thường gặp

- TMDB rate limit 429: tăng sleep lên 500ms
- Một số phim không có poster/backdrop → set null, không crash
- Overview tiếng Việt thường trống → cần fallback sang en-US
- BigInt serialization: Prisma trả BigInt, JSON.stringify không hiểu → cần custom serializer
- Person có thể xuất hiện trong nhiều phim → dùng upsert, không create
- Genre tmdb_id không match → đảm bảo seed genres trước khi import

---

## Checkpoint Pha 0

```
╔══════════════════════════════════════════════════════╗
║  CHECKPOINT PHA 0 — Hoàn tất khi tất cả ✅          ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Infrastructure:                                     ║
║  ✅ Docker: postgres + redis + ES healthy            ║
║  ✅ Backend NestJS chạy, Swagger UI accessible       ║
║  ✅ Frontend Next.js chạy, placeholder page          ║
║  ✅ Recommendation FastAPI chạy, /health OK          ║
║                                                      ║
║  Database:                                           ║
║  ✅ 23+ bảng, tất cả relations đúng                  ║
║  ✅ 19 genres, 50 countries, 15 companies            ║
║  ✅ 1 admin + 5 test users                           ║
║  ✅ 100+ movies với cast, crew, trailers, genres     ║
║  ✅ 40+ TV series với seasons, episodes              ║
║  ✅ 200+ people records                              ║
║  ✅ Image URLs hoạt động                             ║
║                                                      ║
║  Code Quality:                                       ║
║  ✅ npm run build pass (cả backend + frontend)       ║
║  ✅ npm run lint clean                               ║
║  ✅ .env.example đầy đủ                              ║
║  ✅ README.md có hướng dẫn setup                     ║
║  ✅ Git commit: "feat: complete phase 0 setup"       ║
║                                                      ║
║  → Tag v0.1.0, sẵn sàng cho Pha 1                   ║
╚══════════════════════════════════════════════════════╝
```
