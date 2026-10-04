# Requirements: Amber & Pea Law Website

## Introduction

A portfolio project: a website for "Amber & Pea Law", a fictional personal injury and family law firm. It includes a hybrid-RAG AI chatbot, consultation booking, lead capture and an admin dashboard. All firm content (names, attorneys, reviews, addresses) is fictional and marked as sample content.

Scope is application code that runs locally. PostgreSQL runs in Docker via `docker-compose.dev.yml`; the frontend, API and AI service run directly on the host. No deployment artifacts (Dockerfiles for services, Kubernetes, Helm, Terraform, CI/CD) are created, but every service is container- and Kubernetes-ready.

## Glossary

- **Frontend**: React + Vite + TypeScript single-page app in `/frontend`.
- **API**: Java 17 + Spring Boot 3 service in `/api`.
- **AI_Service**: Python + FastAPI chatbot service in `/ai-service`.
- **Knowledge_Base**: markdown files plus ingest script in `/knowledge-base`.
- **Lead**: a contact record from a form, the chatbot or a booking.
- **Booking**: a reserved consultation time slot linked to a lead.
- **Admin**: an authenticated firm staff user.

## Requirements

### Requirement 1: Local infrastructure and configuration

**User Story:** As a developer, I want PostgreSQL in Docker and all services configured by environment variables, so that I can run locally now and containerize later.

#### Acceptance Criteria

1. THE repository SHALL contain a `docker-compose.dev.yml` that runs only PostgreSQL 16 with a named volume, a health check and port 5432.
2. THE `docker-compose.dev.yml` SHALL read the database name, user and password from a root `.env` file, and THE repository SHALL provide a root `.env.example`.
3. WHEN any service starts, THE service SHALL read all configuration (secrets, URLs, ports, origins) from environment variables, with a `.env.example` per service and no hardcoded secrets.
4. THE API and AI_Service SHALL be stateless, log to stdout, and expose liveness and readiness endpoints.
5. THE services SHALL communicate only over HTTP using configurable base URLs.
6. THE project SHALL pin exact dependency versions and use current stable versions compatible with Java 17.

### Requirement 2: Database schema and seed data

**User Story:** As a developer, I want versioned migrations with sample data, so that the site has content right after setup.

#### Acceptance Criteria

1. THE API SHALL manage the schema with Flyway migrations and SHALL validate (not generate) the schema at startup.
2. THE seed data SHALL include practice areas, attorneys and published reviews, all fictional and marked as sample content.
3. THE database SHALL prevent overlapping active bookings with a constraint (not only application logic).
4. THE database SHALL constrain enumerated values (lead source, status, review rating 1–5) with check constraints.

### Requirement 3: Public content pages

**User Story:** As a prospective client, I want to learn about the firm, so that I can decide whether to contact it.

#### Acceptance Criteria

1. THE Frontend SHALL provide Home, Practice Areas (list and detail), Attorneys (list and bio), Reviews, Book a Consultation, Contact, Disclaimer and Privacy Policy pages.
2. THE Home page SHALL show above the fold a hero with a click-to-call (`tel:`) button and a short consultation form, followed by practice areas, why choose us, testimonials and a call to action.
3. THE Reviews page SHALL show client testimonials with accessible star ratings.
4. THE Contact page SHALL show address, phone, a map placeholder and a contact form.
5. THE Disclaimer page and site footer SHALL state "Attorney advertising. Past results do not guarantee future outcomes."
6. THE site SHALL label firm content as sample content.
7. THE Frontend SHALL load practice areas, attorneys and reviews from the API.

### Requirement 4: AI chatbot

**User Story:** As a visitor, I want to ask questions in a chat widget, so that I get quick answers about the firm.

#### Acceptance Criteria

