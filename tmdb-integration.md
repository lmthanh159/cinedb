# Module Tích hợp TMDB API — Đặc tả bổ sung

> **Bổ sung cho:** architecture.md & implementation-roadmap.md  
> **Lý do:** Hệ thống CineDB cần nguồn dữ liệu phim thực tế. Thay vì nhập thủ công, tích hợp TMDB API (https://api.themoviedb.org/3) để import và đồng bộ dữ liệu tự động.

---

## 1. Tổng quan tích hợp

### 1.1. TMDB API là gì?

TMDB (TheMovieDB) cung cấp REST API miễn phí với hơn 900.000 phim, 150.000 phim bộ, và hàng triệu thông tin diễn viên. API key miễn phí cho dự án phi thương mại, rate limit 40 requests/10 giây.

### 1.2. Phạm vi tích hợp

```
TMDB API ──────────────────────────────────────▶ CineDB Backend
                                                      │
  Dữ liệu lấy từ TMDB:                               │
  ✅ Phim (movies): thông tin, cast, crew,            │
     trailers, images, keywords                        │
  ✅ Phim bộ (TV): series, seasons, episodes           │
  ✅ Người (people): bio, filmography                  │
  ✅ Thể loại (genres)                                 ├──▶ PostgreSQL
  ✅ Quốc gia, ngôn ngữ                               │
  ✅ Hình ảnh (poster, backdrop URLs)                  │
  ✅ Trailers (YouTube keys)                           │
  ✅ Trending, popular, now playing                    │
                                                      │
  Dữ liệu KHÔNG lấy từ TMDB (tự quản lý):            │
  ❌ User accounts                                     │
  ❌ Ratings (CineDB có hệ thống rating riêng)        │
  ❌ Comments                                          │
  ❌ Watchlist, Favorites                              │
  ❌ Recommendations (tự tính)                         │
```

### 1.3. Chiến lược dữ liệu: Hybrid

```
┌─────────────────────────────────────────────────────────────┐
│                    CHIẾN LƯỢC DỮ LIỆU                       │
│                                                              │
│  Lớp 1: TMDB làm nguồn chính (source of truth)             │
│  ─────────────────────────────────────────────               │
│  • Thông tin phim, diễn viên, thể loại, media               │
│  • Import ban đầu + đồng bộ định kỳ                         │
│  • CineDB lưu bản copy trong PostgreSQL                      │
│  • Giữ tmdb_id làm foreign key để mapping                    │
│                                                              │
│  Lớp 2: CineDB làm nguồn chính                              │
│  ─────────────────────────────────────────────               │
│  • User data, ratings, comments, watchlist, favorites        │
│  • Recommendation scores                                     │
│  • Admin overrides (admin có thể sửa thông tin phim          │
│    đã import, bản sửa được ưu tiên hơn TMDB)                │
│                                                              │
│  Lớp 3: Fallback API (real-time)                             │
│  ─────────────────────────────────────────────               │
│  • Nếu phim chưa có trong DB → proxy request đến TMDB       │
│  • Tự động import vào DB khi được truy vấn lần đầu          │
│  • User không cần biết dữ liệu đến từ đâu                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Kiến trúc tích hợp

### 2.1. Vị trí trong hệ thống

```
                    ┌────────────────────┐
                    │     TMDB API       │
                    │ api.themoviedb.org  │
                    └────────┬───────────┘
                             │
                    ┌────────▼───────────┐
                    │   TMDB Module      │
                    │   (NestJS)         │
                    │                    │
                    │ ┌────────────────┐ │
                    │ │ TmdbClient     │ │  ← HTTP client gọi TMDB API
                    │ │ (axios + cache)│ │
                    │ └───────┬────────┘ │
                    │         │          │
                    │ ┌───────▼────────┐ │
                    │ │ TmdbMapper     │ │  ← Transform TMDB response → CineDB entities
                    │ │                │ │
                    │ └───────┬────────┘ │
                    │         │          │
                    │ ┌───────▼────────┐ │
                    │ │ TmdbSync       │ │  ← Import & sync logic
                    │ │ Service        │ │
                    │ └───────┬────────┘ │
                    │         │          │
                    │ ┌───────▼────────┐ │
                    │ │ TmdbScheduler  │ │  ← Cron jobs cho sync định kỳ
                    │ │                │ │
                    │ └────────────────┘ │
                    └────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        PostgreSQL        Redis       Elasticsearch
        (lưu data)     (cache TMDB    (re-index
                        responses)     sau sync)
```

### 2.2. Luồng dữ liệu chi tiết

#### Luồng 1: Import ban đầu (Bootstrap)

```
Admin trigger "Full Import"
      │
      ▼
TmdbSyncService.fullImport()
      │
      ├── 1. GET /genre/movie/list → import tất cả genres
      ├── 2. GET /genre/tv/list → import TV genres
      │
      ├── 3. Loop pages 1-500 (hoặc configurable):
      │      GET /movie/popular?page=N
      │      │
      │      ├── Foreach movie in results:
      │      │     GET /movie/{tmdb_id}?append=credits,videos,images,keywords
      │      │     │
      │      │     ├── TmdbMapper.toMovie(tmdbData) → Movie entity
      │      │     ├── TmdbMapper.toPeople(credits) → Person entities
      │      │     ├── TmdbMapper.toTrailers(videos) → Trailer entities
      │      │     ├── TmdbMapper.toImages(images) → Image entities
      │      │     │
      │      │     └── Upsert all to PostgreSQL (ON CONFLICT tmdb_id DO UPDATE)
      │      │
      │      ├── Rate limit: sleep 250ms giữa mỗi request (4 req/s)
      │      └── Progress: log "Imported page N/500, X movies total"
      │
      ├── 4. Tương tự cho TV series (pages 1-100)
      │
      ├── 5. Re-index Elasticsearch
      │
      └── 6. Log completion summary
```

#### Luồng 2: Đồng bộ định kỳ (Daily Sync)

```
Cron: mỗi ngày lúc 3:00 AM
      │
      ▼
TmdbSyncService.dailySync()
      │
      ├── 1. GET /movie/changes?start_date=yesterday&end_date=today
      │      → Danh sách tmdb_id đã thay đổi
      │
      ├── 2. Foreach changed movie:
      │      │
      │      ├── Movie tồn tại trong CineDB DB?
      │      │     ├── YES → fetch chi tiết → update (chỉ fields không bị admin override)
      │      │     └── NO → skip (chỉ sync phim đã import)
      │      │
      │      └── Rate limit: sleep 250ms
      │
      ├── 3. Tương tự cho /tv/changes
      │
      ├── 4. GET /movie/now_playing → cập nhật danh sách đang chiếu
      │      GET /movie/upcoming → cập nhật danh sách sắp ra mắt
      │
      ├── 5. Incremental re-index Elasticsearch (chỉ changed IDs)
      │
      └── 6. Log sync summary (X updated, Y new, Z errors)
```

#### Luồng 3: On-demand Fetch (Real-time Proxy)

```
User tìm kiếm "Oppenheimer"
      │
      ▼
SearchService.search("Oppenheimer")
      │
      ├── 1. Query Elasticsearch/PostgreSQL
      │      │
      │      ├── Found → return results
      │      │
      │      └── Not found hoặc kết quả ít (< 3)
      │            │
      │            ▼
      │      2. TmdbClient.searchMovie("Oppenheimer")
      │            │
      │            ├── TMDB trả kết quả
      │            │
      │            ├── 3. Auto-import top 5 kết quả vào DB
      │            │      (background job, không block response)
      │            │
      │            └── 4. Merge TMDB results với DB results
      │                   → Return combined results to user
      │
      ▼
User click vào phim chưa có trong DB
      │
      ▼
MovieService.getById(id)  → not found in DB
      │
      ▼
TmdbSyncService.importSingleMovie(tmdb_id)
      │
      ├── GET /movie/{tmdb_id}?append=credits,videos,images
      ├── Map + Save to DB
      ├── Index to Elasticsearch
      └── Return movie to user (seamless experience)
```

---

## 3. Cấu trúc code chi tiết

### 3.1. Cấu trúc thư mục

```
backend/src/tmdb/
├── tmdb.module.ts              # NestJS module definition
├── tmdb.controller.ts          # Admin endpoints cho import/sync
├── tmdb-client.service.ts      # HTTP client gọi TMDB API
├── tmdb-mapper.service.ts      # Transform TMDB → CineDB entities
├── tmdb-sync.service.ts        # Import & sync orchestration
├── tmdb-scheduler.service.ts   # Cron jobs
├── tmdb.config.ts              # Config (API key, base URL, rate limits)
├── dto/
│   ├── tmdb-movie.dto.ts       # TMDB API response types
│   ├── tmdb-tv.dto.ts
│   ├── tmdb-person.dto.ts
│   ├── import-options.dto.ts   # Options cho admin import
│   └── sync-result.dto.ts      # Kết quả sync
├── interfaces/
│   ├── tmdb-api.interface.ts   # TMDB API response interfaces
│   └── sync-status.interface.ts
└── __tests__/
    ├── tmdb-client.spec.ts
    ├── tmdb-mapper.spec.ts
    └── tmdb-sync.spec.ts
```

### 3.2. Database Schema bổ sung

```prisma
// Thêm vào schema.prisma

model Movie {
  // ... existing fields ...

  // TMDB integration fields
  tmdb_id          Int?       @unique    // TMDB movie ID
  tmdb_last_synced DateTime?             // Lần sync cuối từ TMDB
  is_admin_edited  Boolean    @default(false)  // Admin đã sửa thủ công?

  // Nếu is_admin_edited = true, daily sync sẽ KHÔNG ghi đè
  // các field đã được admin sửa
}

model TVSeries {
  // ... existing fields ...
  tmdb_id          Int?       @unique
  tmdb_last_synced DateTime?
  is_admin_edited  Boolean    @default(false)
}

model Person {
  // ... existing fields ...
  tmdb_id          Int?       @unique
  tmdb_last_synced DateTime?
}

model Genre {
  // ... existing fields ...
  tmdb_id          Int?       @unique
}

// Bảng tracking sync status
model TmdbSyncLog {
  id             Int       @id @default(autoincrement())
  sync_type      String    // "full_import", "daily_sync", "on_demand"
  entity_type    String    // "movie", "tv", "person"
  total_processed Int
  total_created   Int
  total_updated   Int
  total_errors    Int
  error_details   Json?
  started_at      DateTime
  completed_at    DateTime?
  status          String    // "running", "completed", "failed"
  created_at      DateTime  @default(now())
}
```

### 3.3. TMDB Client Service

```typescript
// tmdb-client.service.ts — Pseudo-code / specification

@Injectable()
export class TmdbClientService {
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly apiKey: string;       // Từ env: TMDB_API_KEY
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p/';

  // Rate limiter: tối đa 4 requests/giây (TMDB limit = 40/10s)
  private rateLimiter: Bottleneck;

  // === MOVIES ===

  async getMovie(tmdbId: number): Promise<TmdbMovieDetail> {
    // GET /movie/{id}?append_to_response=credits,videos,images,keywords
    // &language=vi-VN  (nếu muốn tiếng Việt)
  }

  async getPopularMovies(page: number): Promise<TmdbPaginatedResponse<TmdbMovie>> {
    // GET /movie/popular?page={page}
  }

  async getNowPlayingMovies(page: number): Promise<...> {
    // GET /movie/now_playing?page={page}
  }

  async getUpcomingMovies(page: number): Promise<...> {
    // GET /movie/upcoming?page={page}
  }

  async getTopRatedMovies(page: number): Promise<...> {
    // GET /movie/top_rated?page={page}
  }

  async searchMovies(query: string, page: number): Promise<...> {
    // GET /search/movie?query={query}&page={page}
  }

  async getMovieChanges(startDate: string, endDate: string): Promise<...> {
    // GET /movie/changes?start_date={}&end_date={}
  }

  // === TV ===

  async getTVSeries(tmdbId: number): Promise<TmdbTVDetail> {
    // GET /tv/{id}?append_to_response=credits,videos,images
  }

  async getTVSeason(seriesId: number, seasonNumber: number): Promise<...> {
    // GET /tv/{id}/season/{season_number}
  }

  // === PEOPLE ===

  async getPerson(tmdbId: number): Promise<TmdbPersonDetail> {
    // GET /person/{id}?append_to_response=movie_credits,tv_credits,images
  }

  // === GENRES ===

  async getMovieGenres(): Promise<TmdbGenre[]> {
    // GET /genre/movie/list
  }

  async getTVGenres(): Promise<TmdbGenre[]> {
    // GET /genre/tv/list
  }

  // === TRENDING ===

  async getTrending(mediaType: 'movie' | 'tv' | 'all', timeWindow: 'day' | 'week'): Promise<...> {
    // GET /trending/{media_type}/{time_window}
  }

  // === HELPERS ===

  getImageUrl(path: string, size: 'w92' | 'w185' | 'w500' | 'w780' | 'original'): string {
    // return `${imageBaseUrl}${size}${path}`
    // Ví dụ: https://image.tmdb.org/t/p/w500/abc123.jpg
  }
}
```

### 3.4. TMDB Mapper Service

```typescript
// tmdb-mapper.service.ts — Specification

@Injectable()
export class TmdbMapperService {

  /**
   * Chuyển TMDB movie response → CineDB Movie entity
   * Mapping rules:
   *   tmdb.id           → movie.tmdb_id
   *   tmdb.title         → movie.title
   *   tmdb.original_title → movie.original_title
   *   tmdb.overview      → movie.overview
   *   tmdb.release_date  → movie.release_date (parse to Date)
   *   tmdb.runtime       → movie.runtime
   *   tmdb.original_language → movie.language
   *   tmdb.budget        → movie.budget
   *   tmdb.revenue       → movie.revenue
   *   tmdb.status        → movie.status
   *   tmdb.vote_average  → movie.vote_average (TMDB score, NOT CineDB user score)
   *   tmdb.vote_count    → movie.tmdb_vote_count (giữ riêng, không trộn với CineDB ratings)
   *   tmdb.popularity    → movie.popularity
   *   tmdb.poster_path   → movie.poster_url (prepend image base URL, size w500)
   *   tmdb.backdrop_path → movie.backdrop_url (prepend image base URL, size w1280)
   *   tmdb.genre_ids     → movie.genres (lookup from genres table)
   */
  toMovie(tmdbData: TmdbMovieDetail): Prisma.MovieCreateInput { ... }

  /**
   * Chuyển TMDB credits → CineDB Person + MovieCast/MovieCrew
   * Cast: lấy top 20 (order by tmdb.order)
   * Crew: lấy Director, Writer, Producer, Composer
   */
  toCastAndCrew(credits: TmdbCredits): {
    people: Prisma.PersonCreateInput[];
    cast: Prisma.MovieCastCreateInput[];
    crew: Prisma.MovieCrewCreateInput[];
  } { ... }

  /**
   * Chuyển TMDB videos → CineDB Trailer entities
   * Chỉ lấy type: "Trailer" hoặc "Teaser", site: "YouTube"
   */
  toTrailers(videos: TmdbVideos): Prisma.TrailerCreateInput[] { ... }

  /**
   * Chuyển TMDB images → CineDB Image entities
   * Lấy top 10 posters + top 10 backdrops (sort by vote_average)
   */
  toImages(images: TmdbImages): Prisma.ImageCreateInput[] { ... }

  /**
   * Tương tự cho TV Series, Season, Episode, Person
   */
  toTVSeries(tmdbData: TmdbTVDetail): Prisma.TVSeriesCreateInput { ... }
  toSeason(tmdbData: TmdbSeasonDetail): Prisma.SeasonCreateInput { ... }
  toEpisode(tmdbData: TmdbEpisodeDetail): Prisma.EpisodeCreateInput { ... }
  toPerson(tmdbData: TmdbPersonDetail): Prisma.PersonCreateInput { ... }
}
```

### 3.5. Sync Service

```typescript
// tmdb-sync.service.ts — Specification

@Injectable()
export class TmdbSyncService {

  /**
   * Import ban đầu — chạy 1 lần khi setup hệ thống
   * Thời gian ước tính: 2-4 giờ (tùy số lượng pages)
   */
  async fullImport(options: {
    moviePages: number;    // default: 100 (= ~2000 phim)
    tvPages: number;       // default: 50 (= ~1000 series)
    importPeople: boolean; // default: true
  }): Promise<SyncResult> {
    // 1. Import genres
    // 2. Loop movie pages → import each movie + credits + media
    // 3. Loop TV pages → import each series + seasons + episodes
    // 4. Re-index Elasticsearch
    // 5. Log to TmdbSyncLog
  }

  /**
   * Đồng bộ hàng ngày — chỉ cập nhật phim đã thay đổi
   * Thời gian ước tính: 5-15 phút
   */
  async dailySync(): Promise<SyncResult> {
    // 1. GET /movie/changes → list of changed tmdb_ids
    // 2. Filter: chỉ lấy ids đã tồn tại trong DB
    // 3. Fetch và update từng phim (skip nếu is_admin_edited = true)
    // 4. Tương tự cho TV changes
    // 5. Sync now_playing và upcoming lists
    // 6. Incremental Elasticsearch re-index
  }

  /**
   * Import một phim đơn lẻ — dùng cho on-demand fetch
   * Thời gian: < 2 giây
   */
  async importSingleMovie(tmdbId: number): Promise<Movie> {
    // 1. Check DB: đã tồn tại? → return existing
    // 2. Fetch from TMDB
    // 3. Map + Save to DB
    // 4. Index to Elasticsearch
    // 5. Return movie
  }

  /**
   * Import một TV series đơn lẻ (bao gồm all seasons + episodes)
   */
  async importSingleTVSeries(tmdbId: number): Promise<TVSeries> { ... }

  /**
   * Sync trending lists — dùng cho trang chủ
   * Cache trong Redis (TTL 1h)
   */
  async syncTrending(): Promise<void> {
    // 1. GET /trending/movie/day → cache as trending:movie:day
    // 2. GET /trending/movie/week → cache as trending:movie:week
    // 3. GET /trending/tv/day → cache
    // 4. Auto-import phim trending chưa có trong DB
  }
}
```

### 3.6. Admin Endpoints

```typescript
// tmdb.controller.ts

@Controller('api/v1/admin/tmdb')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class TmdbController {

  // Trigger full import (chạy background)
  @Post('import/full')
  async fullImport(@Body() options: ImportOptionsDto): Promise<{ jobId: string }> {
    // Chạy async (background job), trả về jobId để track progress
  }

  // Import một phim theo TMDB ID
  @Post('import/movie/:tmdbId')
  async importMovie(@Param('tmdbId') tmdbId: number): Promise<Movie> { ... }

  // Import một TV series theo TMDB ID
  @Post('import/tv/:tmdbId')
  async importTV(@Param('tmdbId') tmdbId: number): Promise<TVSeries> { ... }

  // Tìm phim trên TMDB (để admin chọn import)
  @Get('search/movie')
  async searchTmdb(@Query('query') query: string): Promise<TmdbSearchResult[]> { ... }

  // Tìm TV trên TMDB
  @Get('search/tv')
  async searchTmdbTV(@Query('query') query: string): Promise<TmdbSearchResult[]> { ... }

  // Trigger daily sync thủ công
  @Post('sync/daily')
  async triggerDailySync(): Promise<{ jobId: string }> { ... }

  // Xem lịch sử sync
  @Get('sync/logs')
  async getSyncLogs(@Query() query: PaginationDto): Promise<PaginatedResponse<TmdbSyncLog>> { ... }

  // Xem trạng thái sync đang chạy
  @Get('sync/status')
  async getSyncStatus(): Promise<SyncStatus> { ... }
}
```

---

## 4. Biến môi trường bổ sung

```env
# .env — Thêm vào

# TMDB API
TMDB_API_KEY=your_tmdb_api_key_here        # Lấy từ https://www.themoviedb.org/settings/api
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/
TMDB_RATE_LIMIT=4                          # Requests per second (max 40/10s)
TMDB_DEFAULT_LANGUAGE=vi-VN                # Ngôn ngữ mặc định cho response
TMDB_FALLBACK_LANGUAGE=en-US               # Fallback nếu không có tiếng Việt

# Sync schedule
TMDB_DAILY_SYNC_CRON=0 3 * * *             # 3:00 AM hàng ngày
TMDB_TRENDING_SYNC_CRON=0 */1 * * *        # Mỗi giờ
TMDB_ENABLE_ON_DEMAND_FETCH=true           # Auto-import khi user truy vấn phim chưa có
```

---

## 5. Xử lý đặc biệt

### 5.1. Tách biệt Rating TMDB vs CineDB

```
Mỗi phim có 2 nguồn đánh giá:

┌──────────────────────────────────────────────────────────────┐
│ Movie                                                        │
│                                                              │
│  tmdb_vote_average: 8.2    ← Điểm từ TMDB (tham khảo)      │
│  tmdb_vote_count:   15420  ← Số lượt đánh giá TMDB          │
│                                                              │
│  vote_average: 7.8         ← Điểm từ users CineDB           │
│  vote_count:   42          ← Số lượt đánh giá CineDB        │
│                                                              │
│  Frontend hiển thị:                                          │
│  • CineDB score (nổi bật, primary)                           │
│  • TMDB score (nhỏ hơn, secondary, label "TMDB")            │
│  • Nếu CineDB chưa có đánh giá → hiển thị TMDB score       │
└──────────────────────────────────────────────────────────────┘
```

### 5.2. Admin Override Protection

```
Khi admin sửa thông tin phim đã import từ TMDB:

1. Set is_admin_edited = true
2. Lưu danh sách fields đã sửa vào admin_edited_fields (JSON array)
   Ví dụ: ["title", "overview"]
3. Daily sync sẽ:
   - Vẫn cập nhật các fields KHÔNG nằm trong admin_edited_fields
   - SKIP các fields đã bị admin sửa
   - Ví dụ: TMDB cập nhật runtime mới → sync, nhưng title admin đã sửa → giữ nguyên
4. Admin có thể "Reset to TMDB" → xóa override, sync lại từ TMDB
```

### 5.3. Xử lý hình ảnh

```
TMDB trả về image path (ví dụ: "/abc123.jpg")
CineDB cần URL đầy đủ.

Có 2 chiến lược:

Chiến lược A: Direct link (đơn giản, khuyến nghị cho MVP)
─────────────────────────────────────────────────────────
  poster_url = "https://image.tmdb.org/t/p/w500/abc123.jpg"
  backdrop_url = "https://image.tmdb.org/t/p/w1280/abc123.jpg"

  Ưu: Không tốn storage, TMDB CDN nhanh
  Nhược: Phụ thuộc TMDB uptime, TMDB có thể thay đổi URL

Chiến lược B: Mirror to S3 (production-ready)
─────────────────────────────────────────────────────────
  1. Download image từ TMDB
  2. Resize: poster (w500, w185, w92), backdrop (w1280, w780)
  3. Upload lên S3
  4. Lưu S3 URL vào DB

  Ưu: Không phụ thuộc TMDB, kiểm soát hoàn toàn
  Nhược: Tốn storage + bandwidth, cần job mirror
```

### 5.4. Xử lý ngôn ngữ

```
TMDB hỗ trợ đa ngôn ngữ. CineDB request với language=vi-VN:

1. Nếu TMDB có bản dịch tiếng Việt → dùng
2. Nếu không → fallback sang en-US
3. Lưu cả 2 version:
   - title (tiếng Việt nếu có, hoặc English)
   - original_title (luôn là tên gốc)
4. Frontend hiển thị title, hover/subtitle hiển thị original_title
```

---

## 6. Work Packages bổ sung cho Roadmap

### WP-0.4: Đăng ký TMDB API Key & Config

**Thời gian:** 30 phút

**Steps:**
1. Đăng ký tài khoản tại https://www.themoviedb.org/signup
2. Vào Settings → API → Request API Key (chọn Developer)
3. Điền thông tin ứng dụng (tên: CineDB, mục đích: Educational/Personal)
4. Nhận API Key (v3 auth)
5. Thêm vào `.env`: `TMDB_API_KEY=xxx`
6. Test: `curl "https://api.themoviedb.org/3/movie/550?api_key=xxx"` → phải trả về thông tin phim Fight Club

---

### WP-1.9: TMDB Client Module

**Dependency:** WP-0.1, WP-0.4  
**Thời gian:** 2 ngày

**Prompt cho agent:**

> Xây dựng TMDB Client Module cho NestJS:
>
> 1. `TmdbClientService`: HTTP client dùng axios, gọi TMDB API v3 với api_key từ env. Tích hợp rate limiter (bottleneck, 4 req/s). Tất cả response được cache trong Redis (TTL 1h, key pattern `tmdb:{endpoint}:{params_hash}`).
>
> 2. Implement các method: getMovie, getPopularMovies, getNowPlayingMovies, getUpcomingMovies, getTopRatedMovies, searchMovies, getMovieChanges, getTVSeries, getTVSeason, getPerson, getMovieGenres, getTVGenres, getTrending.
>
> 3. TypeScript interfaces cho tất cả TMDB API responses (tham khảo https://developer.themoviedb.org/reference).
>
> 4. Error handling: retry 3 lần với exponential backoff khi gặp 429 (rate limit) hoặc 5xx. Throw custom TmdbApiException cho các lỗi khác.
>
> 5. Unit test: mock axios, test rate limiting, test cache hit/miss, test error retry.

---

### WP-1.10: TMDB Mapper & Sync Service

**Dependency:** WP-1.9, WP-0.2  
**Thời gian:** 3 ngày

**Prompt cho agent:**

> Xây dựng TmdbMapper và TmdbSync services:
>
> 1. `TmdbMapperService`: Transform TMDB responses thành Prisma entities. Xử lý: image URL construction (prepend base URL + size), date parsing, genre mapping (TMDB genre_id → CineDB genre), null/undefined handling.
>
> 2. `TmdbSyncService`:
>    - `fullImport(options)`: Import hàng loạt từ TMDB. Dùng upsert (ON CONFLICT tmdb_id). Chạy async (Bull queue hoặc simple background process). Log progress vào TmdbSyncLog.
>    - `dailySync()`: Fetch changes API, update chỉ phim đã import, respect admin overrides.
>    - `importSingleMovie(tmdbId)`: Import 1 phim + credits + media.
>    - `syncTrending()`: Refresh trending cache.
>
> 3. `TmdbSchedulerService`: Cron jobs dùng `@nestjs/schedule`:
>    - Daily sync: 3:00 AM
>    - Trending refresh: mỗi giờ
>
> 4. Admin controller: endpoints cho trigger import, search TMDB, view sync logs.
>
> 5. Tích hợp on-demand fetch vào MovieService: khi getById không tìm thấy trong DB, tự động gọi importSingleMovie.
>
> 6. Sau mỗi lần import/sync, trigger Elasticsearch re-index cho các entities đã thay đổi.

---

### WP-2.6: Admin UI — TMDB Import

**Dependency:** WP-1.10, WP-3.1  
**Thời gian:** 1 ngày

**Prompt cho agent:**

> Thêm trang TMDB Import vào Admin Dashboard:
>
> 1. Tab "Import từ TMDB" trong sidebar admin
> 2. Search bar: tìm phim/TV trên TMDB (gọi admin API)
> 3. Kết quả hiển thị: poster, title, year, overview, nút "Import"
> 4. Click Import → gọi API → hiển thị thông báo thành công
> 5. Nút "Full Import": trigger full import với progress bar
> 6. Nút "Sync Now": trigger daily sync thủ công
> 7. Bảng Sync History: hiển thị TmdbSyncLog (status, counts, timestamps)

---

## 7. Bảng tổng hợp WP bổ sung

| Mã | Tên | Dependency | Thời gian | Ưu tiên |
|----|-----|-----------|-----------|---------|
| WP-0.4 | TMDB API Key & Config | — | 30 phút | Cao |
| WP-1.9 | TMDB Client Module | WP-0.1, WP-0.4 | 2 ngày | Cao |
| WP-1.10 | TMDB Mapper & Sync | WP-1.9, WP-0.2 | 3 ngày | Cao |
| WP-2.6 | Admin TMDB Import UI | WP-1.10, WP-3.1 | 1 ngày | Trung bình |

**Khuyến nghị thứ tự thực hiện:**
Chèn WP-0.4 vào đầu Pha 0, WP-1.9 và WP-1.10 vào sau WP-1.2 (Movie Module), WP-2.6 vào Pha 3 cùng Admin Dashboard. Sau khi WP-1.10 hoàn thành, chạy full import để có dữ liệu thực tế, thay thế hoàn toàn seed data tĩnh.
