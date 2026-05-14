# CineDB — Workflow Phát triển Hoàn chỉnh

> **Tổng hợp từ:** SRS_CineDB.docx, architecture.md, implementation-roadmap.md, tmdb-integration.md  
> **Mục đích:** Cung cấp một quy trình end-to-end từ lúc bắt đầu dự án đến khi go-live, có thể giao cho AI agent hoặc nhóm phát triển thực hiện theo thứ tự.

---

## Mục lục

1. [Tổng quan Workflow](#1-tổng-quan-workflow)
2. [Quy ước chung](#2-quy-ước-chung)
3. [Pha 0 — Khởi tạo hạ tầng](#3-pha-0--khởi-tạo-hạ-tầng)
4. [Pha 1 — Backend Core](#4-pha-1--backend-core)
5. [Pha 2 — Frontend Core](#5-pha-2--frontend-core)
6. [Pha 3 — Tính năng nâng cao](#6-pha-3--tính-năng-nâng-cao)
7. [Pha 4 — Production Readiness](#7-pha-4--production-readiness)
8. [Pha 5 — Go-live & Vận hành](#8-pha-5--go-live--vận-hành)
9. [Dependency Graph](#9-dependency-graph)
10. [Checklist tổng hợp](#10-checklist-tổng-hợp)
11. [Quy trình giao việc cho Agent](#11-quy-trình-giao-việc-cho-agent)
12. [Xử lý sự cố](#12-xử-lý-sự-cố)

---

## 1. Tổng quan Workflow

### 1.1. Toàn cảnh

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        CINEDB DEVELOPMENT WORKFLOW                      ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                         ║
║  Pha 0: Khởi tạo         Pha 1: Backend       Pha 2: Frontend          ║
║  ┌─────────────┐         ┌─────────────┐      ┌─────────────┐          ║
║  │ Repo setup  │────────▶│ Auth        │──┐   │ Layout      │          ║
║  │ Docker      │         │ Movie CRUD  │  │   │ Trang chủ   │          ║
║  │ DB Schema   │────────▶│ TV Series   │  ├──▶│ Chi tiết    │          ║
║  │ TMDB Key    │         │ Person      │  │   │ Tìm kiếm    │          ║
║  │ Seed Data   │────────▶│ Rating      │  │   │ Auth UI     │          ║
║  └─────────────┘         │ User        │──┘   └──────┬──────┘          ║
║       3 ngày             │ Search      │             │                  ║
║                          │ TMDB Sync   │             │                  ║
║                          │ Trending    │             │                  ║
║                          └─────────────┘             │                  ║
║                             15 ngày                  │                  ║
║                                                      │                  ║
║  Pha 3: Nâng cao          Pha 4: Production   Pha 5: Go-live           ║
║  ┌─────────────┐         ┌─────────────┐      ┌─────────────┐          ║
║  │ Admin Panel │◀────────│ CI/CD       │      │ Deploy prod │          ║
║  │ Recommend   │         │ Monitoring  │─────▶│ DNS + SSL   │          ║
║  │ Notification│────────▶│ Security    │      │ Data import │          ║
║  │ TMDB Import │         │ SEO + Perf  │      │ Smoke test  │          ║
║  └─────────────┘         └─────────────┘      └─────────────┘          ║
║       10 ngày               8 ngày               3 ngày               ║
║                                                                         ║
║  ═══════════════════════════════════════════════════                    ║
║  TỔNG: ~39 ngày (1 dev) | ~5 tuần (2 devs song song)                  ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 1.2. Nguyên tắc thực hiện

```
┌──────────────────────────────────────────────────────────────┐
│                     5 NGUYÊN TẮC VÀNG                        │
│                                                              │
│  1. TUẦN TỰ THEO DEPENDENCY                                 │
│     Không bao giờ bắt đầu WP mà dependency chưa xong.       │
│     Kiểm tra dependency graph trước khi nhận việc.           │
│                                                              │
│  2. MỖI LẦN 1 WORK PACKAGE                                  │
│     Giao cho agent đúng 1 WP, review xong mới chuyển.        │
│     Không gộp nhiều WP vào 1 prompt.                         │
│                                                              │
│  3. TEST TRƯỚC KHI CHUYỂN                                    │
│     Mỗi WP phải pass tất cả tiêu chí hoàn thành.            │
│     Chạy test, lint, build check trước khi commit.           │
│                                                              │
│  4. COMMIT THƯỜNG XUYÊN                                      │
│     Mỗi WP hoàn thành = 1 commit (hoặc PR).                 │
│     Message format: "feat(module): mô tả ngắn"              │
│                                                              │
│  5. TÀI LIỆU LUÔN CẬP NHẬT                                 │
│     Swagger docs tự sinh từ code.                            │
│     README cập nhật sau mỗi pha.                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Quy ước chung

### 2.1. Git Branching Strategy

```
main (production)
  │
  ├── develop (integration)
  │     │
  │     ├── feature/wp-0.1-repo-setup
  │     ├── feature/wp-0.2-db-schema
  │     ├── feature/wp-1.1-auth-module
  │     ├── feature/wp-1.2-movie-module
  │     └── ...
  │
  └── hotfix/xxx (nếu cần fix production)

Quy tắc:
  • Mỗi WP = 1 feature branch
  • PR vào develop, cần review
  • develop merge vào main khi kết thúc mỗi pha
  • Tag version: v0.1.0 (Pha 0), v0.2.0 (Pha 1), ...
```

### 2.2. Commit Message Convention

```
<type>(<scope>): <description>

Types:
  feat     — Tính năng mới
  fix      — Sửa lỗi
  refactor — Refactor code
  test     — Thêm/sửa test
  docs     — Tài liệu
  chore    — Config, dependencies
  style    — Format code

Ví dụ:
  feat(auth): implement JWT login with refresh token
  feat(movie): add movie CRUD endpoints with cache
  fix(search): handle elasticsearch connection timeout
  test(rating): add unit tests for rating service
  docs(api): update swagger docs for movie endpoints
  chore(docker): add elasticsearch to docker-compose
```

### 2.3. Cấu trúc .env

```env
# ==================== APP ====================
NODE_ENV=development
APP_PORT=4000
APP_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000

# ==================== DATABASE ====================
DATABASE_URL=postgresql://cinedb:password@localhost:5432/cinedb

# ==================== REDIS ====================
REDIS_HOST=localhost
REDIS_PORT=6379

# ==================== ELASTICSEARCH ====================
ELASTICSEARCH_URL=http://localhost:9200

# ==================== JWT ====================
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ==================== OAUTH ====================
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# ==================== TMDB ====================
TMDB_API_KEY=your-tmdb-api-key
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/
TMDB_RATE_LIMIT=4
TMDB_DEFAULT_LANGUAGE=vi-VN
TMDB_FALLBACK_LANGUAGE=en-US
TMDB_DAILY_SYNC_CRON=0 3 * * *
TMDB_TRENDING_SYNC_CRON=0 */1 * * *

# ==================== STORAGE ====================
S3_BUCKET=cinedb-media
S3_REGION=ap-southeast-1
S3_ACCESS_KEY=
S3_SECRET_KEY=

# ==================== EMAIL ====================
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@cinedb.com
```

---

## 3. Pha 0 — Khởi tạo Hạ tầng

```
Thời gian: 3 ngày
Mục tiêu: Dự án có thể chạy được trên máy local, database có schema và seed data.
```

### Bước 0.1 → TMDB API Key

```
┌─────────────────────────────────────────────────────┐
│  BƯỚC 0.1: ĐĂNG KÝ TMDB API KEY                    │
│  Thời gian: 30 phút | Thực hiện: Thủ công          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. Truy cập https://www.themoviedb.org/signup       │
│  2. Tạo tài khoản                                    │
│  3. Settings → API → Request API Key                 │
│  4. Chọn "Developer" → điền thông tin                │
│  5. Nhận API Key (v3 auth)                           │
│  6. Test:                                            │
│     curl "https://api.themoviedb.org/3/movie/550     │
│           ?api_key=YOUR_KEY"                         │
│     → Phải trả về JSON thông tin phim Fight Club     │
│  7. Lưu key vào file .env                            │
│                                                      │
│  ✅ Done khi: curl trả về HTTP 200 + JSON hợp lệ    │
└─────────────────────────────────────────────────────┘
```

### Bước 0.2 → Khởi tạo Repository

```
┌─────────────────────────────────────────────────────┐
│  BƯỚC 0.2: KHỞI TẠO REPO + DOCKER                  │
│  Thời gian: 1 ngày | Agent: Backend                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Input cho agent:                                    │
│  • Cấu trúc thư mục từ architecture.md §3.1, §3.2   │
│  • Docker services từ architecture.md §6.2           │
│  • .env.example ở trên                               │
│                                                      │
│  Output kỳ vọng:                                     │
│  • Monorepo với frontend/, backend/, recommendation/ │
│  • docker-compose.yml chạy được                      │
│  • NestJS boilerplate (Swagger, Helmet, CORS)        │
│  • Next.js boilerplate (Tailwind, Zustand)           │
│  • FastAPI boilerplate                               │
│                                                      │
│  Kiểm tra:                                           │
│  □ docker compose up -d → 3 services healthy         │
│  □ cd backend && npm run start:dev → port 4000       │
│  □ cd frontend && npm run dev → port 3000            │
│  □ curl localhost:4000/api → JSON response           │
│  □ curl localhost:3000 → HTML page                   │
│                                                      │
│  Commit: "chore: initialize monorepo with docker"    │
└─────────────────────────────────────────────────────┘
```

### Bước 0.3 → Database Schema

```
┌─────────────────────────────────────────────────────┐
│  BƯỚC 0.3: DATABASE SCHEMA (PRISMA)                 │
│  Thời gian: 1 ngày | Agent: Backend                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Input cho agent:                                    │
│  • Danh sách 15+ entities từ SRS §5                  │
│  • ERD từ architecture.md §3.3                       │
│  • TMDB fields bổ sung từ tmdb-integration.md §3.2   │
│  • Code backend hiện tại (WP-0.2 output)             │
│                                                      │
│  Prompt bao gồm:                                     │
│  "Viết prisma/schema.prisma với đầy đủ models,       │
│   relations, indexes, enums. Mỗi bảng có tmdb_id     │
│   (nullable, unique) để mapping với TMDB."            │
│                                                      │
│  Kiểm tra:                                           │
│  □ npx prisma migrate dev --name init → success      │
│  □ npx prisma studio → thấy tất cả bảng             │
│  □ Tất cả relations hiển thị đúng trong Studio       │
│  □ Indexes được tạo (kiểm tra bằng \di trong psql)   │
│                                                      │
│  Commit: "feat(db): add prisma schema with all       │
│           entities and TMDB integration fields"      │
└─────────────────────────────────────────────────────┘
```

### Bước 0.4 → Seed Data + TMDB Import thử

```
┌─────────────────────────────────────────────────────┐
│  BƯỚC 0.4: SEED DATA                                │
│  Thời gian: 1 ngày | Agent: Backend                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Có 2 phần:                                          │
│                                                      │
│  Phần A — Static Seed (chạy ngay):                   │
│  • 20 genres, 50 countries, 10 production companies  │
│  • 1 admin user (admin@cinedb.com / Admin@123)       │
│  • 5 test users                                      │
│                                                      │
│  Phần B — TMDB Quick Import Script:                  │
│  • Script riêng: scripts/tmdb-quick-import.ts        │
│  • Fetch 5 pages popular movies (100 phim)           │
│  • Fetch đầy đủ details + credits + videos           │
│  • Upsert vào database                               │
│  • Thời gian chạy: ~3 phút (rate limited)            │
│                                                      │
│  Kiểm tra:                                           │
│  □ npx prisma db seed → genres + users created       │
│  □ npx ts-node scripts/tmdb-quick-import.ts          │
│    → "Imported 100 movies successfully"              │
│  □ Prisma Studio: movies table có 100 rows           │
│  □ Mỗi movie có genres, cast, trailers linked        │
│                                                      │
│  Commit: "feat(db): add seed data and TMDB import    │
│           script"                                    │
└─────────────────────────────────────────────────────┘
```

### Checkpoint Pha 0

```
╔══════════════════════════════════════════════════════╗
║  CHECKPOINT PHA 0 — Trước khi sang Pha 1            ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  □ Git repo initialized, pushed to remote            ║
║  □ Docker Compose: postgres + redis + ES healthy     ║
║  □ Backend NestJS chạy, Swagger UI accessible        ║
║  □ Frontend Next.js chạy, trang mặc định hiển thị   ║
║  □ Database: 20+ bảng, 100 phim, 5 users             ║
║  □ .env configured with all secrets                  ║
║  □ README.md có hướng dẫn setup cho dev mới          ║
║                                                      ║
║  Nếu tất cả ✅ → Tag v0.1.0, merge develop → main   ║
╚══════════════════════════════════════════════════════╝
```

---

## 4. Pha 1 — Backend Core

```
Thời gian: 15 ngày
Mục tiêu: API hoàn chỉnh cho tất cả chức năng chính.
Có thể test bằng Swagger UI / Postman.
```

### Thứ tự thực hiện

```
Ngày 1-3:   WP-1.1 Auth Module
                │
Ngày 4-6:   WP-1.2 Movie Module ◄── cần Auth Guard
                │
Ngày 6-7:   WP-1.4 Person Module (song song nếu 2 devs)
                │
Ngày 7-8:   WP-1.3 TV Series Module ◄── copy pattern từ Movie
                │
Ngày 8-9:   WP-1.5 Rating & Comment ◄── cần Auth + Movie
                │
Ngày 9-10:  WP-1.6 User Module (Profile, Watchlist, Favorites)
                │
Ngày 10-12: WP-1.7 Search Module (Elasticsearch) ◄── cần Movie data
                │
Ngày 12-13: WP-1.9 TMDB Client Module
                │
Ngày 13-15: WP-1.10 TMDB Sync Service ◄── cần TMDB Client + Movie
                │
Ngày 15:    WP-1.8 Trending & Genre endpoints
```

### Template prompt cho mỗi bước Pha 1

```
┌─────────────────────────────────────────────────────────────┐
│  PROMPT TEMPLATE — BACKEND MODULE                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Khi giao việc cho agent, luôn kèm:                          │
│                                                              │
│  1. CONTEXT FILES (copy/paste hoặc attach):                  │
│     • prisma/schema.prisma (toàn bộ)                         │
│     • src/app.module.ts (để biết modules đã có)              │
│     • src/common/guards/ (AuthGuard, RolesGuard)             │
│     • 1 module mẫu đã hoàn thành (nếu có)                   │
│                                                              │
│  2. SPEC từ tài liệu:                                       │
│     • Endpoints list từ architecture.md §3.2                 │
│     • Business rules từ SRS §8                               │
│     • Entity fields từ SRS §5                                │
│                                                              │
│  3. YÊU CẦU OUTPUT:                                         │
│     "Tạo [Module] hoàn chỉnh gồm:                           │
│      - module.ts, controller.ts, service.ts                  │
│      - DTOs với class-validator                              │
│      - Swagger decorators (@ApiTags, @ApiOperation, etc.)    │
│      - Unit tests (.spec.ts) coverage ≥ 80%                 │
│      - Redis cache cho GET endpoints (nếu áp dụng)          │
│      - Error handling với custom exceptions                  │
│      Tuân theo patterns trong [module mẫu đã attach]."       │
│                                                              │
│  4. KIỂM TRA SAU KHI NHẬN CODE:                             │
│     □ npm run build → không lỗi                              │
│     □ npm run test → pass                                    │
│     □ npm run start:dev → server chạy                        │
│     □ Swagger UI hiển thị endpoints mới                      │
│     □ Test thủ công 3-5 scenarios bằng curl/Postman          │
│     □ npm run lint → không warning                           │
│                                                              │
│  5. COMMIT & CHUYỂN TIẾP:                                    │
│     git add -A                                               │
│     git commit -m "feat(module-name): description"           │
│     → Kiểm tra dependency graph                             │
│     → Chọn WP tiếp theo                                     │
└─────────────────────────────────────────────────────────────┘
```

### Checkpoint Pha 1

```
╔══════════════════════════════════════════════════════╗
║  CHECKPOINT PHA 1 — Trước khi sang Pha 2            ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  API Functional Tests (Postman/curl):                ║
║  □ Register → Login → Get Token                     ║
║  □ GET /movies → paginated list                      ║
║  □ GET /movies/:id → full details + credits          ║
║  □ POST /movies/:id/rating (auth) → success          ║
║  □ POST /comments (auth) → success                   ║
║  □ POST /movies/:id/watchlist (auth) → toggle        ║
║  □ GET /search/multi?query=test → results            ║
║  □ GET /trending/movie/day → trending list           ║
║  □ POST /admin/tmdb/import/movie/:tmdbId (admin)     ║
║  □ Non-auth requests to protected → 401              ║
║  □ Non-admin requests to admin → 403                 ║
║                                                      ║
║  Code Quality:                                       ║
║  □ npm run test → all pass, coverage ≥ 80%           ║
║  □ npm run build → success                           ║
║  □ Swagger docs complete cho tất cả endpoints        ║
║  □ TMDB import: ≥ 500 phim trong database            ║
║                                                      ║
║  Nếu tất cả ✅ → Tag v0.2.0                         ║
╚══════════════════════════════════════════════════════╝
```

---

## 5. Pha 2 — Frontend Core

```
Thời gian: 11 ngày
Mục tiêu: Website hoạt động đầy đủ cho end-user.
Có thể demo được các flow chính.
```

### Thứ tự thực hiện

```
Ngày 1-3:   WP-2.1 Layout, UI Components, API Client
                │
                ├── Ngày 3-4: WP-2.2 Trang chủ
                │
                ├── Ngày 4-6: WP-2.3 Trang chi tiết phim
                │
                ├── Ngày 6-8: WP-2.4 Tìm kiếm + Discover
                │
                └── Ngày 8-10: WP-2.5 Auth UI (Login, Register, Profile)

Ngày 10-11: Integration test toàn bộ flows
```

### Template prompt cho mỗi bước Pha 2

```
┌─────────────────────────────────────────────────────────────┐
│  PROMPT TEMPLATE — FRONTEND PAGE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Khi giao việc cho agent, luôn kèm:                          │
│                                                              │
│  1. CONTEXT FILES:                                           │
│     • API endpoint list (Swagger JSON hoặc danh sách)        │
│     • Existing components (components/ui/, components/movie/)│
│     • Layout files (app/layout.tsx)                          │
│     • Zustand stores (store/)                                │
│     • API client (lib/api.ts)                                │
│     • Tailwind config                                        │
│                                                              │
│  2. SPEC:                                                    │
│     • Wireframe mô tả (text) từ roadmap WP-2.x              │
│     • Rendering strategy (SSR/SSG/CSR)                       │
│     • Responsive requirements                                │
│                                                              │
│  3. YÊU CẦU OUTPUT:                                         │
│     "Tạo trang [page] với:                                   │
│      - Next.js App Router (app/xxx/page.tsx)                 │
│      - generateMetadata() cho SEO                            │
│      - Responsive: mobile → tablet → desktop                 │
│      - Dark mode support (Tailwind dark: prefix)             │
│      - Loading skeleton trong khi fetch                      │
│      - Error boundary / error state                          │
│      - Sử dụng existing components từ components/ui/         │
│      - TypeScript strict, no any"                            │
│                                                              │
│  4. KIỂM TRA:                                                │
│     □ npm run build → không lỗi                              │
│     □ Trang hiển thị đúng trên Chrome desktop                │
│     □ Trang hiển thị đúng trên mobile (DevTools 375px)       │
│     □ Dark mode hoạt động                                    │
│     □ Data fetch từ API thành công                            │
│     □ Loading state hiển thị                                  │
│     □ Error state hiển thị khi API fail                       │
│     □ Lighthouse SEO ≥ 90 (cho public pages)                 │
└─────────────────────────────────────────────────────────────┘
```

### Checkpoint Pha 2

```
╔══════════════════════════════════════════════════════╗
║  CHECKPOINT PHA 2 — Trước khi sang Pha 3            ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  User Flows hoàn chỉnh:                              ║
║  □ Mở trang chủ → thấy phim trending, popular        ║
║  □ Click phim → trang chi tiết đầy đủ                ║
║  □ Xem trailer → modal YouTube play                   ║
║  □ Tìm kiếm "Avengers" → kết quả chính xác          ║
║  □ Discover → lọc theo genre + year → kết quả        ║
║  □ Đăng ký → nhận email (mock) → đăng nhập          ║
║  □ Đăng nhập → thấy avatar + dropdown                ║
║  □ Đánh giá phim → điểm cập nhật                     ║
║  □ Thêm watchlist → icon toggle                      ║
║  □ Thêm yêu thích → icon toggle                      ║
║  □ Xem profile → tabs hiển thị đúng                  ║
║  □ Đăng xuất → trở về trạng thái guest               ║
║                                                      ║
║  Responsive:                                         ║
║  □ Desktop (1440px): layout đầy đủ                   ║
║  □ Tablet (768px): layout 2 cột                      ║
║  □ Mobile (375px): layout 1 cột, hamburger menu      ║
║                                                      ║
║  Nếu tất cả ✅ → Tag v0.3.0                         ║
╚══════════════════════════════════════════════════════╝
```

---

## 6. Pha 3 — Tính năng Nâng cao

```
Thời gian: 10 ngày
Mục tiêu: Admin dashboard, recommendation, TMDB full sync.
```

### Thứ tự thực hiện

```
Song song nếu 2+ agents:

  Agent A (Frontend):                Agent B (Backend/ML):
  ┌──────────────────┐              ┌──────────────────┐
  │ WP-3.1           │              │ WP-3.2           │
  │ Admin Dashboard   │              │ Recommendation   │
  │ (4 ngày)          │              │ Service           │
  │                   │              │ (4 ngày)          │
  │ • Dashboard stats │              │ • Content-Based  │
  │ • Movie CRUD UI   │              │ • Collaborative  │
  │ • User management │              │ • Hybrid scoring │
  │ • Comment mod     │              │ • FastAPI + train │
  │ • Report handling │              │ • NestJS integrate│
  └────────┬──────────┘              └────────┬─────────┘
           │                                  │
           ▼                                  │
  ┌──────────────────┐                        │
  │ WP-2.6           │◄───────────────────────┘
  │ TMDB Import UI   │
  │ (1 ngày)          │
  └────────┬──────────┘
           │
           ▼
  ┌──────────────────┐
  │ WP-3.3           │
  │ Notifications    │
  │ (2 ngày, optional)│
  └──────────────────┘

  Cuối pha:
  ┌──────────────────┐
  │ TMDB Full Import │
  │ (chạy script)    │
  │ • 500+ pages     │
  │ • ~10.000 phim   │
  │ • 3-5 giờ chạy   │
  └──────────────────┘
```

### Checkpoint Pha 3

```
╔══════════════════════════════════════════════════════╗
║  CHECKPOINT PHA 3 — Trước khi sang Pha 4            ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Admin Dashboard:                                    ║
║  □ Login admin → thấy dashboard stats                ║
║  □ CRUD movie hoạt động từ admin UI                  ║
║  □ Lock/unlock user hoạt động                        ║
║  □ Moderate comments: hide/delete                    ║
║  □ TMDB search + import 1 phim từ UI                 ║
║  □ Sync logs hiển thị                                ║
║                                                      ║
║  Recommendation:                                     ║
║  □ GET /recommend/similar/123 → 12 phim hợp lý      ║
║  □ GET /recommend/personalized/user1 → results       ║
║  □ User mới (< 5 ratings) → fallback trending       ║
║  □ Service down → fallback cùng genre                ║
║                                                      ║
║  Data:                                               ║
║  □ Database có ≥ 5.000 phim từ TMDB                  ║
║  □ Daily sync cron job configured                    ║
║  □ Trending sync running every hour                  ║
║                                                      ║
║  Nếu tất cả ✅ → Tag v0.4.0                         ║
╚══════════════════════════════════════════════════════╝
```

---

## 7. Pha 4 — Production Readiness

```
Thời gian: 8 ngày
Mục tiêu: Hệ thống đủ an toàn, ổn định, có thể monitor.
```

### Thứ tự thực hiện

```
Ngày 1-2:   WP-4.3 Security Hardening ◄── QUAN TRỌNG, LÀM TRƯỚC
                │
Ngày 2-4:   WP-4.1 CI/CD Pipeline (GitHub Actions)
                │
Ngày 4-6:   WP-4.2 Monitoring & Logging
                │
Ngày 6-8:   WP-4.4 SEO & Performance Optimization
```

### Security Checklist (WP-4.3)

```
┌─────────────────────────────────────────────────────────────┐
│  SECURITY AUDIT CHECKLIST                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Authentication:                                             │
│  □ Passwords hashed with bcrypt (salt ≥ 10)                  │
│  □ JWT secrets ≥ 32 characters, from env vars                │
│  □ Refresh tokens stored securely                            │
│  □ Token blacklist on logout (Redis)                         │
│  □ Account lockout after 5 failed attempts                   │
│                                                              │
│  Authorization:                                              │
│  □ Every endpoint has appropriate guard                       │
│  □ Admin endpoints reject non-admin users                    │
│  □ Users can only edit/delete own resources                  │
│                                                              │
│  Input Validation:                                           │
│  □ All DTOs use class-validator                              │
│  □ SQL injection: all queries via Prisma (parameterized)     │
│  □ XSS: comment content sanitized (sanitize-html)           │
│  □ File upload: type + size validation                       │
│                                                              │
│  HTTP Security:                                              │
│  □ Helmet.js configured (CSP, HSTS, etc.)                    │
│  □ CORS: whitelist only frontend domain                      │
│  □ Rate limiting active (throttler)                          │
│  □ No sensitive data in logs                                 │
│  □ Swagger UI disabled in production                         │
│                                                              │
│  Infrastructure:                                             │
│  □ HTTPS only (redirect HTTP → HTTPS)                        │
│  □ Database password ≥ 16 characters                         │
│  □ Redis password configured                                 │
│  □ No secrets in git history                                 │
│  □ npm audit: 0 critical vulnerabilities                     │
└─────────────────────────────────────────────────────────────┘
```

### Checkpoint Pha 4

```
╔══════════════════════════════════════════════════════╗
║  CHECKPOINT PHA 4 — Trước khi Go-live               ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  CI/CD:                                              ║
║  □ Push to develop → auto lint + test + build        ║
║  □ Tag v* → auto deploy to staging                   ║
║  □ All tests pass in CI                              ║
║                                                      ║
║  Monitoring:                                         ║
║  □ Grafana dashboard accessible                      ║
║  □ API metrics visible (request rate, latency)       ║
║  □ Alert rules configured (error rate, response time)║
║  □ Centralized logging (ELK/Loki) working            ║
║  □ Health check endpoints respond correctly          ║
║                                                      ║
║  Performance:                                        ║
║  □ Lighthouse Performance ≥ 80                       ║
║  □ Lighthouse SEO ≥ 90                               ║
║  □ API P95 latency < 500ms                           ║
║  □ sitemap.xml accessible                            ║
║  □ Image optimization (next/image) working           ║
║                                                      ║
║  Security:                                           ║
║  □ Security checklist 100% complete                  ║
║  □ npm audit: 0 critical                             ║
║  □ HTTPS working with valid certificate              ║
║                                                      ║
║  Nếu tất cả ✅ → Tag v1.0.0-rc1                     ║
╚══════════════════════════════════════════════════════╝
```

---

## 8. Pha 5 — Go-live & Vận hành

```
Thời gian: 3 ngày
Mục tiêu: Hệ thống chạy production, dữ liệu đầy đủ, có thể demo.
```

### Bước triển khai Production

```
Ngày 1: Server Setup
┌──────────────────────────────────────────────────────┐
│  1. Provision VPS/Cloud server                        │
│     • Ubuntu 24.04 LTS                                │
│     • ≥ 4 vCPU, ≥ 8GB RAM, ≥ 100GB SSD              │
│     • Mở ports: 80, 443, 22                          │
│                                                       │
│  2. Install prerequisites                             │
│     • Docker + Docker Compose                         │
│     • Nginx                                           │
│     • Certbot (Let's Encrypt)                         │
│                                                       │
│  3. Configure DNS                                     │
│     • A record: cinedb.example.com → server IP       │
│     • A record: api.cinedb.example.com → server IP   │
│                                                       │
│  4. SSL Certificate                                   │
│     • certbot --nginx -d cinedb.example.com          │
│       -d api.cinedb.example.com                      │
│                                                       │
│  5. Nginx config                                      │
│     • cinedb.example.com → proxy to frontend:3000    │
│     • api.cinedb.example.com → proxy to backend:4000 │
│     • SSL, gzip, security headers                    │
└──────────────────────────────────────────────────────┘

Ngày 2: Deploy + Data Import
┌──────────────────────────────────────────────────────┐
│  1. Clone repo to server                              │
│  2. Copy .env.production                              │
│  3. docker compose -f docker-compose.prod.yml up -d  │
│  4. Run migrations: npx prisma migrate deploy        │
│  5. Run seed: npx prisma db seed                     │
│  6. TMDB Full Import:                                 │
│     • movies: 500 pages (~10.000 phim)                │
│     • TV: 200 pages (~4.000 series)                   │
│     • Thời gian: 3-5 giờ (chạy background)           │
│  7. Build Elasticsearch indexes                       │
│  8. Train recommendation model                        │
└──────────────────────────────────────────────────────┘

Ngày 3: Smoke Test + Launch
┌──────────────────────────────────────────────────────┐
│  SMOKE TEST CHECKLIST:                                │
│                                                       │
│  □ Homepage loads in < 3s                             │
│  □ Search works (try 5 different queries)             │
│  □ Movie detail page loads with all sections          │
│  □ Trailer plays in modal                             │
│  □ Register new account                               │
│  □ Login with new account                             │
│  □ Rate a movie                                       │
│  □ Add movie to watchlist                             │
│  □ Write a comment                                    │
│  □ Admin login → dashboard shows stats               │
│  □ Admin create movie → appears on site              │
│  □ Mobile responsive check                            │
│  □ Lighthouse audit pass                              │
│  □ SSL certificate valid (https://...)                │
│  □ Monitoring dashboard shows data                    │
│                                                       │
│  Nếu tất cả ✅ → v1.0.0 RELEASED 🎉                 │
└──────────────────────────────────────────────────────┘
```

### Quy trình vận hành hàng ngày

```
┌──────────────────────────────────────────────────────┐
│  DAILY OPERATIONS                                     │
│                                                       │
│  Tự động (cron):                                      │
│  • 01:00 — Database backup (pg_dump → S3)             │
│  • 03:00 — TMDB daily sync                            │
│  • */1h  — Trending refresh                           │
│  • 04:00 — Recommendation model retrain (weekly)      │
│  • 02:00 — Elasticsearch full re-index (weekly)       │
│  • 00:00 — Log rotation                               │
│  • 06:00 — SSL certificate check                      │
│                                                       │
│  Thủ công (khi cần):                                  │
│  • Check Grafana dashboard cho anomalies              │
│  • Review error logs trong Kibana                     │
│  • Moderate reported comments (admin panel)           │
│  • Import phim mới theo yêu cầu                       │
│  • Update dependencies (monthly)                      │
│  • Database vacuum/analyze (monthly)                  │
└──────────────────────────────────────────────────────┘
```

---

## 9. Dependency Graph

```
WP-0.1 (Repo)
  │
  ├── WP-0.2 (DB Schema)
  │     │
  │     ├── WP-0.3 (Seed) ──────────────────────────────────────┐
  │     │                                                        │
  │     ├── WP-1.1 (Auth) ◄── WP-0.4 (TMDB Key)               │
  │     │     │                                                  │
  │     │     ├── WP-1.2 (Movie)                                │
  │     │     │     │                                            │
  │     │     │     ├── WP-1.3 (TV Series)                      │
  │     │     │     │                                            │
  │     │     │     ├── WP-1.5 (Rating & Comment)               │
  │     │     │     │                                            │
  │     │     │     ├── WP-1.7 (Search/ES)                      │
  │     │     │     │     │                                      │
  │     │     │     │     └── WP-2.4 (Search UI)                │
  │     │     │     │                                            │
  │     │     │     ├── WP-1.8 (Trending)                       │
  │     │     │     │     │                                      │
  │     │     │     │     └── WP-2.2 (Trang chủ)               │
  │     │     │     │                                            │
  │     │     │     └── WP-1.9 (TMDB Client)                    │
  │     │     │           │                                      │
  │     │     │           └── WP-1.10 (TMDB Sync) ◄─────────────┘
  │     │     │                 │
  │     │     │                 └── WP-2.6 (TMDB Import UI)
  │     │     │
  │     │     ├── WP-1.6 (User Module)
  │     │     │
  │     │     └── WP-2.5 (Auth UI)
  │     │
  │     └── WP-1.4 (Person)
  │
  └── WP-2.1 (Layout & Components)
        │
        ├── WP-2.2 (Trang chủ)
        ├── WP-2.3 (Chi tiết phim)
        ├── WP-2.4 (Tìm kiếm)
        └── WP-2.5 (Auth UI)

WP-3.1 (Admin Dashboard) ◄── Pha 1 hoàn tất
WP-3.2 (Recommendation)  ◄── WP-0.3, WP-1.5
WP-3.3 (Notifications)   ◄── Pha 2 hoàn tất

WP-4.1 (CI/CD)           ◄── Pha 2 hoàn tất
WP-4.2 (Monitoring)      ◄── Pha 3 hoàn tất
WP-4.3 (Security)        ◄── Pha 3 hoàn tất
WP-4.4 (SEO/Perf)        ◄── Pha 3 hoàn tất
```

---

## 10. Checklist tổng hợp

```
PROGRESS TRACKER — Đánh dấu ✅ khi hoàn thành mỗi WP

Pha 0: Khởi tạo
  □ WP-0.1  Repo + Docker
  □ WP-0.2  Database Schema
  □ WP-0.3  Seed Data
  □ WP-0.4  TMDB API Key
  ──── Checkpoint: v0.1.0 ────

Pha 1: Backend Core
  □ WP-1.1  Auth Module
  □ WP-1.2  Movie Module
  □ WP-1.3  TV Series Module
  □ WP-1.4  Person Module
  □ WP-1.5  Rating & Comment
  □ WP-1.6  User Module
  □ WP-1.7  Search (Elasticsearch)
  □ WP-1.8  Trending & Genre
  □ WP-1.9  TMDB Client
  □ WP-1.10 TMDB Sync Service
  ──── Checkpoint: v0.2.0 ────

Pha 2: Frontend Core
  □ WP-2.1  Layout & Components
  □ WP-2.2  Trang chủ
  □ WP-2.3  Chi tiết phim
  □ WP-2.4  Tìm kiếm & Discover
  □ WP-2.5  Auth UI
  ──── Checkpoint: v0.3.0 ────

Pha 3: Nâng cao
  □ WP-3.1  Admin Dashboard
  □ WP-3.2  Recommendation Service
  □ WP-3.3  Notifications (optional)
  □ WP-2.6  TMDB Import UI
  □ TMDB Full Import (10.000 phim)
  ──── Checkpoint: v0.4.0 ────

Pha 4: Production
  □ WP-4.1  CI/CD Pipeline
  □ WP-4.2  Monitoring & Logging
  □ WP-4.3  Security Hardening
  □ WP-4.4  SEO & Performance
  ──── Checkpoint: v1.0.0-rc1 ────

Pha 5: Go-live
  □ Server provisioning
  □ DNS + SSL
  □ Deploy production
  □ Data import
  □ Smoke test
  ──── RELEASE: v1.0.0 🎉 ────
```

---

## 11. Quy trình giao việc cho Agent

### 11.1. Flowchart giao việc

```
                    ┌─────────────┐
                    │  Bắt đầu    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Kiểm tra    │
                    │ Checklist:  │
                    │ WP nào tiếp?│
                    └──────┬──────┘
                           │
                    ┌──────▼──────────────┐
                    │ WP có dependency    │
                    │ chưa hoàn thành?    │
                    └──┬──────────────┬───┘
                       │ CÓ          │ KHÔNG
                       ▼              ▼
              ┌──────────────┐ ┌──────────────────┐
              │ Chọn WP khác │ │ Chuẩn bị prompt  │
              │ hoặc chờ     │ │                   │
              └──────────────┘ │ 1. Context files  │
                               │ 2. Spec (SRS/arch)│
                               │ 3. Output format  │
                               │ 4. Test criteria  │
                               └────────┬──────────┘
                                        │
                               ┌────────▼──────────┐
                               │  Gửi prompt cho   │
                               │  Agent             │
                               └────────┬──────────┘
                                        │
                               ┌────────▼──────────┐
                               │  Nhận code từ     │
                               │  Agent             │
                               └────────┬──────────┘
                                        │
                               ┌────────▼──────────┐
                               │  REVIEW            │
                               │                    │
                               │  □ Build pass?     │
                               │  □ Tests pass?     │
                               │  □ Lint clean?     │
                               │  □ Manual test?    │
                               │  □ Meets spec?     │
                               └──┬─────────────┬──┘
                                  │ FAIL        │ PASS
                                  ▼              ▼
                         ┌──────────────┐ ┌──────────────┐
                         │ Gửi feedback │ │   Commit     │
                         │ cho Agent    │ │   Push       │
                         │ (lỗi cụ thể)│ │   Cập nhật   │
                         │              │ │   checklist  │
                         └──────┬───────┘ └──────┬───────┘
                                │                 │
                                ▼                 │
                         ┌──────────────┐         │
                         │ Agent fix    │         │
                         │ + gửi lại   │         │
                         └──────┬───────┘         │
                                │                 │
                                └─── quay lại ────┘
                                     REVIEW
```

### 11.2. Template tổng hợp để giao việc

```markdown
## Yêu cầu: [WP-X.X] Tên work package

### Bối cảnh dự án
CineDB là hệ thống cơ sở dữ liệu phim trực tuyến (tương tự TMDB).
Tech stack: NestJS (backend), Next.js (frontend), PostgreSQL, Redis, Elasticsearch.

### Tài liệu tham chiếu
- [Paste phần liên quan từ architecture.md]
- [Paste phần liên quan từ SRS nếu cần]

### Code hiện tại
- [Paste/attach các file context cần thiết]
- [Hoặc: "Xem cấu trúc project đính kèm"]

### Yêu cầu cụ thể
[Paste prompt từ implementation-roadmap.md]

### Quy ước cần tuân thủ
- TypeScript strict mode, không dùng `any`
- Naming: camelCase cho variables/functions, PascalCase cho classes/types
- Mỗi endpoint có Swagger decorator
- Mỗi service method có unit test
- Error handling dùng NestJS HttpException
- Cache pattern: kiểm tra Redis trước, miss thì query DB, set cache sau
- Response format: { data, meta: { page, limit, total } } cho paginated

### Output mong đợi
- Danh sách files tạo mới
- Danh sách files chỉnh sửa
- Hướng dẫn test thủ công (curl commands)
- Bất kỳ thay đổi env cần thêm

### Tiêu chí hoàn thành
[Paste checklist từ roadmap]
```

---

## 12. Xử lý sự cố

### 12.1. Sự cố thường gặp và cách xử lý

```
┌─────────────────────────────────────────────────────────────────┐
│  SỰ CỐ                        │  XỬ LÝ                        │
├────────────────────────────────┼────────────────────────────────┤
│                                │                                │
│  Agent tạo code không build    │  Gửi lại kèm error log.       │
│  được                          │  Kèm tsconfig.json và         │
│                                │  package.json để agent fix.    │
│                                │                                │
│  Agent không giữ convention    │  Attach 1 module mẫu đã       │
│  nhất quán                     │  approved, yêu cầu "follow    │
│                                │  exact same patterns".         │
│                                │                                │
│  Prisma migration conflict     │  Reset: npx prisma migrate     │
│                                │  reset --force (dev only!)     │
│                                │                                │
│  Elasticsearch không connect   │  Kiểm tra docker compose,      │
│                                │  ES cần 1-2 phút để start.    │
│                                │  Kiểm tra memory (ES cần 2GB+)│
│                                │                                │
│  TMDB API 429 (rate limit)     │  Giảm TMDB_RATE_LIMIT xuống   │
│                                │  2-3 req/s. Thêm retry logic. │
│                                │                                │
│  Redis out of memory           │  Set maxmemory policy:         │
│                                │  allkeys-lru trong redis.conf  │
│                                │                                │
│  Frontend hydration mismatch   │  Kiểm tra SSR data fetch.      │
│                                │  Đảm bảo server & client       │
│                                │  render cùng data.             │
│                                │                                │
│  JWT token bị reject sau       │  Kiểm tra JWT_ACCESS_SECRET    │
│  restart server                │  có giống nhau giữa các        │
│                                │  lần restart không. Phải       │
│                                │  set cố định trong .env.       │
│                                │                                │
│  Agent tạo quá nhiều files     │  Yêu cầu "tạo đúng X files    │
│  không cần thiết               │  sau: [liệt kê]". Cụ thể      │
│                                │  hơn = output tốt hơn.         │
│                                │                                │
│  Test coverage thấp            │  Yêu cầu agent viết test       │
│                                │  riêng trong prompt riêng      │
│                                │  (tách WP thành 2 bước).       │
└────────────────────────────────┴────────────────────────────────┘
```

### 12.2. Rollback procedure

```
Nếu deploy production gặp sự cố:

1. NGAY LẬP TỨC:
   docker compose -f docker-compose.prod.yml down
   git checkout v{previous-tag}
   docker compose -f docker-compose.prod.yml up -d

2. NẾU DATABASE ĐÃ MIGRATE:
   Restore từ backup gần nhất:
   pg_restore -d cinedb /backups/cinedb-YYYY-MM-DD.dump

3. NẾU ELASTICSEARCH BỊ CORRUPT:
   Xóa index + re-index:
   curl -X DELETE localhost:9200/movies
   npm run elasticsearch:reindex

4. SAU KHI ỔN ĐỊNH:
   • Phân tích root cause
   • Fix trên develop branch
   • Test kỹ trên staging
   • Deploy lại
```

---

## Lời kết

Tài liệu này cung cấp workflow hoàn chỉnh từ A-Z cho dự án CineDB. Khi thực hiện, hãy tuân thủ nguyên tắc tuần tự, kiểm tra checkpoint sau mỗi pha, và không bỏ qua bước review. Chúc dự án thành công.
