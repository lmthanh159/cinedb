# CineDB

CineDB is a movie and TV metadata platform organized as a monorepo with three services:

- `backend/`: NestJS API server with Prisma, Redis, Elasticsearch, and TMDB sync
- `frontend/`: Next.js web application
- `recommendation/`: FastAPI recommendation service
- `docker/`: local PostgreSQL, Redis, and Elasticsearch infrastructure

Phase 1 is complete. The backend now includes authentication, movie/TV/person APIs, ratings, comments, user actions, Elasticsearch search/discover, trending/genres, and TMDB import/sync workflows.

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop / Docker Engine with Compose
- Python 3.14+ recommended for `recommendation/`
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

For the Phase 1 dataset checkpoint, run the backend and trigger the admin TMDB full import endpoint with enough pages to reach 500+ active movies.

```bash
cd backend
npm run start

# In another shell, login as the seeded admin and call:
# POST http://localhost:4000/api/v1/admin/tmdb/import/full
# Body: { "moviePages": 25, "tvPages": 1 }
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
uvicorn app.main:app --reload --host 127.0.0.1 --port 5000
```

## Local Endpoints

- Backend API: `http://localhost:4000/api/v1`
- Backend Swagger: `http://localhost:4000/api/docs`
- Frontend: `http://localhost:3000`
- Recommendation health: `http://localhost:5000/health`
- Elasticsearch: `http://localhost:9200`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Project Structure

```text
cinedb/
|- backend/
|- frontend/
|- recommendation/
|- docker/
|- .env.example
|- .gitignore
`- README.md
```

## Scripts

### Root

- `npm run build`: build backend and frontend
- `npm run lint`: lint backend and frontend
- `npm run test`: run backend and frontend test scripts

### Backend

- `npm run dev`: alias of `start:dev`
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

- `npm run dev`: run Next.js locally
- `npm run build`: create production build
- `npm run start`: start the built app
- `npm run lint`: run ESLint
- `npm run test`: placeholder test script

## Backend Modules

Phase 1 implemented these backend modules:

- Authentication and RBAC with JWT, refresh tokens, Redis token blacklist, Google OAuth hooks, and Swagger docs.
- Movies, TV series, and people APIs with public read endpoints, admin CRUD, Redis caching, and Prisma-backed pagination.
- Ratings, comments, reports, watchlist, favorites, activity feed, and public/current user profile APIs.
- Elasticsearch search, autocomplete, discover, and admin reindex with PostgreSQL fallback.
- Trending and genre APIs with Redis caching and scheduled refresh.
- TMDB client, mapper, full import, daily sync, trending sync, sync logs, and admin TMDB endpoints.

## Seeded and Imported Data

After the final Phase 1 checkpoint, the local database contained:

- 1 admin user and 5 test users
- 501 movies total, including 500 active movies
- 42 TV series total, including 41 active TV series
- 58,815 people records
- 114 trailers
- Elasticsearch indexes with 500 movies, 41 TV series, and 58,815 people

The exact counts for genres, countries, and companies can grow beyond the seed baseline because the TMDB import scripts upsert missing related records encountered during import.

## Phase 1 Checkpoint

Final backend checkpoint results:

- Docker infrastructure healthy: PostgreSQL, Redis, Elasticsearch.
- Elasticsearch cluster status: green.
- Backend health, Swagger, admin login, RBAC, movie search, discover, trending, genres, and TMDB sync logs smoke-tested.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm test -- --runInBand`: 15 suites passed, 139 tests passed.
- Latest full TMDB import logs: movie and TV imports completed with `SUCCESS` and `0` errors.

Phase 1 is ready to tag as `v0.2.0`.

## Documentation

- [architecture.md](./architecture.md)
- [implementation-roadmap.md](./implementation-roadmap.md)
- [phase-0-infrastructure.md](./phase-0-infrastructure.md)
- [phase-1-backend.md](./phase-1-backend.md)
- [phase-2-frontend.md](./phase-2-frontend.md)
- [phase-3-4-advanced-production.md](./phase-3-4-advanced-production.md)

## Notes

- Docker services verified: PostgreSQL, Redis, Elasticsearch
- Backend, frontend, and recommendation boot successfully in local development
- The generated `.env` still requires a real `TMDB_API_KEY` before import flows can run