1. THE Frontend SHALL show a chatbot widget on every public page.
2. WHEN a visitor sends a message, THE AI_Service SHALL retrieve context using hybrid search (ChromaDB vectors + BM25) with rank fusion, and SHALL answer only from retrieved Knowledge_Base content.
3. THE AI_Service SHALL return citations identifying the Knowledge_Base sources used.
4. IF no retrieved content is relevant enough, THEN THE AI_Service SHALL say it does not have that information and offer a consultation instead of guessing.
5. THE AI_Service SHALL never give legal advice or promise outcomes; WHEN a visitor asks for advice or an outcome prediction, THE AI_Service SHALL say clearly that it cannot provide legal advice and offer a consultation.
6. WHEN a visitor needs real help, THE chatbot SHALL offer to book a consultation or collect contact details.
7. THE chatbot SHALL collect name, email and phone only after the visitor checks a consent checkbox, and SHALL save them as a Lead with source CHATBOT.
8. THE AI_Service SHALL stream responses token by token.
9. IF the AI_Service is unreachable or errors, THEN THE widget SHALL show a friendly fallback with the firm phone number and a booking link.
10. THE LLM provider SHALL be configurable: Ollama locally or any OpenAI-compatible API via environment variables.
11. THE vector store SHALL support embedded persistent mode and HTTP client mode, selected by environment variable.
12. THE Knowledge_Base SHALL contain FAQs, practice areas, fees and free consultation policy, office hours and location, and an ingest script that indexes them.

### Requirement 5: Consultation booking

**User Story:** As a prospective client, I want to pick a date and time slot, so that I can schedule a consultation.

#### Acceptance Criteria

1. THE API SHALL compute available slots from configurable business hours, business days, slot length, timezone, minimum notice and maximum days ahead.
2. WHEN a visitor picks a date, THE Frontend SHALL show only available slots for that date.
3. WHEN a visitor submits a booking for a free slot, THE API SHALL create a Lead with source BOOKING and a Booking, and THE Frontend SHALL show a confirmation screen.
4. IF the slot was taken concurrently, THEN THE API SHALL return HTTP 409 and THE Frontend SHALL ask the visitor to pick another slot.
5. WHEN a booking is created, THE API SHALL call a notification interface; the initial implementation SHALL be a logging stub.

### Requirement 6: Lead capture

**User Story:** As the firm, I want every inquiry saved, so that staff can follow up.

#### Acceptance Criteria

1. WHEN the consultation form, contact form, chatbot or booking flow is submitted, THE API SHALL save a Lead with its source (CONSULTATION_FORM, CONTACT_FORM, CHATBOT, BOOKING).
2. THE API SHALL require explicit consent to be contacted before saving a Lead.
3. IF the honeypot field is filled, THEN THE API SHALL silently discard the submission and return a success-shaped response.

### Requirement 7: Admin dashboard

**User Story:** As firm staff, I want a protected dashboard, so that I can manage leads, bookings and content.

#### Acceptance Criteria

1. THE API SHALL authenticate admins with Spring Security and bcrypt-hashed passwords.
2. WHEN the API starts and no admin exists, THE API SHALL create the first admin from environment variables.
3. THE `/admin` area SHALL let admins view and filter leads and bookings and update their status (NEW, CONTACTED, BOOKED, CLOSED; bookings also CANCELLED, which frees the slot).
4. THE `/admin` area SHALL let admins add and edit reviews and practice areas.
5. IF a request to an admin endpoint lacks a valid token, THEN THE API SHALL return HTTP 401.

### Requirement 8: Quality and security

**User Story:** As the site owner, I want a secure, accessible, fast site, so that it is trustworthy and ranks well.

#### Acceptance Criteria

1. THE Frontend and API SHALL validate all input; THE API SHALL use parameterized queries only.
2. THE API and AI_Service SHALL rate-limit chat and form endpoints per client IP and return HTTP 429 when exceeded.
3. THE API and AI_Service SHALL restrict CORS to configured origins.
4. THE Frontend SHALL aim for WCAG 2.1 AA: semantic HTML, labelled controls, keyboard navigation, visible focus and sufficient contrast.
5. THE Frontend SHALL aim for Lighthouse 90+ on mobile and lazy-load images.
6. THE Frontend SHALL set meta tags per page, provide a sitemap, and include schema.org LegalService JSON-LD.
7. THE project SHALL include JUnit tests (Testcontainers PostgreSQL for integration), pytest tests for the AI_Service and Vitest component tests for the Frontend.
8. THE README SHALL document local setup for each service.
