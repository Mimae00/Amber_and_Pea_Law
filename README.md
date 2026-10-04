# Amber & Pea Law Website (portfolio project)

A law firm website with an AI chatbot, consultation booking, lead capture and an admin dashboard.

> **Sample content.** Amber & Pea Law is a fictional firm. All names, attorneys, reviews and details are invented.

| Folder | Stack | Status |
|---|---|---|
| `api/` | Java 17, Spring Boot 3.5.16, PostgreSQL 16, Flyway | Phase 1 |
| `frontend/` | React 19, Vite 8, TypeScript 6 | Phase 2 |
| `ai-service/` | Python, FastAPI, ChromaDB + BM25 | Phase 3 |
| `knowledge-base/` | Markdown + ingest script | Phase 3 |

The spec lives in `.kiro/specs/amber-pea-law-website/`.

## Prerequisites (Windows)

- Docker Desktop (PostgreSQL only)
- JDK 17 (Maven is not required; the Maven Wrapper downloads it)
- Node.js 22.12+ (tested with 24)

## 1. Start PostgreSQL

```powershell
Copy-Item .env.example .env        # then set POSTGRES_PASSWORD
docker compose -f docker-compose.dev.yml up -d
docker inspect --format "{{.State.Health.Status}}" amber-pea-postgres   # wait for "healthy"
```

If port 5432 is already taken, set `POSTGRES_PORT=5433` in `.env` and use that port in `DB_URL` below.

## 2. Run the API

```powershell
cd api
Copy-Item .env.example .env        # set DB_PASSWORD (same as root .env), JWT_SECRET, ADMIN_PASSWORD
.\mvnw.cmd spring-boot:run
```

`api/.env` is imported by `application.yml` for local runs. Real environment variables override it.
Flyway applies the migrations and sample data on startup. The first admin is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if no admin exists.

Endpoints so far:

- `GET /actuator/health/liveness`, `GET /actuator/health/readiness`
- `GET /api/practice-areas`, `GET /api/practice-areas/{slug}`
- `GET /api/attorneys`, `GET /api/attorneys/{slug}`
- `GET /api/reviews?limit=`
- `POST /api/leads` (consultation and contact forms; consent required, honeypot, 5/min per IP)
- `POST /api/auth/login`, `GET /api/auth/me` (Bearer token)

## 3. Run the frontend

```powershell
cd frontend
Copy-Item .env.example .env.local   # API URL, AI URL, site URL
npm ci
npm run dev                         # http://localhost:5173
```

`npm run build` type-checks and builds to `dist/`. It also writes `sitemap.xml` (practice area and attorney pages are included when the API is running) and `robots.txt`.

## Stop / reset

```powershell
docker compose -f docker-compose.dev.yml down        # stop, keep data
docker compose -f docker-compose.dev.yml down -v     # stop and delete the database volume
```
