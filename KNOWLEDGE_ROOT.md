# ATS Resume Analyzer - Root Knowledge Base

Last updated: 2026-04-05
Scope: Monorepo-level architecture, infrastructure, deployment, and cross-cutting design decisions.

## 1) Repository Purpose

This repository contains a full-stack ATS Resume Analyzer platform.

- Frontend app: React + Vite + Tailwind glassmorphism UI.
- Backend API: Express + TypeScript + Prisma.
- Data layer: SQLite in the current committed Prisma schema/migrations.
- AI layer: Multi-provider model abstraction (OpenRouter/OpenAI/Anthropic/Gemini).
- Job execution: Async analysis queue with local in-memory mode or Redis-backed queue.

## 2) Top-Level Files and Their Role

- `README.md`
  - User/developer quick-start, setup flows (local and Docker), feature and architecture overview.
- `CLAUDE.md`
  - Deep reference guide for codebase conventions, model/entity map, endpoint catalog, and extension points.
- `docker-compose.yml`
  - Single-service orchestration for full app container, with persistent volumes for DB/uploads and health checks.
- `Dockerfile`
  - Multi-stage production build:
    - backend build stage
    - frontend build stage
    - runtime stage serving backend + built frontend
- `Dockerfile.simple`
  - Simpler build alternative; less stage separation/caching control.
- `run-docker.sh`
  - Convenience script enforcing env presence and running compose with useful status output.

## 3) Workspace Layout

- `ats-backend/`
  - API server, queue processors, Prisma schema/migrations, operational scripts, and tests.
- `ats-frontend/`
  - SPA routes/pages/components, API client/state layer, Playwright tests, build/test config.

## 4) System Architecture (High-Level)

Request/interaction shape:

1. User authenticates (JWT access + refresh session strategy).
2. User uploads or creates resume content.
3. User submits job description and optionally model settings.
4. Backend extracts/normalizes resume text.
5. Analysis pipeline calls selected AI provider.
6. Result is scored and persisted.
7. Frontend renders score visualizations, recommendations, inline resume improvement overlays, and a rendered PDF/page overlay preview with hover markers.
8. User can export resume as PDF/DOCX.

Core principles:

- Service-layer architecture on backend.
- Route layer handles HTTP concerns (validation/auth/response).
- Structured errors and request-context logging.
- Soft-delete pattern for user data safety.
- Persisted auth state and themed UX on frontend.

## 5) Environment and Runtime Assumptions

Local development defaults:

- Backend API: `http://localhost:3001`
- Frontend dev server: `http://localhost:3000` (Vite)

Containerized defaults:

- App served from a single container using configured host port (`APP_HOST_PORT`, defaults commonly to 3000 in compose workflow).
- Health endpoint used by container healthchecks.
- Persistent volumes for DB and uploads.

Key required secrets:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- AI provider key(s), especially OpenRouter key if using default provider strategy.

## 6) Cross-Cutting Operational Design

### Security and API Hygiene

- Auth via bearer JWT.
- Refresh tokens tracked in DB sessions.
- Reuse-detection/revocation approach for refresh lifecycle.
- Input sanitization for strings, JSON, URLs, and domain-specific text fields.
- Secure headers set in Express bootstrap.

### Rate Limiting and Quotas

- Two layers exist:
  - app-level route limiters
  - subscription-tier quota checks (free/pro/enterprise/admin)
- Note: there are code paths where strict limiters are relaxed/disabled in some environments for smoother local dev.

### Logging and Traceability

- Request context middleware injects request IDs.
- Structured logger includes contextual metadata.
- Error responses can include request linkage and operational classification.

## 7) Data and Persistence Summary

Main domain entities:

- User, Resume, ResumeVersion, Template, JobDescription, Analysis, AiUsage, RefreshSession, Subscription, AuditLog, System settings.

Notable patterns:

- `Resume` stores both legacy text and structured JSON representations.
- Version history captured separately for rollback/audit.
- Soft-deletion via `deletedAt` in multiple entities.
- Queue job metadata and analysis statuses support async polling UX.

## 8) Queue and Asynchronous Analysis

- Analysis endpoint supports queued workflow with job status polling.
- Queue mode is configurable:
  - Local/in-memory for simple dev.
  - Redis mode for more durable multi-process behavior.
- Processing pipeline includes extraction, AI analysis, persistence, and progress updates.

## 9) Build, Deploy, and Ops Notes

Build/deploy model:

- Backend and frontend are built and packaged into one runtime image in standard Docker flow.
- Backend serves static frontend build output in production container.

Operational scripts in backend folder support:

- seeding templates
- creating admin user role
- diagnostic checks for users/templates

Potential production caveats:

- SQLite is convenient but limits horizontal scalability.
- Local queue mode loses in-memory jobs on restart.
- Destructive reset env flags exist and should be handled carefully.

## 10) Frontend-Backend Contract Summary

API envelope convention:

- Success commonly includes `success: true` and `data` payload.
- Errors use message/code patterns from backend error middleware.

Important interactions:

- Auth store keeps refresh token persisted, access token mostly runtime-managed.
- Axios interceptor attempts token refresh and retries failed request flows.
- Analysis workflow may be synchronous-like from UI perspective but relies on async job completion in backend.

## 11) Testing Landscape (Repository-Wide)

Backend:

- Jest test setup with strong utility/service coverage in key areas.
- Middleware tests include auth/admin behaviors.
- Sanitizer utility has strong edge-case and security-focused tests.
- Analysis route integration now includes `GET /api/analyses/:id` contract coverage for parsed overlay payloads.

Frontend:

- Playwright-heavy E2E/integration setup with role/workflow/perf/accessibility scenarios.
- Multi-browser/device profiles configured.
- CI runs backend lint/test/build and frontend build plus Playwright smoke/integration scripts.

## 12) Current Strengths and Risk Areas

Strengths:

- Clear feature-complete baseline for ATS analysis use case.
- Good service separation and practical domain modeling.
- Rich frontend UX with reusable components and mobile-aware layouts.
- Async analysis queue supports scalable request handling model.

Risks/tech debt:

- Some limiter/security behaviors appear relaxed in defaults for convenience.
- Frontend unit/component testing depth trails E2E breadth.
- Stateful local/dev test infrastructure can be fragile without strict isolation.
- Multiple config surfaces can drift if not centrally governed.

## 13) Recommended Knowledge Expansion Files

To keep this knowledge evergreen, update these three files together on major changes:

- `KNOWLEDGE_ROOT.md` (this file)
- `ats-backend/KNOWLEDGE_BACKEND.md`
- `ats-frontend/KNOWLEDGE_FRONTEND.md`

Update checklist after feature work:

1. New routes/services/models/migrations.
2. New frontend pages/components/stores/contracts.
3. Env/config and deployment changes.
4. Test coverage additions and quality gaps.
5. Any design-system or UX paradigm shifts.
