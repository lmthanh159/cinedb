# Phase 1 — Backend Core

> **Thời gian:** 15 ngày  
> **Mục tiêu:** API hoàn chỉnh, test được bằng Swagger/Postman  
> **Dependency:** Phase 0 hoàn tất (v0.1.0)

---

## Quy ước chung cho tất cả WP trong Phase 1

### Context luôn kèm cho agent

Mỗi khi giao WP backend, **luôn attach** các file sau vào prompt:

```
1. prisma/schema.prisma        — Toàn bộ schema
2. src/app.module.ts            — Danh sách modules đã import
3. src/common/                  — Guards, decorators, filters, interceptors
4. src/[module-mẫu]/            — 1 module đã hoàn thành (từ WP trước) làm reference
5. .env                         — Biến môi trường đang dùng
```

### Pattern bắt buộc

```
Mỗi module phải tuân thủ:

1. Structure:
   src/[module]/
   ├── [module].module.ts
   ├── [module].controller.ts
   ├── [module].service.ts
   ├── dto/
   │   ├── create-[entity].dto.ts
   │   ├── update-[entity].dto.ts
   │   └── query-[entity].dto.ts
   ├── entities/ (nếu cần custom types ngoài Prisma)
   └── __tests__/
       └── [module].service.spec.ts

2. Controller: @ApiTags(), @ApiOperation() cho mỗi endpoint
3. DTOs: class-validator decorators (@IsString, @IsInt, @Min, @Max, etc.)
4. Service: inject PrismaService, RedisService (nếu cache)
5. Pagination: query params { page: number, limit: number }, response { data, meta: { page, limit, total, totalPages } }
6. Error codes: throw new HttpException({ statusCode, message, error }, HttpStatus.XXX)
7. Cache: GET endpoints cho entity detail → Redis cache (TTL tùy context)
8. Unit test: Jest, mock PrismaService, coverage ≥ 80% cho service
```

---

## WP-1.1: Auth Module

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 3 ngày |
| **Agent skill** | NestJS, JWT, Passport.js, bcrypt, OAuth2, Redis |
| **Dependency** | WP-0.3 (schema), WP-0.2 (project setup) |

### Prompt cho Agent

```
Bạn là một senior backend engineer chuyên về authentication. Xây dựng Auth Module hoàn chỉnh cho NestJS project CineDB.

## Prisma Schema (đã có)
[ATTACH: prisma/schema.prisma]

## Existing Code
[ATTACH: src/app.module.ts, src/common/guards/, src/common/decorators/]

## Yêu cầu

### 1. PrismaService (nếu chưa có)

Tạo src/prisma/prisma.module.ts và prisma.service.ts:
- Extend PrismaClient
- onModuleInit: $connect()
- enableShutdownHooks
- Global module (export PrismaService cho toàn app)

### 2. RedisService

Tạo src/redis/redis.module.ts và redis.service.ts:
- Dùng cache-manager-redis-yet
- Methods: get(key), set(key, value, ttl), del(key), delPattern(pattern)
- Config từ env: REDIS_HOST, REDIS_PORT
- Global module

### 3. Auth Module

#### Endpoints:

```
POST /api/v1/auth/register
  Body: { email, password, displayName }
  Response: { message: "Registration successful. Please verify your email." }
  Logic:
    - Validate: email format, password (min 8, hoa+thường+số+đặc biệt), displayName (2-100 chars)
    - Check email unique
    - Hash password (bcrypt, saltRounds=10)
    - Create user (status=UNVERIFIED)
    - Generate email verification token (JWT, 24h expiry, subject: email-verify)
    - TODO: send verification email (log token cho dev)
    - Return success message

POST /api/v1/auth/login
  Body: { email, password }
  Response: { accessToken, refreshToken, user: { id, email, displayName, role, avatarUrl } }
  Logic:
    - Find user by email
    - Check user status (UNVERIFIED → "Please verify your email", LOCKED → "Account locked, try after X minutes")
    - Check login attempts (from Redis key login_attempts:{email})
    - If attempts >= 5: lock account 30 minutes (set lockedUntil), return error
    - Compare password (bcrypt)
    - If wrong: increment attempts in Redis (TTL 30 min), return error
    - If correct: reset attempts, generate tokens, log activity
    - Access token: JWT { sub: userId, email, role }, expire 15m
    - Refresh token: random UUID, save to RefreshToken table, expire 7d
    - Return tokens + user info

POST /api/v1/auth/refresh
  Body: { refreshToken }
  Response: { accessToken }
  Logic:
    - Find refresh token in DB
    - Check not expired
    - Verify user still ACTIVE
    - Generate new access token
    - Return

POST /api/v1/auth/logout
  Headers: Authorization: Bearer {accessToken}
  Body: { refreshToken? }
  Response: { message: "Logged out successfully" }
  Logic:
    - Extract JTI from access token
    - Add to Redis blacklist: blacklist:token:{jti} (TTL = token remaining time)
    - If refreshToken provided: delete from DB
    - Log activity

