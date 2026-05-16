# CineDB Handoff - Phase 0 to WP-1.7

Date: 2026-05-16

This file summarizes what has been implemented and verified so the next Codex session can continue without needing the full chat context.

## Global Context For Next Session

Always review these before each backend WP:

- `backend/prisma/schema.prisma`
- `backend/src/app.module.ts`
- `backend/src/common/`
- `.env`
- The latest completed module as the pattern reference

Current required backend module pattern:

- `module.ts`, `controller.ts`, `service.ts`
- `dto/`
- `entities/` when response types are useful
- `__tests__/`
- Swagger decorators on every endpoint
- `class-validator` DTOs
- `PrismaService` and `RedisService` where relevant
- Pagination response shape: `{ data, meta: { page, limit, total, totalPages } }`
- Errors via `HttpException({ statusCode, message, error }, HttpStatus.X)`
- Unit test coverage target: service >= 80%

Useful runtime assumptions:

- Backend port: `4000`
- Frontend port: `3000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Elasticsearch: `http://localhost:9200`
- Admin login used for smoke tests: `admin@cinedb.com` / `Admin@123`
- Build output currently runs with `node backend/dist/src/main.js`

Existing worktree note:

- The repo has many untracked files from previous WP work because modules were implemented progressively.
- There are also old dev logs such as `backend-dev.log`, `backend-dev.err.log`, `frontend-dev.log`, `frontend-dev.err.log`.
- Do not delete or revert unrelated changes unless explicitly asked.

## Phase 0 Summary

### WP-0.2: Repository & Docker

Implemented:

- Monorepo scaffold for `backend`, `frontend`, `recommendation`, and `docker`.
- Docker compose stack for PostgreSQL, Redis, Elasticsearch.
- Root env files, README, package scripts, baseline Nest/Next/FastAPI apps.
- Repo initialized with Git.

Verified:

- `npm install`: pass
- `npm run build`: pass
- `npm run lint`: pass
- `npm run test`: pass
- Backend health route works.
- Frontend starts.
- Recommendation `/health` works.
- Docker stack later confirmed healthy after Docker Desktop/WSL2 daemon access was available.

Notes:

- Docker Desktop on Windows Home uses WSL2 backend. The Codex sandbox initially could not access Docker named pipe until the user confirmed Docker commands worked.
- Recommendation dependencies were updated for Python 3.14.

Next step:

- No direct follow-up needed unless cleaning generated logs or old scaffold docs.

### WP-0.3: Database Schema (Prisma)

Implemented:

- Full Prisma schema in `backend/prisma/schema.prisma`.
- Prisma 7 compatible `backend/prisma.config.ts`.
- Migrations:
  - `20260513125059_init`
  - `20260513125730_search_indexes`
- Raw SQL indexes for full-text/search helpers.

Verified:

- `npx prisma validate`: pass
- `npx prisma migrate dev --name init`: pass
- `npx prisma migrate deploy`: pass
- `npx prisma generate`: pass
- Prisma Studio started successfully.
- PostgreSQL had 30 public tables including join tables and `_prisma_migrations`.

Next step:

- None for schema unless future WPs require migrations.

### WP-0.4: Seed & TMDB Import

Implemented:

- Real seed in `backend/prisma/seed.ts`.
- TMDB import scripts:
  - `backend/scripts/tmdb-import.ts`
  - `backend/scripts/tmdb-import-tv.ts`
  - shared helpers in `backend/scripts/lib/`
- Verification script `backend/scripts/verify-import.ts`.

Verified DB snapshot:

- `genres`: 27
- `countries`: 55
- `companies`: 365
- `users`: 6
- `movies`: 100
- `tvSeries`: 40
- `people`: 2018
- `trailers`: 101
- `seasons`: 455
- `episodes`: 9919

Notes:

- Seed baseline counts in the original docs drifted because TMDB import upserts real genres/countries/companies.
- `.env` contains a real `TMDB_API_KEY`; do not paste it into external systems.

Next step:

- No blocker. Keep import scripts for later TMDB sync WP.

## Phase 1 Summary

