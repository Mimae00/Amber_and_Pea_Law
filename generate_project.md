I want to build a portfolio project: a law firm website with a built-in AI chatbot, consultation booking and lead capture. It will show Upwork clients that I can build complete AI-powered websites for service businesses.

About me: I'm a Full Stack and DevOps Engineer (React, Java Spring Boot, Python, PostgreSQL, RAG/LLMs, AWS). I have an existing hybrid RAG project (ChromaDB + BM25 + reranking + Ollama), so use a similar approach for the chatbot.

## Scope for now: code only

Build only the application code and make it run locally.
Do NOT create deployment files for the app: no Dockerfiles for the services, no Kubernetes manifests, Helm charts, Terraform or CI/CD workflows. I'll add Docker, Kubernetes and Terraform for the app myself after local testing.

The one exception is the database:
- PostgreSQL runs in Docker for local development. Docker Desktop is already installed on my Windows machine.
- Create a single dev-only file, docker-compose.dev.yml, that runs only PostgreSQL 16 with a named volume, a health check and port 5432.
- Read the database name, user and password from a root .env file (provide a .env.example). Never hardcode credentials.
- You can start it yourself with `docker compose -f docker-compose.dev.yml up -d` and check it's healthy before running migrations.
- The frontend, API and AI service run directly on my machine, not in containers.

The code must still be ready for containers and Kubernetes later:
- All config through environment variables, with a .env.example for each service. No hardcoded secrets, URLs or ports.
- Stateless services. Logs go to stdout.
- Health and readiness endpoints on every backend service.
- Each service runs on its own and talks to the others only over HTTP using configurable URLs.

## Fictional client

The firm is "Amber & Pea Law", a fictional personal injury and family law firm. Do not use any real firm's name, attorneys or logos. Mark all content as sample content.

## Architecture (monorepo)

- /frontend: React + Vite + TypeScript, responsive, mobile-first
- /api: Java 17 + Spring Boot 3 (a version that supports Java 17) + PostgreSQL (Flyway migrations). Handles leads, bookings, reviews, practice areas, attorneys and admin auth. Use Maven with the Maven Wrapper.
- /ai-service: Python + FastAPI. Hybrid RAG chatbot using ChromaDB vectors + BM25, rank fusion and citations. LLM provider is configurable: Ollama locally, or any OpenAI-compatible API through env variables. Vector store should support both embedded/persistent mode (local) and HTTP client mode (for later).
- /knowledge-base: markdown files the chatbot learns from (FAQs, practice areas, fees and free consultation policy, office hours, location), plus an ingest script.
- README.md with local setup steps for each service: start PostgreSQL with Docker Compose, then run the API, AI service and frontend directly. Ollama is installed locally on Windows.

Use current stable versions that are compatible with Java 17, and pin exact dependency versions.

## Pages

- Home: hero with click-to-call button and short consultation form above the fold, practice areas, why choose us, testimonials, call to action
- Practice Areas: list page and a detail page for each area
- Attorneys: profile cards and bio pages
- Reviews: client testimonials with star ratings
- Book a Consultation: pick a date and an available time slot
- Contact: address, phone, map placeholder, contact form
- Legal pages: disclaimer ("Attorney advertising. Past results do not guarantee future outcomes."), privacy policy

## Features

1. AI chatbot widget on every page
   - Answers only from the knowledge base and cites its sources
   - Never gives legal advice and never promises outcomes; says so clearly when asked
   - Offers to book a consultation or collect contact details when a visitor needs real help
   - Collects name, email and phone only with a consent checkbox
   - Streams responses, and shows a friendly fallback if the AI service is down
2. Consultation booking
   - Business hours and slot length are configurable
   - No double booking (enforce at the database level)
   - Confirmation screen; email notification can be a stub interface for now
3. Lead capture
   - Consultation and contact forms save to the database with a source (form, chatbot, booking)
4. Admin dashboard (/admin)
   - Login with Spring Security, bcrypt passwords, first admin created from env variables
   - View and filter leads and bookings, and update their status (new, contacted, booked, closed)
   - Add and edit reviews and practice areas

## Quality and security

- Input validation on frontend and backend; parameterized queries only
- Rate limiting on chat and form endpoints, plus honeypot spam protection on forms
- CORS restricted to configured origins
- Accessibility: aim for WCAG 2.1 AA (semantic HTML, labels, keyboard navigation, focus states, color contrast)
- Performance: aim for Lighthouse 90+ on mobile; lazy-load images
- SEO: meta tags per page, sitemap, and schema.org LegalService JSON-LD
- Tests: JUnit for the API (use Testcontainers for PostgreSQL integration tests, since Docker is available), pytest for the AI service, and a few Vitest component tests for the frontend

## How to work

Use a spec: requirements, then design, then tasks. Build in phases and let me test each one locally before moving on:
1. Project structure, PostgreSQL in Docker, API with migrations and seed data
2. Frontend pages connected to the API
3. AI service, knowledge base and chatbot widget
4. Booking, lead capture and admin dashboard
5. Tests, accessibility and performance pass, README

At the end of each phase, tell me the exact PowerShell commands to run and test it locally.
