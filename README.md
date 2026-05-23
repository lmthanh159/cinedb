# CineDB

CineDB is a movie and TV metadata platform organized as a monorepo with three services:

- `backend/`: NestJS API server with Prisma, Redis, Elasticsearch, and TMDB sync
- `frontend/`: Next.js 16 web application
- `recommendation/`: FastAPI recommendation service
- `docker/`: local PostgreSQL, Redis, and Elasticsearch infrastructure

Phase 1 (backend), Phase 2 (frontend core), and Phase 3 (user features & admin dashboard) are complete.

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop / Docker Engine with Compose
- Python 3.11+ for `recommendation/`
- A valid `TMDB_API_KEY`

## Quick Start

1. Copy `.env.example` to `.env` and set `TMDB_API_KEY`.
2. Start infrastructure:

```bash
cd docker
docker compose up -d
```

3. Install JavaScript dependencies:

```bash
npm install
```

4. Prepare the database:

```bash
cd backend
npm run prisma:migrate
npm run prisma:generate
npx prisma db seed
```

5. Import TMDB sample data:

```bash
cd backend
npm run tmdb:import
npm run tmdb:import:tv
```

For a larger dataset, run the backend and trigger the admin TMDB full import endpoint:

```bash
cd backend
npm run start

# In another shell, login as the seeded admin and call:
# POST http://localhost:4000/api/v1/admin/tmdb/import/full
# Body: { "moviePages": 25, "tvPages": 5 }
```

6. Run the services in development:

```bash
# backend
cd backend
npm run start:dev

# frontend
cd frontend
npm run dev

# recommendation
cd recommendation
python -m pip install -r requirements.txt
python scripts/train.py
uvicorn app.main:app --reload --host 127.0.0.1 --port 5000
```

The recommendation service exposes `GET /health`, `GET /recommend/similar/{movie_id}`,
`GET /recommend/personalized/{user_id}`, and `POST /recommend/retrain`. The NestJS
backend proxies these through `/api/v1/recommendations/*` and falls back to Prisma
queries if the Python service is unavailable.

## Local Endpoints

- Backend API: `http://localhost:4000/api/v1`
- Backend Swagger: `http://localhost:4000/api/docs`
- Frontend: `http://localhost:3000`
- Recommendation health: `http://localhost:5000/health`
- Elasticsearch: `http://localhost:9200`
- PostgreSQL: `localhost:55432`
- Redis: `localhost:6379`

## Project Structure

```text
cinedb/
├── backend/
├── frontend/
│   └── src/
│       ├── app/               # Next.js App Router pages
│       ├── components/
│       │   ├── ui/            # Atomic components
│       │   ├── movie/         # Movie/TV/person domain components
│       │   ├── layout/        # Header, Footer, SearchBar
│       │   └── auth/          # Auth guards and provider
│       ├── lib/               # API client, utils, constants
│       ├── store/             # Zustand stores
│       ├── hooks/             # Custom React hooks
│       └── types/             # TypeScript interfaces
├── recommendation/
├── docker/
├── .env.example
└── README.md
```

## Scripts

### Root

- `npm run build`: build backend and frontend
- `npm run lint`: lint backend and frontend
- `npm run test`: run backend and frontend test scripts

### Backend

- `npm run start:dev`: run NestJS in watch mode
- `npm run build`: compile TypeScript to `dist/`
- `npm run start`: run compiled server
- `npm run lint`: run ESLint
- `npm run test`: run Jest
- `npm run prisma:migrate`: run Prisma migrations
- `npm run prisma:generate`: generate Prisma client
- `npm run prisma:studio`: open Prisma Studio
- `npm run prisma:seed`: run the Prisma seed script
- `npm run tmdb:import`: import sample TMDB movies, cast, crew, trailers, genres, countries, and companies
- `npm run tmdb:import:tv`: import sample TMDB TV series, seasons, episodes, cast, crew, trailers, genres, countries, and companies

### Backend Phase 1 Verification

```bash
cd backend
npm run lint
npm run build
npm test -- --runInBand
npm exec ts-node scripts/verify-import.ts
```

Rebuild Elasticsearch after large imports:

```bash
# Login as an ADMIN user first, then call:
POST http://localhost:4000/api/v1/admin/search/reindex
```

### Frontend

- `npm run dev`: run Next.js locally with Turbopack
- `npm run build`: create production build
- `npm run start`: start the built app
- `npm run lint`: run ESLint

## Backend Modules

Phase 1 implemented these backend modules:

- Authentication and RBAC with JWT, refresh tokens, Redis token blacklist, Google OAuth hooks, and Swagger docs.
- Movies, TV series, and people APIs with public read endpoints, admin CRUD, Redis caching, and Prisma-backed pagination.
- Ratings, comments, reports, watchlist, favorites, activity feed, and public/current user profile APIs.
- Elasticsearch search, autocomplete, discover, and admin reindex with PostgreSQL fallback.
- Trending and genre APIs with Redis caching and scheduled refresh.
- TMDB client, mapper, full import, daily sync, trending sync, sync logs, and admin TMDB endpoints.

Phase 3 added these backend modules:

- **Admin dashboard** — aggregate stats (total users, ratings, comments), ratings-over-time chart, top-rated movies list, and genre distribution chart.
- **Admin user management** — paginated user list with search, lock/unlock with duration, role update, per-user rating and comment counts.
- **Admin comment moderation** — paginated comment list filterable by status and reported flag; hide, restore, and soft delete actions with report resolution.
- **Admin people CRUD** — `GET/POST /admin/people`, `PUT/DELETE /admin/people/:id` with full person fields (gender, biography, birthday, deathday, place of birth).
- **Admin genres CRUD** — `GET/POST /admin/genres`, `PATCH/DELETE /admin/genres/:id` with slug auto-generation; delete returns 409 if genre is still in use.
- **Recommendations module** — proxies `GET /recommend/similar/:id` and `GET /recommend/personalized/:userId` to the FastAPI service; falls back to Prisma queries when the service is unavailable.

## Frontend Pages

Phase 2 implemented the following routes:

| Route | Description |
|---|---|
| `/` | Homepage — hero banner, trending toggle (day/week), five horizontal scroll sections |
| `/movies` | Movie listing with category filter tabs and pagination |
| `/tv` | TV series listing with category filter tabs and pagination |
| `/movie/[id]` | Movie detail — hero, cast carousel, trailers/posters/backdrops tabs, reviews, similar movies |
| `/movie/[id]/cast` | Full cast and crew grouped by department |
| `/tv/[id]` | TV show detail — hero with season count, cast, media tabs, reviews, similar series |
| `/tv/[id]/cast` | Full cast and crew for a TV series |
| `/person/[id]` | Person detail — biography with expand/collapse, movie/TV credits, profile photos, filmography table |
| `/people` | People listing with search |
| `/search` | Full-text search results across movies, TV shows, and people |
| `/discover/movie` | Discover movies by genre, year, rating, and sort order |
| `/discover/tv` | Discover TV series by genre, year, rating, and sort order |
| `/login` | Login form with email/password |
| `/register` | Registration form |
| `/forgot-password` | Password reset request |
| `/auth/callback` | OAuth redirect handler |

Phase 3 added the following routes:

| Route | Description |
|---|---|
| `/profile` | User profile — display name, bio, and avatar |
| `/watchlist` | Paginated user watchlist with movie/TV cards and remove action |
| `/favorites` | Paginated user favorites with movie/TV cards and remove action |
| `/ratings` | User ratings history — score badge, media poster, and unrate action |
| `/activity` | User activity feed — ratings, comments, watchlist, and favorite events |
| `/verify-email` | Email verification via one-time token |
| `/admin` | Admin dashboard — aggregate stats cards and charts (ratings trend, top movies, genre distribution) |
| `/admin/users` | Admin user management — search, lock/unlock, role update, per-user stats |
| `/admin/comments` | Admin comment moderation — filter by status and reported flag, hide/restore/soft delete |
| `/admin/movies` | Admin movie browser — import by TMDB ID, link to detail page |
| `/admin/tv` | Admin TV series browser — import by TMDB ID, link to detail page |
| `/admin/people` | Admin people management — full CRUD (name, gender, bio, birthday/deathday, place of birth) |
| `/admin/genres` | Admin genres management — create/edit/delete with slug and TMDB ID; delete blocked when genre is in use |
| `/admin/tmdb` | Admin TMDB sync — trigger full import, configure page counts, paginated sync log table |