### WP-1.1: Auth Module

Implemented:

- `backend/src/modules/auth/`
- JWT auth, refresh tokens, logout blacklist in Redis.
- Register/login/refresh/logout/forgot/reset/verify-email/google/me/change-password/admin probe.
- `PrismaService`, `RedisService`.
- `CurrentUser` decorator.
- `JwtAuthGuard` with Redis blacklist check.
- `RolesGuard`.
- Shutdown hooks in `main.ts`.

Verified:

- `npm run build --workspace backend`: pass
- `npm run lint --workspace backend`: pass
- Auth service tests: 34/34 pass
- Coverage: `auth.service.ts` statements > 99%, branches 87.5%
- Runtime smoke:
  - Swagger route works.
  - Login with admin works.
  - `/api/v1/auth/me` returns current user.

Notes:

- Google OAuth routes exist, but real callback needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Next step:

- Later hardening: mail delivery instead of logger for verification/reset tokens.

### WP-1.2: Movie Module

Implemented:

- `backend/src/modules/movies/`
- Public endpoints:
  - `GET /api/v1/movies`
  - `GET /api/v1/movies/:id`
  - `credits`, `images`, `videos`, `similar`, `reviews`
- Admin endpoints:
  - `POST /api/v1/admin/movies`
  - `PUT /api/v1/admin/movies/:id`
  - `DELETE /api/v1/admin/movies/:id`
- Redis cache for list/detail/similar.
- BigInt serialization for `budget` and `revenue`.
- Soft delete via `isDeleted`.

Verified:

- Build/lint pass.
- Movie service tests: 17/17 pass.
- Coverage: statements 87.7%, lines 87.35%.
- Runtime smoke pass for public routes and admin CRUD.

Later update:

- During WP-1.7, Movie admin create/update/delete was integrated with `SearchSyncService`:
  - `syncMovie(id)` after create/update.
  - `removeMovie(id)` after delete.
  - Errors are logged and do not fail admin CRUD.

Next step:

- Keep an eye on tests if constructor changes are expanded. Current optional search sync does not break tests.

### WP-1.3: TV Series Module

Implemented:

- `backend/src/modules/tv-series/`
- Public endpoints:
  - `GET /api/v1/tv`
  - `GET /api/v1/tv/:id`
  - `credits`, `videos`, `similar`
  - `season/:seasonNumber`
  - `season/:seasonNumber/episode/:episodeNumber`
- Admin endpoints for TV series, seasons, and episodes.
- Redis cache for list/detail/similar/season/episode.
- Season/episode stats sync.

Verified:

- Build/lint pass.
- TV service tests: 12/12 pass.
- Coverage: statements 86.6%, lines 86.3%.
- Runtime smoke pass for public routes and full admin CRUD.

Later update:

- During WP-1.7, TV admin create/update/delete was integrated with `SearchSyncService`:
  - `syncSeries(id)` after create/update.
  - `removeSeries(id)` after delete.
  - Errors are logged and do not fail admin CRUD.

Next step:

- Future Search/TMDB sync WPs can reuse `SearchSyncService.syncSeries`.

### WP-1.4: Person Module

Implemented:

- `backend/src/modules/people/`
- Public endpoints:
  - `GET /api/v1/person/popular`
  - `GET /api/v1/person/:id`
  - `GET /api/v1/person/:id/movie-credits`
  - `GET /api/v1/person/:id/tv-credits`
  - `GET /api/v1/person/:id/images`
- Admin endpoints:
  - `POST /api/v1/admin/people`
  - `PUT /api/v1/admin/people/:id`
  - `DELETE /api/v1/admin/people/:id`
- Redis cache:
  - `person:{id}`
  - `person:popular:{page}:{limit}`

Verified:

- Build/lint pass.
- Person service tests: 10/10 pass.
- Coverage: statements 92.3%, lines 92.06%.
- Runtime smoke pass for public endpoints, admin CRUD, and Redis cache.

Notes:

- `GenderType` enum values are `UNKNOWN`, `FEMALE`, `MALE`, `NON_BINARY`. Use `NON_BINARY`, not `OTHER`.