POST /api/v1/auth/forgot-password
  Body: { email }
  Response: { message: "If email exists, a reset link has been sent." }
  Logic:
    - Find user (don't reveal if exists)
    - Generate reset token (JWT, 1h expiry, subject: password-reset)
    - TODO: send email (log token for dev)
    - Always return same message

POST /api/v1/auth/reset-password
  Body: { token, newPassword }
  Response: { message: "Password reset successful." }
  Logic:
    - Verify JWT token (subject must be password-reset)
    - Extract email from token
    - Hash new password
    - Update user password
    - Delete all refresh tokens for this user
    - Return success

GET /api/v1/auth/verify-email?token=xxx
  Response: { message: "Email verified successfully." }
  Logic:
    - Verify JWT token (subject must be email-verify)
    - Extract email
    - Update user: status=ACTIVE, emailVerified=true
    - Return success

GET /api/v1/auth/google
  → Redirect to Google OAuth consent screen

GET /api/v1/auth/google/callback
  → Google callback → find/create user → generate tokens → redirect to frontend with tokens
  Logic:
    - Extract Google profile (email, name, avatar, google ID)
    - Find user by oauthProvider='google' AND oauthId=googleId
    - If not found: find by email
    - If not found: create new user (status=ACTIVE, emailVerified=true, no password)
    - If found by email but different provider: link Google to existing account
    - Generate JWT tokens
    - Redirect to FRONTEND_URL/auth/callback?accessToken=xxx&refreshToken=xxx
```

#### Guards:

```typescript
// src/common/guards/jwt-auth.guard.ts
// Extend AuthGuard('jwt')
// Check Redis blacklist: if token JTI in blacklist → reject
// Extract user from token, attach to request

// src/common/guards/roles.guard.ts
// Read @Roles() decorator metadata
// Check request.user.role matches required roles
// If not → ForbiddenException

// Decorator usage:
@UseGuards(JwtAuthGuard)           // Just authenticate
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')                    // Authenticate + require ADMIN
```

#### JWT Strategy:

```typescript
// src/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
```

#### Google Strategy:

```typescript
// src/auth/strategies/google.strategy.ts
// Dùng passport-google-oauth20
// Profile fields: email, displayName, photo
// Scope: ['email', 'profile']
```

### 4. Tạo decorator @CurrentUser()

```typescript
// src/common/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (data) return request.user?.[data];
    return request.user;
  },
);
```

### 5. Rate Limiting cho auth endpoints

Dùng @nestjs/throttler:
- POST /auth/login: 30 requests / 60 seconds
- POST /auth/register: 10 requests / 60 seconds
- Các endpoint khác: global 100 / 60s

### 6. Unit Tests

Viết test cho AuthService:
- register: success, duplicate email, weak password
- login: success, wrong password, account locked, unverified
- login lockout: 5 attempts → lock
- refresh: success, expired token, invalid token
- logout: token blacklisted
- changePassword: success, wrong old password

Coverage target: ≥ 80% cho auth.service.ts

### 7. Swagger

- @ApiTags('Authentication')
- Mỗi endpoint có @ApiOperation, @ApiResponse (200, 400, 401, 403, 429)
- DTOs có @ApiProperty với example values

## Output mong đợi

Danh sách files:
- src/prisma/prisma.module.ts, prisma.service.ts
- src/redis/redis.module.ts, redis.service.ts
- src/auth/auth.module.ts
- src/auth/auth.controller.ts
- src/auth/auth.service.ts
- src/auth/strategies/jwt.strategy.ts
- src/auth/strategies/google.strategy.ts
- src/auth/dto/register.dto.ts, login.dto.ts, refresh-token.dto.ts, forgot-password.dto.ts, reset-password.dto.ts
- src/auth/__tests__/auth.service.spec.ts
- src/common/guards/jwt-auth.guard.ts (updated)
- src/common/guards/roles.guard.ts (updated)
- src/common/decorators/current-user.decorator.ts
- src/common/decorators/roles.decorator.ts
- Updated: src/app.module.ts

Test commands:
```bash
# Register
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123456","displayName":"Test User"}'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cinedb.com","password":"Admin@123"}'

# Protected endpoint (use token from login)
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer {accessToken}"
```
```

### Tiêu chí hoàn thành

- [ ] Register → Login → nhận tokens
- [ ] Access token hết hạn → refresh thành công
- [ ] Logout → token cũ bị reject (401)
- [ ] 5 lần login sai → account locked
- [ ] Non-admin gọi admin endpoint → 403
- [ ] Swagger docs hiển thị tất cả auth endpoints
- [ ] Unit tests pass, coverage ≥ 80%
- [ ] Rate limiting hoạt động (thử gửi 31 login requests trong 1 phút)

---

## WP-1.2: Movie Module

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 3 ngày |
| **Agent skill** | NestJS, Prisma, Redis Cache, REST API Design |
| **Dependency** | WP-1.1 (Auth Guard) |

### Prompt cho Agent