## Frontend Components

### UI (`src/components/ui/`)

| Component | Description |
|---|---|
| `Button` | Primary/secondary/ghost/danger variants, sm/md/lg sizes, loading state |
| `Input` | Controlled text input with error state and label |
| `Modal` | Focus-trapped dialog with backdrop, portal-mounted |
| `Dropdown` | Accessible menu with keyboard navigation |
| `Avatar` | Circular image with initials fallback |
| `Badge` | Small label with color variants |
| `Skeleton` | Animated loading placeholder |
| `Pagination` | Page number navigation with prev/next |
| `ScrollableRow` | Horizontal scroll container with hover-reveal left/right chevron buttons |
| `StarRating` / `RatingCircle` | Interactive star input and circular score display |
| `Toaster` | Toast notification stack |

### Movie / TV / Person (`src/components/movie/`)

| Component | Description |
|---|---|
| `MovieCard` | Poster card with rating badge, watchlist/favorite actions, routes for both movies and TV |
| `MovieGrid` | Responsive CSS grid of `MovieCard` items |
| `MovieCarousel` | Auto-advancing banner carousel |
| `HeroBanner` | Full-width hero with sliding featured items and play/info CTAs |
| `TrendingSection` | Day/week toggle with `ScrollableRow` of trending items |
| `MovieHero` | Detail page hero — backdrop, poster, score circle, genres, crew highlights |
| `MovieSidebar` | Metadata sidebar — original title, budget, revenue, languages, companies |
| `MovieActions` | Client island for watchlist, favorite, and rating actions on movie detail |
| `TvHero` | TV detail hero with "TV Series" badge and season count |
| `TvSidebar` | TV metadata sidebar — status, seasons, episodes, air dates |
| `TvActions` | Client island for watchlist, favorite, and rating actions on TV detail |
| `CastCarousel` | Horizontal scroll of top-billed cast with link to full cast page |
| `MediaTabs` | Trailers/Backdrops/Posters tab panel with `ScrollableRow` per tab |
| `TrailerModal` | YouTube embed modal triggered from MediaTabs |
| `CommentSection` | Full comment section — rating badge, expand/collapse, optimistic submit, edit/delete/report, paginated load-more; used on both movie and TV detail pages |
| `ReviewCard` | Single review display with author, date, score, and body |
| `CastSection` | Full cast grid used on `/[id]/cast` pages |
| `SearchResultCard` | Single result card for search results page |
| `SearchResultGrid` | Grid layout for search results |
| `DiscoverContent` | Client component handling discover filters and pagination |
| `MediaSection` | Reusable section wrapper with heading and optional "see all" link |

### Layout (`src/components/layout/`)

| Component | Description |
|---|---|
| `Header` | Sticky top bar — logo, main nav, search bar, auth menu |
| `SearchBar` | Debounced autocomplete with `AbortController`, keyboard-accessible results dropdown |
| `Footer` | Site footer with links |

### Auth (`src/components/auth/`)

| Component | Description |
|---|---|
| `AuthProvider` | Zustand store hydration and token refresh on mount |
| `ProtectedRoute` | Redirects unauthenticated users to `/login` |

## Frontend Architecture Notes

- **Server components by default.** `'use client'` only when state, effects, or browser APIs are needed.
- **ISR caching.** Detail pages revalidate every 3600 s; the homepage revalidates every 60 s.
- **API access.** Server components fetch directly to the backend via `NEXT_PUBLIC_API_URL`. Client components use the Axios instance in `src/lib/api.ts` which attaches the JWT and handles 401 refresh.
- **Named Tailwind groups.** `ScrollableRow` uses `group/scroll` so its hover arrows do not trigger `group-hover:scale-105` on child `MovieCard` components.
- **`mediaType` prop threading.** `MovieCard`, `MovieGrid`, and `MovieCarousel` accept `mediaType?: 'movie' | 'tv'` so TV shows route to `/tv/[id]` instead of `/movie/[id]`.
- **Adapters.** `tvToMovieSummary` and `trendingToMovieSummary` in `page.tsx` normalise API shapes into `MovieSummary` before passing to shared components.