Next step:

- Person data is indexed by WP-1.7 search reindex.

### WP-1.5: Rating & Comment Module

Implemented:

- `backend/src/modules/ratings-comments/`
- `backend/src/config/banned-words.ts`
- Rating endpoints:
  - `POST /api/v1/movies/:id/rating`
  - `DELETE /api/v1/movies/:id/rating`
  - `POST /api/v1/tv/:id/rating`
  - `DELETE /api/v1/tv/:id/rating`
  - `GET /api/v1/users/me/ratings`
- Comment endpoints:
  - `POST /api/v1/comments`
  - `PATCH /api/v1/comments/:id`
  - `DELETE /api/v1/comments/:id`
  - `POST /api/v1/comments/:id/report`
- Business logic:
  - One rating per user per movie/TV via upsert.
  - SQL aggregate recalculation for `voteAverage` and `voteCount`.
  - Comment owner checks.
  - Owner/admin soft delete.
  - Banned word rejection with `ERR_COMMENT_002`.
  - Report uniqueness.
  - Activity logging.

Verified:

- Build/lint pass.
- Service tests: 14/14 pass.
- Coverage: statements 91.34%, lines 91.17%, functions 100%.
- Full backend tests at that point: 88/88 pass.
- Runtime smoke pass:
  - Movie rating create/update/delete.
  - TV rating create/delete.
  - My ratings list.
  - Comment create/update/delete/report.
  - Duplicate report returned 409.

Notes:

- Smoke test comments/reports were cleaned from PostgreSQL after verification.

Next step:

- Future user activity/feed functionality already consumes `ActivityLog`.

### WP-1.6: User Module

Implemented:

- `backend/src/modules/users/`
- Profile:
  - `GET /api/v1/users/me`
  - `PATCH /api/v1/users/me`
  - `PATCH /api/v1/users/me/password`
- Watchlist:
  - `GET /api/v1/users/me/watchlist`
  - `POST /api/v1/movies/:id/watchlist`
  - `POST /api/v1/tv/:id/watchlist`
  - `DELETE /api/v1/movies/:id/watchlist`
  - `DELETE /api/v1/tv/:id/watchlist`
- Favorites:
  - `GET /api/v1/users/me/favorites`
  - `POST /api/v1/movies/:id/favorite`
  - `POST /api/v1/tv/:id/favorite`
  - `DELETE /api/v1/movies/:id/favorite`
  - `DELETE /api/v1/tv/:id/favorite`
- Activity:
  - `GET /api/v1/users/me/activity`
- Public profile:
  - `GET /api/v1/users/:id`

Business logic:

- Password change verifies old password using bcrypt.
- New password follows existing Auth password policy.
- Password change deletes all refresh tokens.
- Watchlist/favorite toggles add/remove.
- Activity logs are written for profile/password/watchlist/favorite actions.
- Activity feed enriches movie/TV entity info.

Verified:

- Build/lint pass.
- User service tests: 11/11 pass.
- Coverage: statements 89.81%, lines 89.32%.
- Full backend tests at that point: 99/99 pass.
- Runtime smoke pass:
  - Profile get/update.
  - Password change using temp user.
  - Watchlist add/remove/toggle.
  - Favorites add/remove/toggle.
  - Activity feed.
  - Public profile.

Notes:

- Temporary smoke user `wp16-smoke@cinedb.local` was deleted after verification.

Next step:

- Could add controller-level e2e tests later, but unit + runtime smoke are already good for WP scope.

### WP-1.7: Search Module (Elasticsearch)

Implemented:

- `backend/src/modules/search/`
- Elasticsearch wrapper:
  - `createIndex`
  - `indexDocument`
  - `bulkIndex`
  - `search`
  - `deleteDocument`
  - `deleteIndex`
- Index mappings for:
  - `movies`
  - `tv_series`
  - `people`
- Search sync service:
  - `ensureIndexes`
  - `syncAll`
  - `syncAllMovies`
  - `syncAllTV`
  - `syncAllPeople`
  - `syncMovie`
  - `removeMovie`
  - `syncSeries`
  - `removeSeries`