```
Bạn là senior backend engineer. Xây dựng Movie Module cho CineDB API.

## Context
[ATTACH: prisma/schema.prisma, src/auth/ (toàn bộ), src/common/, src/app.module.ts]

## Endpoints

### Public (không cần auth)

GET /api/v1/movies
  Query: { page=1, limit=20, category?: 'popular'|'now_playing'|'upcoming'|'top_rated', sort_by?: 'popularity'|'vote_average'|'release_date'|'title', sort_order?: 'asc'|'desc' }
  Response: { data: Movie[], meta: { page, limit, total, totalPages } }
  Logic:
    - Filter: isDeleted = false
    - Category filters:
      - popular: sort by popularity DESC
      - now_playing: releaseDate between (now - 60 days) and now
      - upcoming: releaseDate > now
      - top_rated: voteCount >= 10, sort by voteAverage DESC
    - Include: genres (chỉ id + name)
    - Cache: Redis key movies:{category}:{page}:{limit}:{sort}, TTL 10 phút
    - Pagination: offset-based

GET /api/v1/movies/:id
  Response: { data: MovieDetail }
  MovieDetail bao gồm:
    - Tất cả fields của movie
    - genres: [{ id, name, slug }]
    - cast: top 15 (from MovieCast, include Person { id, name, profileUrl }, character, displayOrder)
    - crew: Directors + Writers + Producers (from MovieCrew, include Person)
    - trailers: all (from Trailer)
    - images: posters (top 5) + backdrops (top 5)
    - stats: { voteAverage, voteCount, tmdbVoteAverage, tmdbVoteCount }
    - countries, companies (nếu có)
  Cache: Redis key movie:{id}, TTL 1 giờ
  404 nếu không tìm thấy hoặc isDeleted

GET /api/v1/movies/:id/credits
  Response: { cast: [...all], crew: [...all] }
  Full cast & crew (không limit)

GET /api/v1/movies/:id/images
  Response: { posters: [...], backdrops: [...] }

GET /api/v1/movies/:id/videos
  Response: { results: Trailer[] }

GET /api/v1/movies/:id/similar
  Response: { data: Movie[] } (max 12)
  Logic:
    - Lấy genres của phim hiện tại
    - Tìm phim khác có >= 2 genres trùng, HOẶC cùng đạo diễn
    - Exclude phim hiện tại và phim bị deleted
    - Sort by popularity DESC
    - Limit 12
    - Cache: TTL 1 giờ

GET /api/v1/movies/:id/reviews
  Query: { page=1, limit=10, sort_by?: 'created_at'|'score', sort_order?: 'desc' }
  Response: { data: [{ rating, comment?, user: { id, displayName, avatarUrl } }], meta }
  Logic:
    - Join Rating + Comment (left join, cùng user + movie)
    - Hoặc query ratings + comments riêng rồi merge
    - Chỉ hiển thị comments có status = ACTIVE

### Admin (cần @Roles('ADMIN'))

POST /api/v1/admin/movies
  Body: CreateMovieDto { title, originalTitle?, overview?, releaseDate?, runtime?, language?, budget?, revenue?, status?, genreIds: number[], countryIds?: number[], companyIds?: number[] }
  Logic: Create movie, connect genres/countries/companies, invalidate cache

PUT /api/v1/admin/movies/:id
  Body: UpdateMovieDto (partial CreateMovieDto)
  Logic: Update movie, set isAdminEdited=true nếu có tmdbId, invalidate cache movie:{id} + movies:*

DELETE /api/v1/admin/movies/:id
  Logic: Soft delete (set isDeleted=true), invalidate cache
  Response: { message: "Movie deleted successfully" }

### Cache Strategy

```typescript
// Trong service methods:
async getMovieById(id: number): Promise<MovieDetail> {
  const cacheKey = `movie:${id}`;
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const movie = await this.prisma.movie.findFirst({
    where: { id, isDeleted: false },
    include: { /* ... */ }
  });

  if (!movie) throw new NotFoundException('Movie not found');

  await this.redis.set(cacheKey, JSON.stringify(movie), 3600); // 1h
  return movie;
}

// Invalidate on write:
async updateMovie(id: number, dto: UpdateMovieDto) {
  // ... update logic ...
  await this.redis.del(`movie:${id}`);
  await this.redis.delPattern('movies:*'); // Clear list caches
}
```

### DTOs

CreateMovieDto, UpdateMovieDto, MovieQueryDto — class-validator decorators đầy đủ.
Response DTO: MovieResponseDto, MovieDetailResponseDto — @ApiProperty với examples.

### Unit Tests

Test MovieService:
- getMovies: popular, top_rated, pagination
- getMovieById: found, not found (404), deleted (404), cache hit, cache miss
- getSimilarMovies: returns correct results
- createMovie (admin): success, validation fail
- updateMovie (admin): success, not found
- deleteMovie (admin): soft delete works

### Swagger

@ApiTags('Movies'), @ApiTags('Admin - Movies')
Mỗi endpoint: @ApiOperation, @ApiQuery (cho query params), @ApiParam, @ApiResponse

## Output

Files tạo:
- src/movie/movie.module.ts, movie.controller.ts, movie.service.ts
- src/movie/dto/create-movie.dto.ts, update-movie.dto.ts, movie-query.dto.ts
- src/movie/__tests__/movie.service.spec.ts
- Updated: src/app.module.ts
```