## Seeded and Imported Data

After the Phase 1 checkpoint, the local database contained:

- 1 admin user and 5 test users
- 501 movies total, including 500 active movies
- 42 TV series total, including 41 active TV series
- 58,815 people records
- 114 trailers
- Elasticsearch indexes with 500 movies, 41 TV series, and 58,815 people

## Phase 1 Checkpoint (v0.2.0)

- Docker infrastructure healthy: PostgreSQL, Redis, Elasticsearch.
- Elasticsearch cluster status: green.
- Backend health, Swagger, admin login, RBAC, movie search, discover, trending, genres, and TMDB sync logs smoke-tested.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm test -- --runInBand`: 15 suites passed, 139 tests passed.
- Latest full TMDB import logs: movie and TV imports completed with `SUCCESS` and `0` errors.

## Phase 2 Checkpoint (v0.3.0)

- All 16 frontend routes implemented and verified with `npm run build`.
- Homepage horizontal scroll sections with chevron navigation (ScrollableRow).
- Movie and TV detail pages with hero, cast carousel, media tabs (trailers/posters/backdrops), reviews, and similar content.
- Full cast & crew pages for both movies and TV series, crew grouped by department.
- Person detail page with biography expand/collapse, movie/TV credits, filmography table, and profile photos.
- Search with debounced autocomplete, AbortController race-condition prevention, and full results page.
- Discover pages for movies and TV with genre, year, rating, and sort filters.
- Auth flow: login, register, forgot-password, OAuth callback, protected profile page.
- Responsive dark-mode design throughout; Tailwind v3.4.19 with Turbopack.
- `npm run build`: passed with zero type errors and zero lint warnings.

## Phase 3 Checkpoint (v0.4.0)

- 14 new frontend routes implemented: user account pages (profile, watchlist, favorites, ratings, activity, verify-email) and admin dashboard pages (overview, users, comments, movies, TV, people, genres, TMDB sync).
- Admin dashboard with stats cards and three charts: ratings trend over time, top-rated movies, and genre distribution.
- Admin user management: search, lock/unlock with duration, promote/demote role.
- Admin comment moderation: filter by status and reported-only flag, hide/restore/soft delete with report auto-resolution.
- Admin people CRUD: create/edit modal with all person fields; hard delete with confirmation.
- Admin genres CRUD: create/edit modal with name, slug, and TMDB ID; delete disabled when genre is in use (409 handling).
- Admin TMDB sync: full import trigger with configurable page counts; paginated sync log table with status badges.
- `CommentSection` component replaces `ReviewSection` and `TvReviewSection` on movie and TV detail pages: displays rating badge, supports edit/delete for own comments, report modal for others, optimistic insert with rollback, char counter, and paginated load-more.
- New movie/TV detail components: `MovieActions`, `MovieSidebar`, `TvHero`, `TvSidebar`, `TvActions`, `CastCarousel`, `MediaTabs`, `TrailerModal`.
- Backend: admin people and genres CRUD endpoints, admin dashboard stats/charts, admin user management with lock/unlock, admin comment moderation with soft delete, and recommendations proxy module.
- `npx tsc --noEmit`: zero errors.
- `npm run lint`: zero errors in new Phase 3 files.

## Documentation

- [architecture.md](./architecture.md)
- [implementation-roadmap.md](./implementation-roadmap.md)
- [phase-0-infrastructure.md](./phase-0-infrastructure.md)
- [phase-1-backend.md](./phase-1-backend.md)
- [phase-2-frontend.md](./phase-2-frontend.md)
- [phase-3-4-advanced-production.md](./phase-3-4-advanced-production.md)

## Notes

- Docker services verified: PostgreSQL, Redis, Elasticsearch.
- Backend, frontend, and recommendation service boot successfully in local development.
- The generated `.env` requires a real `TMDB_API_KEY` before import flows can run.
- Tailwind v4 is incompatible with Next.js 16 + Turbopack; the project pins Tailwind v3.4.19.
