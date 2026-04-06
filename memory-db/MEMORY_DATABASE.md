# ATS Resume Analyzer - Memory Database

Last updated: 2026-04-02
Scope: Cross-repo memory index for fast Q and A without rescanning the full codebase.

## 1) Purpose

This file is a persistent memory layer for this project. It captures:

- what each major part of the code does
- how backend and frontend connect
- where to look for specific behavior
- what changed in architecture maturity (queue, RBAC, admin governance, analytics)

Use this as the first source when answering questions about code meaning.

## 2) High-Level Architecture

- Monorepo with `ats-backend` (Express + TypeScript + Prisma) and `ats-frontend` (React + Vite).
- DB is SQLite in current committed schema/migrations.
- AI analysis supports multiple providers: OpenRouter, OpenAI, Anthropic, Gemini.
- Analysis execution is asynchronous by default via queue + polling (`jobId`).
- Production Docker flow builds frontend + backend into one runtime container.

## 3) Backend Memory

### 3.1 Entry and request lifecycle

Core files:

- `ats-backend/src/index.ts`
- `ats-backend/src/middleware/request-context.middleware.ts`
- `ats-backend/src/middleware/error.middleware.ts`

Lifecycle summary:

1. security headers + CORS checks
2. request context with request ID and logger context
3. global and route-specific rate limiting
4. route dispatch (`/api/auth`, `/api/resumes`, `/api/templates`, `/api`, `/api/admin`)
5. structured 404 handler
6. global error normalization (AppError-aware)

### 3.2 Auth and authorization

Core files:

- `ats-backend/src/routes/auth.routes.ts`
- `ats-backend/src/services/auth.service.ts`
- `ats-backend/src/middleware/auth.middleware.ts`
- `ats-backend/src/middleware/admin.middleware.ts`

Key behavior:

- Access token: JWT, HS256, short-lived.
- Refresh token: JWT + DB-backed refresh session, hash stored in DB.
- Rotation on refresh, reuse detection logic, and mass revocation path.
- Admin checks support role-based admin and legacy subscription-tier fallback.

### 3.3 Analysis pipeline

Core files:

- `ats-backend/src/routes/analysis.routes.ts`
- `ats-backend/src/queues/analysis.queue.ts`
- `ats-backend/src/jobs/analyze-resume.job.ts`
- `ats-backend/src/services/ai.service.ts`
- `ats-backend/src/services/llm-usage.service.ts`
- `ats-backend/src/utils/ats-analysis.ts`

Pipeline summary:

1. `POST /api/analyze` validates input and enqueues job.
2. Worker extracts text and optional visual input (for vision-capable models).
3. AI service runs provider/model call and parses output.
4. Deterministic ATS scorecard is merged with LLM narrative output, with structured formatting diagnostics for contact, headings, layout, bullets, and date quality.
5. Analysis, usage, and related entities are persisted.
6. UI polls `GET /api/analysis/:jobId/status`.

Notable maturity:

- queue retries, status polling, provider-aware routing, policy checks, usage analytics.

### 3.4 Resume management stack

Core files:

- `ats-backend/src/routes/resume.routes.ts`
- `ats-backend/src/services/resume.service.ts`
- `ats-backend/src/services/resume-file.service.ts`
- `ats-backend/src/services/file-storage.service.ts`
- `ats-backend/src/services/resume-export.service.ts`
- `ats-backend/src/services/resume-version.service.ts`
- `ats-backend/src/services/template.service.ts`

Key behavior:

- Resume create from upload, text, or structured JSON.
- File-type and extraction-quality checks before persistent storage.
- Soft delete and bulk delete support.
- PDF/DOCX export paths.
- Version snapshots are created on update (service-level support is present).

### 3.5 Admin and governance

Core files:

- `ats-backend/src/routes/admin.routes.ts`
- `ats-backend/src/routes/admin.settings.routes.ts`
- `ats-backend/src/services/admin.service.ts`
- `ats-backend/src/services/system-settings.service.ts`

Capabilities:

- user directory and deep user detail operations
- bulk admin actions (update/revoke/delete)
- system provider/model/pricing/plan limit controls
- LLM analytics and usage-event visibility
- audit logging for administrative actions

### 3.6 Utility layer and cross-cutting modules

Core files:

- `ats-backend/src/utils/sanitizer.ts`
- `ats-backend/src/utils/logger.ts`
- `ats-backend/src/utils/errors.ts`
- `ats-backend/src/utils/pagination.ts`
- `ats-backend/src/utils/resume-text-processing.ts`
- `ats-backend/src/utils/resume-text-extractor.ts`
- `ats-backend/src/utils/resume-visual-input.ts`
- `ats-backend/src/utils/rate-limiter.ts`

What they mean:

- sanitization and domain-safe text handling
- structured logs with request context
- typed operational error hierarchy
- shared pagination/date/filter helpers
- text normalization and extraction-quality heuristics
- multimodal visual input generation for resume analysis

### 3.7 Data model memory

Core file:

- `ats-backend/prisma/schema.prisma`

Core entities:

- User, Resume, ResumeVersion, Template, JobDescription
- Analysis, AiUsage, RefreshSession, Subscription, AuditLog, SystemSetting

Migration maturity highlights:

- initial full schema and file storage support
- template structure/default data enhancement
- refresh-session table + indexing upgrade
- RBAC + LLM limits + usage telemetry expansion
- per-user provider allowlists and API-key fields

## 4) Frontend Memory

### 4.1 App routing and protection

Core files:

- `ats-frontend/src/App.jsx`
- `ats-frontend/src/components/ProtectedRoute.jsx`
- `ats-frontend/src/stores/authStore.js`

Route model:

- Public: `/login`, `/signup`
- Protected: `/dashboard/*`
- Admin protected: `/admin/*`
- Legacy redirects map old routes into dashboard-based routes.

Auth/session behavior:

- refresh token persisted in Zustand storage
- access token runtime-managed with refresh-on-401
- hydration guard prevents premature redirect flicker

### 4.2 User flows (pages)

Core files:

- `ats-frontend/src/pages/Dashboard.jsx`
- `ats-frontend/src/pages/AnalysisDashboard.jsx`
- `ats-frontend/src/pages/AnalysisPage.jsx`
- `ats-frontend/src/pages/ResumeManagementPage.jsx`
- `ats-frontend/src/pages/HistoryPage.jsx`
- `ats-frontend/src/pages/JobDescriptionsPage.jsx`
- `ats-frontend/src/pages/Login.jsx`
- `ats-frontend/src/pages/SignUp.jsx`

Main flow:

1. user login/signup
2. manage resumes and job descriptions
3. run ATS analysis (file or saved resume)
4. poll async job when queued
5. inspect result and history

### 4.3 Analysis and workflow components

Core files:

- `ats-frontend/src/components/AnalysisResults.jsx`
- `ats-frontend/src/components/KeywordAnalysis.jsx`
- `ats-frontend/src/components/ExperienceRelevance.jsx`
- `ats-frontend/src/components/FormattingScore.jsx`
- `ats-frontend/src/components/__tests__/FormattingScore.test.jsx`
- `ats-frontend/src/components/ActionableAdvice.jsx`
- `ats-frontend/src/components/ScoreRing.jsx`
- `ats-frontend/src/components/FileUpload.jsx`
- `ats-frontend/src/components/JobDescriptionInput.jsx`
- `ats-frontend/src/components/ResumeForm.jsx`
- `ats-frontend/src/components/ResumeList.jsx`
- `ats-frontend/src/components/ResumeDetail.jsx`

Meaning:

- rich visual ATS breakdown with metric sub-panels
- reusable upload/select patterns for resume input
- full resume CRUD UX and export/download actions

### 4.4 Model selection and settings UX

Core files:

- `ats-frontend/src/components/ModelSelector.jsx`
- `ats-frontend/src/components/ModelParameters.jsx`
- `ats-frontend/src/components/ModelFilters.jsx`
- `ats-frontend/src/components/ModelCostCalculator.jsx`
- `ats-frontend/src/hooks/useModelSelector.js`
- `ats-frontend/src/components/SettingsPanel.jsx`

Meaning:

- model filtering, sorting, and refresh
- advanced inference controls (temperature, token limits, reasoning)
- cost estimation and provider/model metadata display

### 4.5 Admin frontend module

Core files:

- `ats-frontend/src/pages/admin/AdminLayout.jsx`
- `ats-frontend/src/pages/admin/AdminUsersPage.jsx`
- `ats-frontend/src/pages/admin/AdminUserDetailPage.jsx`
- `ats-frontend/src/pages/admin/AdminAnalyticsPage.jsx`
- `ats-frontend/src/pages/admin/AdminUsageEventsPage.jsx`
- `ats-frontend/src/pages/admin/AdminSystemPage.jsx`
- `ats-frontend/src/components/admin/SystemSettingsPanel.jsx`
- `ats-frontend/src/services/adminService.js`