### Tiêu chí hoàn thành

- [ ] GET /movies → danh sách phim paginated (dữ liệu từ TMDB import)
- [ ] GET /movies?category=popular → sorted by popularity
- [ ] GET /movies/:id → full details với genres, cast, trailers
- [ ] GET /movies/:id/similar → 12 phim tương tự hợp lý
- [ ] Admin POST/PUT/DELETE hoạt động
- [ ] Cache: request lần 2 nhanh hơn (check Redis)
- [ ] Swagger docs đầy đủ
- [ ] Tests pass ≥ 80%

---

## WP-1.3: TV Series Module

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | NestJS, Prisma |
| **Dependency** | WP-1.2 (copy pattern) |

### Prompt cho Agent

```
Bạn là backend engineer. Xây dựng TV Series Module cho CineDB, THEO ĐÚNG PATTERN của Movie Module đã có.

[ATTACH: src/movie/ (toàn bộ — làm reference pattern)]
[ATTACH: prisma/schema.prisma]

## Endpoints

GET  /api/v1/tv                                           — Danh sách (tương tự /movies, có category filter)
GET  /api/v1/tv/:id                                       — Chi tiết series (include: seasons overview với season_number, name, episode_count, poster)
GET  /api/v1/tv/:id/credits                               — Full cast & crew
GET  /api/v1/tv/:id/videos                                — Trailers
GET  /api/v1/tv/:id/similar                               — Series tương tự
GET  /api/v1/tv/:id/season/:seasonNumber                  — Chi tiết season (include: danh sách episodes với episode_number, name, air_date, still_url, vote_average)
GET  /api/v1/tv/:id/season/:sn/episode/:episodeNumber     — Chi tiết episode

### Admin
POST/PUT/DELETE  /api/v1/admin/tv                         — CRUD series
POST/PUT/DELETE  /api/v1/admin/tv/:id/season              — CRUD season (cascade: delete season → delete episodes)
POST/PUT/DELETE  /api/v1/admin/tv/:id/season/:sn/episode  — CRUD episode

Follow chính xác cùng patterns: DTOs, cache, pagination, error handling, Swagger, tests.
Mỗi controller/service method, nhìn vào Movie Module tương ứng và adapt cho TV.

## Output
- src/tv/ (toàn bộ module)
- Tests ≥ 80% coverage
```

---

## WP-1.4: Person Module

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 1 ngày |
| **Agent skill** | NestJS, Prisma |
| **Dependency** | WP-0.3 |

### Prompt cho Agent

```
Xây dựng Person Module cho CineDB (diễn viên, đạo diễn, crew).

[ATTACH: src/movie/ hoặc src/tv/ làm reference]
[ATTACH: prisma/schema.prisma]

## Endpoints

GET  /api/v1/person/popular                — Danh sách người nổi tiếng, sort popularity DESC, paginated
GET  /api/v1/person/:id                    — Chi tiết: name, biography, birthday, deathday, placeOfBirth, gender, profileUrl, knownForDepartment
GET  /api/v1/person/:id/movie-credits      — { cast: [{ movie, character }], crew: [{ movie, job, department }] }, sort by movie.releaseDate DESC
GET  /api/v1/person/:id/tv-credits         — Tương tự cho TV
GET  /api/v1/person/:id/images             — Profile images

### Admin
POST/PUT/DELETE  /api/v1/admin/people

Cache: person:{id} TTL 2h, person:popular:{page} TTL 30m.
Swagger + Tests.
```

---

## WP-1.5: Rating & Comment Module

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | NestJS, Prisma, Business Logic |
| **Dependency** | WP-1.1, WP-1.2 |

### Prompt cho Agent

