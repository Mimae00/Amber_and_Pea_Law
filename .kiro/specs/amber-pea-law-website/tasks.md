# Implementation Plan: Amber & Pea Law Website

## Phase 1: Structure, PostgreSQL, API with migrations and seed data

- [x] 1. Monorepo skeleton
  - [x] 1.1 Root `.gitignore`, `.env.example`, `docker-compose.dev.yml` (PostgreSQL 16, named volume, health check, port 5432)
  - _Requirements: 1.1, 1.2_
- [x] 2. API project
  - [x] 2.1 Maven Wrapper, `pom.xml` (Spring Boot 3.5.16, Java 17), `application.yml` fully env-driven, `.env.example`
  - [x] 2.2 Flyway `V1__schema.sql` with check and exclusion constraints; `V2__seed_sample_content.sql`
  - [x] 2.3 Entities, repositories, DTOs and public read endpoints (practice areas, attorneys, reviews)
  - [x] 2.4 Security config (stateless JWT, bcrypt), admin bootstrap from env, login endpoint, CORS, rate-limit filter
  - [x] 2.5 Actuator liveness/readiness, stdout logging, `ProblemDetail` error handler
  - _Requirements: 1.3–1.6, 2.1–2.4, 7.1, 7.2, 8.3_

## Phase 2: Frontend pages connected to the API

- [x] 3. Frontend scaffold (Vite + React + TS, pinned versions, env config, router, layout, styles)
- [x] 4. Pages: Home, Practice Areas list/detail, Attorneys list/bio, Reviews, Contact, Disclaimer, Privacy
  - Book page is a request form placeholder until the slot picker in task 12
- [x] 5. SEO component, JSON-LD, robots.txt, sitemap.xml (generated from the API at build time)
- [x] 5.1 Pulled forward from task 10: `POST /api/leads` (validation, consent, honeypot, rate limit) so the forms work now
  - _Requirements: 3.1–3.7, 8.4–8.6_

## Phase 3: AI service, knowledge base, chatbot widget

- [x] 6. AI service config, LLM and embedding clients, Chroma factory (persistent/http)
  - Added `LLM_PROVIDER=none` (extractive answers) and `EMBEDDING_PROVIDER=default` (Chroma ONNX)
- [x] 7. Chunking, ingest, hybrid retriever with RRF, guardrails, prompt, SSE chat endpoint, health endpoints, rate limit, CORS
  - Fallbacks: LLM down -> best passage; embeddings down -> BM25 only
- [x] 8. Knowledge base markdown files and `ingest.py` wrapper
- [x] 9. Chat widget with streaming, citations, consent-gated lead capture, booking suggestion and fallback
  - _Requirements: 4.1–4.12, 8.2, 8.3_

## Phase 4: Booking, lead capture, admin dashboard

- [ ] 10. API: availability and booking endpoints (409 on conflict), notification stub (lead endpoint done in 5.1)
- [ ] 11. API: admin endpoints for leads, bookings, reviews, practice areas
- [ ] 12. Frontend: consultation and contact forms wired to API, booking page with slot picker and confirmation
- [ ] 13. Frontend: admin login, leads/bookings tables with filters and status updates, review and practice-area editors
  - _Requirements: 5.1–5.5, 6.1–6.3, 7.3–7.5, 8.1, 8.2_

## Phase 5: Tests, accessibility and performance, README

- [ ] 14. JUnit unit tests and Testcontainers integration tests
- [ ] 15. pytest suite for AI service
- [ ] 16. Vitest component tests
- [ ] 17. Accessibility and performance pass (focus, contrast, labels, lazy loading, bundle splitting)
- [ ] 18. README with full local setup
  - _Requirements: 8.4–8.8_