Meaning:

- enterprise-style admin console with user governance
- global AI settings and plan limits
- analytics and event-level observability

### 4.6 API and resilience layer

Core files:

- `ats-frontend/src/services/api.js`
- `ats-frontend/src/services/authService.js`
- `ats-frontend/src/components/AppErrorBoundary.jsx`
- `ats-frontend/src/components/ErrorMessage.jsx`
- `ats-frontend/src/components/LoadingSpinner.jsx`
- `ats-frontend/src/components/EmptyState.jsx`
- `ats-frontend/src/components/SafeHtml.jsx`
- `ats-frontend/src/hooks/useSanitizer.js`
- `ats-frontend/src/utils/sanitizer.js`

Meaning:

- centralized Axios client with token injection + refresh retry
- normalized user-facing API errors
- safety wrappers for HTML rendering and app-level crash handling

## 5) Testing Memory

Backend quality files:

- `ats-backend/jest.config.js`
- `ats-backend/eslint.config.js`
- `ats-backend/src/**/__tests__/*.ts`

Frontend quality files:

- `ats-frontend/vitest.config.js`
- `ats-frontend/playwright.config.ts`
- `ats-frontend/tests/e2e/*.ts`
- `ats-frontend/tests/integration/*.ts`

Coverage posture:

- backend: good auth/sanitizer/util/service coverage; route and integration breadth still expandable
- frontend: strong e2e breadth (auth/admin/workflow/perf/a11y/visual), limited unit/component depth

## 6) Deployment and Ops Memory

Core files:

- `docker-compose.yml`
- `Dockerfile`
- `Dockerfile.simple`
- `run-docker.sh`
- `.env.docker.example`

Meaning:

- one-container runtime for backend + static frontend
- persistent volumes for DB and uploads
- health checks and env-driven runtime controls
- optional local-memory vs Redis-backed queue strategy

## 7) Important Known Risks and Tech Debt

- SQLite + local queue mode are convenient but not ideal for high-scale durability.
- Some local/dev toggles can relax strict rate-limit posture.
- Logger request-context approach should eventually use async-local storage semantics for strict isolation.
- LLM policy checks are strong, but concurrent request bursts can still overshoot quotas without strict atomic reservation.
- Some test depth gaps remain around full end-to-end backend integrations.

## 8) Fast Q and A Lookup Map

If user asks about this topic, start here:

- Auth tokens and sessions -> `ats-backend/src/services/auth.service.ts`, `ats-frontend/src/services/api.js`, `ats-frontend/src/stores/authStore.js`
- Resume upload and parsing -> `ats-backend/src/routes/resume.routes.ts`, `ats-backend/src/services/resume-file.service.ts`
- ATS scoring logic -> `ats-backend/src/utils/ats-analysis.ts`, `ats-backend/src/services/ai.service.ts`
- ATS formatting diagnostics -> `ats-backend/src/utils/ats-analysis.ts`, `ats-frontend/src/components/FormattingScore.jsx`
- Queue and async jobs -> `ats-backend/src/queues/analysis.queue.ts`, `ats-backend/src/jobs/analyze-resume.job.ts`
- Admin settings and plan limits -> `ats-backend/src/routes/admin.settings.routes.ts`, `ats-backend/src/services/system-settings.service.ts`, `ats-frontend/src/components/admin/SystemSettingsPanel.jsx`
- Usage analytics and cost -> `ats-backend/src/services/llm-usage.service.ts`, `ats-frontend/src/pages/admin/AdminAnalyticsPage.jsx`, `ats-frontend/src/components/UsageSummaryCard.jsx`
- Frontend routing and guards -> `ats-frontend/src/App.jsx`, `ats-frontend/src/components/ProtectedRoute.jsx`
- DB models and migrations -> `ats-backend/prisma/schema.prisma`, `ats-backend/prisma/migrations/*/migration.sql`

## 9) Update Protocol

When significant changes happen, update these files together:

1. `memory-db/MEMORY_DATABASE.md`
2. `memory-db/FILE_REFERENCE_CATALOG.md`
3. `memory-db/COLLEGE_REPORT_DELTA.md`
4. `KNOWLEDGE_ROOT.md`
5. `ats-backend/KNOWLEDGE_BACKEND.md`
6. `ats-frontend/KNOWLEDGE_FRONTEND.md`