```
Xây dựng Rating và Comment modules cho CineDB.

[ATTACH: prisma/schema.prisma, src/auth/, src/movie/, src/common/]

## Rating Endpoints (cần auth — @UseGuards(JwtAuthGuard))

POST   /api/v1/movies/:id/rating      — { score: 1-10 }
  Logic:
    - Validate score 1-10 (integer)
    - Upsert: nếu user đã rate movie này → update score, ngược lại → create
    - Sau upsert, recalculate movie aggregates bằng SQL:
      UPDATE "Movie" SET
        "voteAverage" = (SELECT COALESCE(AVG(score)::numeric(3,1), 0) FROM "Rating" WHERE "movieId" = $1),
        "voteCount" = (SELECT COUNT(*) FROM "Rating" WHERE "movieId" = $1)
      WHERE id = $1
    - Invalidate cache movie:{id}
    - Log activity: { action: 'RATE', entityType: 'MOVIE', entityId: movieId }
    - Return: { score, movieVoteAverage, movieVoteCount }

DELETE /api/v1/movies/:id/rating      — Xóa đánh giá của mình
  Logic: delete rating, recalculate aggregates, invalidate cache, log activity

POST   /api/v1/tv/:id/rating          — Tương tự cho TV series
DELETE /api/v1/tv/:id/rating

GET    /api/v1/users/me/ratings        — Danh sách đánh giá của tôi, paginated, include movie/tv info

## Comment Endpoints (cần auth)

POST   /api/v1/comments                — { movieId?: number, seriesId?: number, content: string }
  Logic:
    - Validate: content 1-5000 chars, phải có movieId hoặc seriesId (không cả hai)
    - Content filter: kiểm tra danh sách từ cấm (tạo file config/banned-words.ts với ~20 từ tiếng Việt + tiếng Anh phổ biến)
    - Nếu chứa từ cấm: reject với ERR_COMMENT_002
    - Create comment (status: ACTIVE)
    - Log activity
    - Return comment với user info

PATCH  /api/v1/comments/:id            — { content: string }
  Logic: chỉ owner mới sửa được (check userId), validate content, update

DELETE /api/v1/comments/:id            — Owner hoặc Admin mới xóa được
  Logic: nếu owner → set status DELETED, nếu admin → set status DELETED

POST   /api/v1/comments/:id/report     — { reason: string }
  Logic:
    - Check: user chưa report comment này (unique reporterId + commentId)
    - Create Report (status: PENDING)
    - Return success

## Business Rules (kiểm tra kỹ)

1. Rating UNIQUE per user per movie: upsert pattern
2. Comment owner check: userId from JWT must match comment.userId
3. Banned words filter: reject trước khi save
4. Aggregate recalculation: phải dùng SQL aggregate (AVG, COUNT), KHÔNG tính ở app layer
5. Report uniqueness: mỗi user chỉ report 1 comment 1 lần
6. Activity logging: mọi action đều ghi ActivityLog

## Tests

- Rate movie: success, duplicate (update), invalid score, not logged in
- Delete rating: success, not found
- Aggregate: rate → check average, delete rate → check average again
- Comment: create, edit (owner only), delete (owner + admin), banned word reject
- Report: success, duplicate report reject
```

---

## WP-1.6: User Module

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | NestJS, Prisma |
| **Dependency** | WP-1.1 |

### Prompt cho Agent

```
Xây dựng User Module cho CineDB (profile, watchlist, favorites, activity).

[ATTACH: src/auth/, src/common/, prisma/schema.prisma]

## Endpoints (tất cả cần @UseGuards(JwtAuthGuard))

### Profile
GET   /api/v1/users/me                        — Thông tin cá nhân đầy đủ
PATCH /api/v1/users/me                        — Update { displayName?, bio?, avatarUrl?, language? }
PATCH /api/v1/users/me/password               — { oldPassword, newPassword }
  Logic: verify old password (bcrypt compare), validate new password strength, hash + update, delete all refresh tokens (force re-login on other devices)

### Watchlist
GET    /api/v1/users/me/watchlist              — Paginated, include movie/tv basic info (poster, title, year, vote)
POST   /api/v1/movies/:id/watchlist            — Toggle: thêm nếu chưa có, xóa nếu đã có. Return { added: boolean }
POST   /api/v1/tv/:id/watchlist                — Tương tự cho TV
DELETE /api/v1/movies/:id/watchlist             — Explicit remove
DELETE /api/v1/tv/:id/watchlist

### Favorites (tương tự Watchlist)
GET    /api/v1/users/me/favorites
POST   /api/v1/movies/:id/favorite
POST   /api/v1/tv/:id/favorite
DELETE /api/v1/movies/:id/favorite
DELETE /api/v1/tv/:id/favorite

### Activity
GET    /api/v1/users/me/activity               — { page, limit, type?: 'RATE'|'COMMENT'|'WATCHLIST_ADD'|... }
  Response: danh sách activity logs, paginated, sort createdAt DESC
  Include: entity info (movie title, poster) based on entityType + entityId

### Public Profile (optional)
GET    /api/v1/users/:id                       — Public info: displayName, avatarUrl, bio, memberSince, stats (totalRatings, totalComments)

## Tests
- Profile CRUD, password change (old wrong, new weak, success)
- Watchlist toggle: add, remove, add again
- Favorites toggle
- Activity log populated correctly after actions
```

---

## WP-1.7: Search Module (Elasticsearch)

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 3 ngày |
| **Agent skill** | NestJS, Elasticsearch, Full-text Search |
| **Dependency** | WP-1.2 (Movie data) |

### Prompt cho Agent