- Public endpoints:
  - `GET /api/v1/search/multi`
  - `GET /api/v1/search/movie`
  - `GET /api/v1/search/tv`
  - `GET /api/v1/search/person`
  - `GET /api/v1/search/autocomplete`
  - `GET /api/v1/discover/movie`
  - `GET /api/v1/discover/tv`
- Admin endpoint:
  - `POST /api/v1/admin/search/reindex`
- Redis cache:
  - `search:autocomplete:{query_lowercase}:{limit}`, TTL 5 minutes.
- Fallback behavior:
  - If Elasticsearch is unavailable or search fails, search falls back to Prisma/PostgreSQL queries.
  - App startup does not crash if index initialization fails.

Elasticsearch compatibility note:

- Installed `@elastic/elasticsearch` is v9 while Docker Elasticsearch is `8.12.0`.
- The client was configured with compatibility headers:
  - `application/vnd.elasticsearch+json; compatible-with=8`
- Without this, ES 8 rejects requests with `compatible-with=9`.

Verified:

- `npm run build --workspace backend`: pass
- `npm run lint --workspace backend`: pass
- Search service tests: 9/9 pass.
- Search service coverage:
  - statements 80.57%
  - lines 80.47%
  - functions 90.38%
- Full backend tests after WP-1.7:
  - 8 suites passed
  - 108 tests passed
- Runtime smoke:
  - backend `/health`: ok
  - `POST /api/v1/admin/search/reindex`: pass
  - indexed:
    - `movies`: 100 docs
    - `tv_series`: 40 docs
    - `people`: 2018 docs
  - `GET /search/multi`: returned 5 results
  - `GET /search/movie`: returned 3 results
  - `GET /search/tv`: returned 3 results
  - `GET /search/person`: returned 3 results
  - `GET /search/autocomplete`: returned 5 suggestions
  - `GET /discover/movie`: returned 3 results
  - `GET /discover/tv`: returned 3 results

Current ES index state:

- `movies`: green, 100 docs
- `tv_series`: green, 40 docs
- `people`: green, 2018 docs

Next step:

- WP-1.8 is likely the next backend work package unless the plan says otherwise.
- If WP-1.8 depends on search, start by checking `backend/src/modules/search/search-sync.service.ts`.
- Future TMDB sync WP should call `SearchSyncService.syncMovie`, `syncSeries`, or `syncAll`.

## Current Verification Baseline

Last known good commands:

```powershell
npm run build --workspace backend
npm run lint --workspace backend
npm run test --workspace backend -- --runInBand
```

Last known full backend test result:

- Test suites: 8 passed
- Tests: 108 passed

Last known backend smoke route:

```powershell
node backend/dist/src/main.js
GET http://127.0.0.1:4000/api/v1/health
```

Expected response wrapper contains:

```json
{
  "data": {
    "status": "ok"
  }
}
```

## Recommended Next Session Start

1. Read this file.
2. Read `phase-1-backend.md` around the next WP.
3. Read required context files:
   - `backend/prisma/schema.prisma`
   - `backend/src/app.module.ts`
   - `backend/src/common/`
   - `.env`
   - the latest reference module, currently `backend/src/modules/search/`
4. Check Docker services if the next WP needs DB/Redis/ES:

```powershell
docker compose -f docker/docker-compose.yml ps
Invoke-RestMethod -Uri 'http://localhost:9200/_cluster/health'
```

5. Run build/lint/tests after changes.

## Updates After WP-1.7 (2026-05-16)

Append-only update. Existing handoff content above was kept unchanged.

### WP-1.8: Trending & Genre Module

Work completed:

- Added Trending module:
  - `backend/src/modules/trending/trending.module.ts`
  - `backend/src/modules/trending/trending.controller.ts`
  - `backend/src/modules/trending/trending.service.ts`
  - DTO/entity/test files under `backend/src/modules/trending/`
