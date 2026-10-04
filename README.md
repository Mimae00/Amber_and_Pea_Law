# Amber & Pea Law Website (portfolio project)

A law firm website with an AI chatbot, consultation booking, lead capture and an admin dashboard.

> **Sample content.** Amber & Pea Law is a fictional firm. All names, attorneys, reviews and details are invented.

| Folder | Stack | Status |
|---|---|---|
| `api/` | Java 17, Spring Boot 3.5.16, PostgreSQL 16, Flyway | Phase 1 |
| `frontend/` | React 19, Vite 8, TypeScript 6 | Phase 2 |
| `ai-service/` | Python 3.13, FastAPI, ChromaDB + BM25, Ollama | Phase 3 |
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

## 4. Run the AI service (chatbot)

Requires Python 3.11+ (tested with 3.13) and, for the default setup, Ollama.

```powershell
ollama pull nomic-embed-text        # embeddings (local)
ollama pull llama3.2:1b             # answers (local); any Ollama chat model works

cd ai-service
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env

cd ..
ai-service\.venv\Scripts\python knowledge-base\ingest.py    # index the knowledge base

cd ai-service
.venv\Scripts\python -m app.main    # http://localhost:8000  (docs at /docs)
```

Re-run the ingest after editing `knowledge-base/*.md`, then restart the service.

How it answers:

1. Fixed guardrail replies (no model involved) for greetings, emergencies and outcome questions ("will I win", "what's my case worth"). Advice questions ("do I have a case") always get a no-legal-advice disclaimer first.
2. Hybrid retrieval: ChromaDB vector search + BM25 keyword search, merged with Reciprocal Rank Fusion.
3. Relevance gate: if nothing matches well enough, it says it doesn't have that information and offers a consultation.
4. The LLM writes a short answer from the retrieved passages only, streamed over Server-Sent Events, with citations.

Provider options (`ai-service/.env`):

| Setting | Options |
|---|---|
| `LLM_PROVIDER` | `ollama` (local, default), `openai` (any OpenAI-compatible API via `LLM_BASE_URL` + `LLM_API_KEY`), `none` (no LLM: replies with the best-matching passage) |
| `EMBEDDING_PROVIDER` | `ollama` (default), `openai`, `default` (Chroma's built-in local ONNX model, no Ollama needed) |
| `CHROMA_MODE` | `persistent` (embedded folder, default), `http` (Chroma server at `CHROMA_HOST:CHROMA_PORT`) |

If the LLM is unreachable, the service falls back to the best-matching passage. If embeddings are unavailable, it falls back to BM25 only. If the whole AI service is down, the widget shows the phone number and booking link.

`llama3.2:1b` is fast but sometimes adds details that aren't in the context. `llama3.2:3b` or larger gives noticeably more faithful answers.

Endpoints: `POST /chat/stream`, `GET /health/live`, `GET /health/ready` (503 until the knowledge base is indexed).

## Stop / reset

```powershell
docker compose -f docker-compose.dev.yml down        # stop, keep data
docker compose -f docker-compose.dev.yml down -v     # stop and delete the database volume
```