```
Xây dựng Search Module tích hợp Elasticsearch cho CineDB.

[ATTACH: prisma/schema.prisma, src/movie/movie.service.ts (để biết data shape), docker-compose.yml (ES config)]

## 1. Elasticsearch Service (src/search/elasticsearch.service.ts)

- Connect tới ES từ env ELASTICSEARCH_URL
- Methods:
  - createIndex(name, mapping)
  - indexDocument(index, id, body)
  - bulkIndex(index, documents)
  - search(index, query)
  - deleteDocument(index, id)
  - deleteIndex(name)

## 2. Index Mappings

### Index: movies
```json
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "analysis": {
      "analyzer": {
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "autocomplete_tokenizer",
          "filter": ["lowercase"]
        }
      },
      "tokenizer": {
        "autocomplete_tokenizer": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 20,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id": { "type": "integer" },
      "title": { "type": "text", "analyzer": "standard", "fields": { "autocomplete": { "type": "text", "analyzer": "autocomplete_analyzer" }, "keyword": { "type": "keyword" } } },
      "originalTitle": { "type": "text" },
      "overview": { "type": "text" },
      "genres": { "type": "keyword" },
      "genreNames": { "type": "text" },
      "releaseDate": { "type": "date" },
      "releaseYear": { "type": "integer" },
      "voteAverage": { "type": "float" },
      "tmdbVoteAverage": { "type": "float" },
      "popularity": { "type": "float" },
      "country": { "type": "keyword" },
      "language": { "type": "keyword" },
      "cast": { "type": "text" },
      "director": { "type": "text" },
      "posterUrl": { "type": "keyword", "index": false },
      "backdropUrl": { "type": "keyword", "index": false },
      "mediaType": { "type": "keyword" }
    }
  }
}
```

Tạo tương tự cho index `tv_series` và `people`.

## 3. Sync Service (src/search/search-sync.service.ts)

- syncAllMovies(): fetch tất cả movies từ Prisma (include genres, cast), transform, bulk index
- syncAllTV(): tương tự
- syncAllPeople(): tương tự
- syncMovie(id): index 1 movie (dùng khi admin add/edit)
- removeMovie(id): delete document
- Gọi syncAll khi app khởi động (onModuleInit) — HOẶC tạo CLI command

## 4. Search Endpoints

GET /api/v1/search/multi?query=...&page=1&limit=20
  Logic:
    - Search across movies, tv_series, people indexes
    - Multi-match query trên title, originalTitle, overview, cast, director, name
    - Fuzziness: "AUTO" (tự động fuzzy 1-2 chars)
    - Return: { data: [...results grouped by type], meta }
    - Mỗi result có: { id, title/name, mediaType: 'movie'|'tv'|'person', posterUrl/profileUrl, year, voteAverage }

GET /api/v1/search/movie?query=...&page=1&limit=20
GET /api/v1/search/tv?query=...&page=1&limit=20
GET /api/v1/search/person?query=...&page=1&limit=20

GET /api/v1/search/autocomplete?query=...&limit=5
  Logic:
    - Search title.autocomplete field
    - Return top 5 suggestions từ cả movies + tv + people
    - Cache Redis: search:autocomplete:{query_lowercase}, TTL 5 phút

GET /api/v1/discover/movie?genres=28,12&year_min=2020&year_max=2024&country=US&vote_min=7&sort_by=popularity.desc&page=1&limit=20
  Logic:
    - Elasticsearch bool query:
      - must: match genres (if provided)
      - filter: range releaseYear, match country, range voteAverage
      - sort: popularity, voteAverage, releaseDate
    - Paginated

GET /api/v1/discover/tv (tương tự)

## 5. Fallback

Nếu Elasticsearch không khả dụng (connection refused):
- Log warning
- Fallback sang PostgreSQL ILIKE query cho search
- Fallback sang Prisma query cho discover (nhiều filter)
- Không throw error cho user

## 6. Integration

- Khi admin tạo/sửa/xóa movie → gọi searchSync.syncMovie(id) hoặc removeMovie(id)
- Import TMDB xong → gọi syncAll

## Tests
- Autocomplete: "aven" → returns "Avengers" results
- Fuzzy: "avengerz" → still finds Avengers
- Multi search: query returns mixed movie + person results
- Discover filters: genre + year + country combination
- Fallback: mock ES offline → still returns results from PostgreSQL
```

---

## WP-1.8: Trending & Genre Module

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 1 ngày |
| **Agent skill** | NestJS, Redis, Cron |
| **Dependency** | WP-1.2 |

### Prompt cho Agent

```
Xây dựng Trending và Genre endpoints.

[ATTACH: src/movie/, src/redis/, prisma/schema.prisma]

## Trending

GET /api/v1/trending/:mediaType/:timeWindow
  mediaType: 'movie' | 'tv' | 'all'
  timeWindow: 'day' | 'week'
  Query: { page, limit }

  Logic:
    - Tính trending score = popularity * 0.5 + voteCount * 0.3 + (recentRatingsCount * 0.2)
    - recentRatingsCount: số ratings trong 24h (day) hoặc 7d (week)
    - Sort by trending score DESC
    - Cache: Redis trending:{mediaType}:{timeWindow}:{page}, TTL 1h

Cron job (dùng @nestjs/schedule @Cron):
  - Mỗi giờ: tính lại trending cho day + week, lưu vào Redis
  - Log: "Trending refreshed: X movies, Y tv"

## Genres

GET /api/v1/genres/movie — Tất cả genres có phim (count > 0)
GET /api/v1/genres/tv    — Tất cả genres có TV series
  Cache: Redis genres:movie / genres:tv, TTL 24h

## Output
- src/trending/ module
- src/genre/ module (hoặc gộp vào movie module)
```

---

## WP-1.9: TMDB Client Module

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 2 ngày |
| **Agent skill** | NestJS, HTTP Client, Rate Limiting, TMDB API |
| **Dependency** | WP-0.2 |