- Added Genre module:
  - `backend/src/modules/genres/genres.module.ts`
  - `backend/src/modules/genres/genres.controller.ts`
  - `backend/src/modules/genres/genres.service.ts`
  - entity/test files under `backend/src/modules/genres/`
- Registered `TrendingModule` and `GenresModule` in `backend/src/app.module.ts`.
- Implemented endpoints:
  - `GET /api/v1/trending/:mediaType/:timeWindow`
  - `GET /api/v1/genres/movie`
  - `GET /api/v1/genres/tv`
- Implemented Redis caching:
  - Trending cache TTL: 3600 seconds
  - Genre cache TTL: 86400 seconds
- Implemented hourly trending refresh cron.
- Trending score formula:
  - `popularity * 0.5 + voteCount * 0.3 + recentRatingsCount * 0.2`

Result:

- Build passed.
- Lint passed.
- Full backend tests passed after later WP updates.
- Module follows the existing controller/service/module/test pattern used by Search.

Next step:

- Run live API smoke tests against seeded data when doing the final release pass.
- Review real trending ranking quality after more TMDB data is imported.

### WP-1.9: TMDB Client Module

Work completed:

- Added TMDB module:
  - `backend/src/modules/tmdb/tmdb.module.ts`
  - `backend/src/modules/tmdb/tmdb-client.service.ts`
  - `backend/src/modules/tmdb/tmdb-api.exception.ts`
  - `backend/src/modules/tmdb/interfaces/tmdb.interface.ts`
  - TMDB client tests under `backend/src/modules/tmdb/__tests__/`
- Registered `TmdbModule` in `backend/src/app.module.ts`.
- Implemented TMDB config usage from `.env`:
  - `TMDB_BASE_URL`
  - `TMDB_API_KEY`
  - `TMDB_DEFAULT_LANGUAGE`
  - `TMDB_RATE_LIMIT`
- Implemented Axios-based TMDB client with:
  - Redis cache for `tmdb:*` keys
  - TTL 3600 seconds
  - Bottleneck rate limiting
  - 3 retries with exponential backoff for 429 and 5xx responses
  - `TmdbApiException`
- Implemented TMDB methods for:
  - Movies
  - TV series and seasons
  - People
  - Genres
  - Trending
  - Changes
  - Image URL generation
- Added/expanded TMDB interfaces for movie, TV, season, person, credits, videos, images, changes, and paginated responses.

Result:

- TMDB client targeted tests passed.
- TMDB client service reached 100% statement/line/function coverage in scoped coverage.
- Full backend tests passed after later WP updates.

Next step:

- Add more integration-style checks only if TMDB network calls are enabled in a controlled environment.
- Keep TMDB API calls mocked in unit tests to avoid unstable external dependency.

### WP-1.10: TMDB Mapper & Sync Service

Work completed:

- Added mapper/sync/scheduler services:
  - `backend/src/modules/tmdb/tmdb-mapper.service.ts`
  - `backend/src/modules/tmdb/tmdb-sync.service.ts`
  - `backend/src/modules/tmdb/tmdb-scheduler.service.ts`
- Added TMDB admin DTOs/entities:
  - `backend/src/modules/tmdb/dto/full-import.dto.ts`
  - `backend/src/modules/tmdb/dto/tmdb-search-query.dto.ts`
  - `backend/src/modules/tmdb/dto/sync-logs-query.dto.ts`
  - `backend/src/modules/tmdb/entities/tmdb-response.entity.ts`
- Expanded `backend/src/modules/tmdb/tmdb.controller.ts` into the admin TMDB controller.
- Updated `backend/src/modules/tmdb/tmdb.module.ts` to import Search and provide/export TMDB services.
- Updated `backend/src/modules/tmdb/tmdb-client.service.ts` with TV changes support.
- Updated Movies module/service for optional on-demand TMDB movie import:
  - `backend/src/modules/movies/movies.module.ts`
  - `backend/src/modules/movies/movies.service.ts`
- Fixed backend start script in `backend/package.json`:
  - from `node dist/main.js`
  - to `node dist/src/main.js`

Implemented mapper behavior:

- TMDB movie -> local movie data
- TMDB TV -> local TV series data
- TMDB season/episode -> local season and episode data
- TMDB person -> local person data
- Cast, crew, trailers, images, genres, countries, companies mapping
- TMDB gender mapping:
  - 0/unknown -> `UNKNOWN`
  - 1 -> `FEMALE`
  - 2 -> `MALE`
  - 3 -> `NON_BINARY`

Implemented sync behavior:

- Full import for movies and TV pages.
- Daily incremental sync.
- Single movie import.
- Single TV import.
- Trending sync.
- Sync log query.
- Upsert support for related genres, countries, companies, people, cast, crew, trailers, images, seasons, and episodes.
- Search indexing calls through `SearchSyncService.syncMovie`, `syncSeries`, and `syncAll`.
- Respect `isAdminEdited` during daily sync unless forced.

Implemented admin endpoints under `/api/v1/admin/tmdb`:

- `POST /admin/tmdb/import/full`
- `POST /admin/tmdb/import/movie/:tmdbId`
- `POST /admin/tmdb/import/tv/:tmdbId`
- `GET /admin/tmdb/search/movie`
- `GET /admin/tmdb/search/tv`
- `POST /admin/tmdb/sync/daily`
- `GET /admin/tmdb/sync/logs`

Result:

- `npm run lint` passed.
- `npm run build` passed.
- `npm test` passed.
- Latest full backend test result:
  - Test suites: 15 passed
  - Tests: 137 passed
- TMDB scoped coverage:
  - Overall TMDB statements: 87.61%
  - Overall TMDB lines: 88.57%
  - `tmdb-client.service.ts`: 100% statements/lines/functions
  - `tmdb-scheduler.service.ts`: 100%
  - `tmdb.controller.ts`: 100%
- `npm start` now boots successfully and maps routes after the start script fix.

Next step:

- Run a controlled full import with enough TMDB pages to satisfy the Phase 1 movie-count checkpoint.
- Run live admin endpoint smoke tests with an ADMIN JWT.
- Review sync logs after the import and verify Search indexes are refreshed.

### Phase 1 Checkpoint Review

Commands verified:

```powershell
cd backend
npm run lint
npm run build
npm test
npm start
npm exec ts-node scripts/verify-import.ts
```

Verification result:

- Lint: passed.
- Build: passed.
- Unit tests: 15 suites passed, 137 tests passed.
- Backend boot: passed.
- Start script issue was found and fixed.
- PostgreSQL port 5432 reachable.
- Redis port 6379 reachable.
- Elasticsearch port 9200 reachable.

Current imported data snapshot from `scripts/verify-import.ts`:

```json
{
  "counts": {
    "genres": 27,
    "countries": 55,
    "companies": 365,
    "users": 6,
    "movies": 101,
    "tvSeries": 41,
    "people": 2018,
    "trailers": 101,
    "seasons": 455,
    "episodes": 9919
  }
}
```

Checkpoint status:

- Backend build/lint/test checkpoint: passed.
- Backend boot checkpoint: passed.
- DB/Redis/ES local port availability: passed.
- Phase 1 data-volume checkpoint is not fully met yet:
  - Current movies: 101
  - Target checkpoint: 500+ movies
- Live API smoke via foreground boot is confirmed, but complete curl/Postman E2E should still be repeated after the larger import.
- Do not tag `v0.2.0` yet.

Recommended next steps before closing Phase 1:

1. Run TMDB full import with enough movie pages to reach 500+ movies.
2. Run admin TMDB endpoint smoke tests with a valid ADMIN JWT.
3. Re-run Search reindex after import.
4. Verify:
   - `/api/v1/health`
   - `/api/v1/search/*`
   - `/api/v1/discover/*`
   - `/api/v1/trending/*`
   - `/api/v1/genres/*`
   - `/api/v1/admin/tmdb/*`
5. Re-run:

```powershell
cd backend
npm run lint
npm run build
npm test
npm exec ts-node scripts/verify-import.ts
```

6. If all checkpoints pass and movie count is 500+, tag `v0.2.0`.
