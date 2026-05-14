# CineDB

CineDB is a movie and TV metadata platform organized as a monorepo with three services:

- `backend/`: NestJS API server with Prisma and TMDB import scripts
- `frontend/`: Next.js web application
- `recommendation/`: FastAPI recommendation service
- `docker/`: local PostgreSQL, Redis, and Elasticsearch infrastructure

Phase 0 is implemented through `WP-0.4`, including Docker infrastructure, Prisma schema and migrations, seed data, and TMDB import flows.

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

6. Run the services:

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

### Frontend

- `npm run dev`: run Next.js locally
- `npm run build`: create production build
- `npm run start`: start the built app
- `npm run lint`: run ESLint
- `npm run test`: placeholder test script

## Seeded and Imported Data

After running Phase 0 setup, the database is expected to contain at least:

- 1 admin user and 5 test users
- 100 imported movies
- 40 imported TV series
- 2000+ people records
- posters and backdrops populated from TMDB URLs

The exact counts for genres, countries, and companies can grow beyond the seed baseline because the TMDB import scripts upsert missing related records encountered during import.

## Documentation

- [architecture.md](./architecture.md)
- [implementation-roadmap.md](./implementation-roadmap.md)
- [phase-0-infrastructure.md](./phase-0-infrastructure.md)
- [phase-1-backend.md](./phase-1-backend.md)
- [phase-2-frontend.md](./phase-2-frontend.md)
- [phase-3-4-advanced-production.md](./phase-3-4-advanced-production.md)

## Notes

- Docker services verified in Phase 0: PostgreSQL, Redis, Elasticsearch
- Backend, frontend, and recommendation all boot successfully in local development
- The generated `.env` still requires a real `TMDB_API_KEY` before import flows can run