### Prompt cho Agent

```
Xây dựng TMDB Client Module — HTTP client gọi TMDB API với rate limiting và caching.

[ATTACH: .env (TMDB vars), prisma/schema.prisma]

## Yêu cầu

Tạo src/tmdb/tmdb-client.service.ts:

1. Axios instance: baseURL = TMDB_BASE_URL, default params: api_key, language
2. Rate limiter: dùng bottleneck library, maxConcurrent=1, minTime=250 (4 req/s)
3. Response cache: Redis, key tmdb:{endpoint}:{paramsHash}, TTL 1h
4. Retry: 3 lần với exponential backoff khi gặp 429 hoặc 5xx
5. Error handling: custom TmdbApiException

## Methods cần implement

// Movies
getMovie(tmdbId: number, appendToResponse?: string): Promise<TmdbMovieDetail>
getPopularMovies(page: number): Promise<TmdbPaginatedResponse>
getNowPlayingMovies(page: number): Promise<TmdbPaginatedResponse>
getUpcomingMovies(page: number): Promise<TmdbPaginatedResponse>
getTopRatedMovies(page: number): Promise<TmdbPaginatedResponse>
searchMovies(query: string, page: number): Promise<TmdbPaginatedResponse>
getMovieChanges(startDate: string, endDate: string, page: number): Promise<TmdbChanges>

// TV
getTVSeries(tmdbId: number, appendToResponse?: string): Promise<TmdbTVDetail>
getPopularTV(page: number): Promise<TmdbPaginatedResponse>
getTVSeason(seriesId: number, seasonNumber: number): Promise<TmdbSeasonDetail>
searchTV(query: string, page: number): Promise<TmdbPaginatedResponse>

// People
getPerson(tmdbId: number, appendToResponse?: string): Promise<TmdbPersonDetail>
searchPeople(query: string, page: number): Promise<TmdbPaginatedResponse>

// Genres
getMovieGenres(): Promise<TmdbGenre[]>
getTVGenres(): Promise<TmdbGenre[]>

// Trending
getTrending(mediaType: string, timeWindow: string): Promise<TmdbPaginatedResponse>

// Helper
getImageUrl(path: string | null, size: 'w92'|'w185'|'w342'|'w500'|'w780'|'w1280'|'original'): string | null

## TypeScript Interfaces

Tạo src/tmdb/interfaces/ với đầy đủ TMDB response types (tham khảo https://developer.themoviedb.org/reference).
Quan trọng nhất: TmdbMovie, TmdbMovieDetail, TmdbTVDetail, TmdbSeasonDetail, TmdbPersonDetail, TmdbCredits, TmdbVideos, TmdbImages, TmdbPaginatedResponse.

## Tests
- Mock axios, test mỗi method trả đúng data shape
- Test rate limiter: 10 calls liên tiếp → đảm bảo delay giữa calls
- Test retry: mock 429 → retry 3 lần → success
- Test cache: call 2 lần → lần 2 không gọi API (from Redis)
```

---

## WP-1.10: TMDB Mapper & Sync Service

| Mục | Chi tiết |
|-----|----------|
| **Thời gian** | 3 ngày |
| **Agent skill** | NestJS, Prisma, Data Pipeline, TMDB API |
| **Dependency** | WP-1.9 (TMDB Client), WP-1.2 (Movie Module), WP-1.7 (Search sync) |

### Prompt cho Agent

