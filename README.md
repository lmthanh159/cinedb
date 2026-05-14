# CineDB

CineDB is a movie and TV metadata platform scaffolded as a monorepo with three services:

- `backend/`: NestJS API server
- `frontend/`: Next.js web application
- `recommendation/`: Python FastAPI recommendation service
- `docker/`: local infrastructure for PostgreSQL, Redis, and Elasticsearch

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop / Docker Engine
- Python 3.12+

## Quick Start

1. Copy `.env.example` to `.env` and set `TMDB_API_KEY`.
2. Start infrastructure:

```bash
cd docker
docker compose up -d
```

3. Install and run the backend:

```bash
cd backend
npm install
npm run start:dev
```

4. Install and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

5. Install and run the recommendation service:

```bash
cd recommendation
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 5000
```

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
- `npm run prisma:seed`: run the placeholder seed script

### Frontend

- `npm run dev`: run Next.js locally
- `npm run build`: create production build
- `npm run start`: start the built app
- `npm run lint`: run ESLint
- `npm run test`: placeholder test script

## Documentation

- [architecture.md](./architecture.md)
- [implementation-roadmap.md](./implementation-roadmap.md)
- [phase-0-infrastructure.md](./phase-0-infrastructure.md)
- [phase-1-backend.md](./phase-1-backend.md)
- [phase-2-frontend.md](./phase-2-frontend.md)
- [phase-3-4-advanced-production.md](./phase-3-4-advanced-production.md)

## Notes

- This scaffold is prepared for WP-0.2 and intentionally keeps domain modules minimal.
- The generated `.env` still contains a placeholder `TMDB_API_KEY`; replace it before running import flows.