```
Xây dựng TMDB Mapper và Sync services — import và đồng bộ dữ liệu từ TMDB vào CineDB.

[ATTACH: src/tmdb/tmdb-client.service.ts, src/tmdb/interfaces/, prisma/schema.prisma, src/search/search-sync.service.ts]

## 1. TmdbMapperService (src/tmdb/tmdb-mapper.service.ts)

Transform TMDB API responses → Prisma create/update inputs.

Methods:
- toMovie(tmdbData: TmdbMovieDetail): object chứa movie fields + genre tmdbIds + country isoCodes
- toTVSeries(tmdbData: TmdbTVDetail): tương tự
- toSeason(tmdbData: TmdbSeasonDetail): season + episodes
- toPerson(tmdbData: any): person fields
- toCast(credits: TmdbCredits, limit: number): { people: PersonInput[], cast: CastInput[] }
- toCrew(credits: TmdbCredits): { people: PersonInput[], crew: CrewInput[] }
- toTrailers(videos: TmdbVideos): trailer inputs (filter: site=YouTube, type=Trailer|Teaser)
- toImages(images: TmdbImages): image inputs (top 10 posters + 10 backdrops)

Mapping rules:
- Image URLs: prepend TMDB_IMAGE_BASE_URL + size (w500 poster, w1280 backdrop, w185 profile)
- Vote: tmdb vote_average → tmdbVoteAverage (KHÔNG ghi vào voteAverage — đó là CineDB score)
- Dates: parse ISO string → Date object
- Gender: 0→UNKNOWN, 1→FEMALE, 2→MALE, 3→NON_BINARY
- Null handling: undefined/null fields → null (không crash)

## 2. TmdbSyncService (src/tmdb/tmdb-sync.service.ts)

### fullImport(options: { moviePages: number, tvPages: number })
- Loop moviePages: fetch popular page → cho mỗi movie → fetchDetail → map → upsert
- Upsert movie: prisma.movie.upsert({ where: { tmdbId }, update: {...}, create: {...} })
- Upsert people: cho mỗi cast/crew member → prisma.person.upsert({ where: { tmdbId } })
- Create cast/crew links: deleteMany existing + createMany new (cho mỗi movie)
- Create trailers: deleteMany existing + createMany new
- Connect genres: prisma.movie.update({ genres: { set: genreRecords } })
- Log progress: "Imported page X/Y, movie: Title (Year)"
- Save to TmdbSyncLog table
- After complete: trigger search re-index

### dailySync()
- Get yesterday's date
- Fetch /movie/changes?start_date=yesterday
- For each changed tmdbId that exists in our DB:
  - Skip if isAdminEdited=true (respect admin overrides)
  - Fetch detail, map, update
- Tương tự cho TV changes
- Trigger incremental search re-index
- Save sync log

### importSingleMovie(tmdbId: number): Promise<Movie>
- Check DB: already exists? → return existing
- Fetch from TMDB, map, create all (movie + people + cast + crew + trailers + genres)
- Index to Elasticsearch
- Return created movie

### importSingleTV(tmdbId: number): Promise<TVSeries>
- Tương tự, bao gồm seasons + episodes

### syncTrending()
- Fetch /trending/movie/day và /trending/movie/week
- For each movie in results: nếu chưa có trong DB → importSingleMovie
- Cache trending lists in Redis

## 3. TmdbSchedulerService (src/tmdb/tmdb-scheduler.service.ts)

@Cron('0 3 * * *')   // 3:00 AM daily
async handleDailySync() { await this.tmdbSync.dailySync(); }

@Cron('0 * * * *')    // Every hour
async handleTrendingSync() { await this.tmdbSync.syncTrending(); }

## 4. Admin Controller (src/tmdb/tmdb.controller.ts)

@Controller('api/v1/admin/tmdb')
@UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')

POST /admin/tmdb/import/full     — Trigger full import { moviePages: 100, tvPages: 50 }
POST /admin/tmdb/import/movie/:tmdbId — Import 1 movie
POST /admin/tmdb/import/tv/:tmdbId    — Import 1 TV series
GET  /admin/tmdb/search/movie?query=  — Search TMDB (proxy, để admin tìm phim cần import)
GET  /admin/tmdb/search/tv?query=     — Search TMDB TV
POST /admin/tmdb/sync/daily           — Trigger daily sync manually
GET  /admin/tmdb/sync/logs            — Xem sync history (paginated)

## 5. On-demand Integration

Sửa MovieService.getMovieById():
- Nếu not found trong DB VÀ TMDB_ENABLE_ON_DEMAND_FETCH=true
  → Thử tìm trên TMDB bằng search
  → Nếu tìm thấy exact match → importSingleMovie → return
  → Nếu không → 404

## Tests
- TmdbMapper: test từng method với sample TMDB data
- TmdbSync: mock TmdbClient + Prisma, test importSingleMovie flow
- Full import: mock, verify upsert called correctly
```

---

## Checkpoint Pha 1

```
╔══════════════════════════════════════════════════════╗
║  CHECKPOINT PHA 1 — Test toàn bộ API                ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Auth:                                               ║
║  ✅ Register → verify email → login → tokens         ║
║  ✅ Refresh token, logout, lockout                   ║
║  ✅ Role-based access control                        ║
║                                                      ║
║  Movies & TV:                                        ║
║  ✅ List (popular, now_playing, top_rated, upcoming)  ║
║  ✅ Detail with genres, cast, trailers               ║
║  ✅ Similar movies/TV                                ║
║  ✅ Admin CRUD                                       ║
║                                                      ║
║  User Actions:                                       ║
║  ✅ Rate movie (1-10), edit, delete                  ║
║  ✅ Comment, edit, delete, report                    ║
║  ✅ Watchlist add/remove toggle                      ║
║  ✅ Favorites add/remove toggle                      ║
║  ✅ Activity log populated                           ║
║                                                      ║
║  Search:                                             ║
║  ✅ Autocomplete after 2 chars                       ║
║  ✅ Fuzzy search finds misspelled queries            ║
║  ✅ Multi search (movie + TV + person)               ║
║  ✅ Discover with filters (genre, year, country)     ║
║                                                      ║
║  TMDB:                                               ║
║  ✅ Import single movie by tmdbId                    ║
║  ✅ Search TMDB from admin                           ║
║  ✅ Sync logs recorded                               ║
║  ✅ Database has 500+ movies                         ║
║                                                      ║
║  Quality:                                            ║
║  ✅ All unit tests pass                              ║
║  ✅ npm run build success                            ║
║  ✅ Swagger docs complete                            ║
║  ✅ No lint errors                                   ║
║                                                      ║
║  → Tag v0.2.0, sẵn sàng cho Pha 2                   ║
╚══════════════════════════════════════════════════════╝
```
