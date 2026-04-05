# ATS Resume Analyzer - Backend Knowledge Base

Last updated: 2026-04-05
Scope: Complete backend architecture, modules, runtime behavior, data model mapping, and operational details.

## 1) Backend Stack and Entry

Core stack:

- Node.js + Express 5
- TypeScript runtime/build
- Prisma ORM
- SQLite database in current committed Prisma schema/migrations
- JWT auth + refresh session management
- AI provider abstraction for model calls

Main bootstrap:

- `src/index.ts`
  - Loads env and validates critical secrets.
  - Configures CORS, security headers, request context, parsers.
  - Applies global + route-specific rate limiters.
  - Mounts route modules.
  - Registers not-found and global error handlers.
  - Starts server and queue processor.
  - Handles graceful shutdown on signals.

## 2) Route Map and Responsibilities

### `src/routes/auth.routes.ts` mounted at `/api/auth`

- `POST /register`: create user and token pair.
- `POST /login`: credentials validation and token issue.
- `POST /refresh`: rotate refresh/access tokens.
- `GET /me`: return authenticated user profile.
- `POST /logout`: revoke refresh session(s).

Features:

- request validation and sanitization
- error mapping for auth/infrastructure cases

### `src/routes/analysis.routes.ts` mounted under `/api`

- `POST /analyze`: enqueue analysis job, returns job ID.
- `GET /analysis/:jobId/status`: poll async job status/result.
- `GET /analyses`: paginated analysis history.
- `GET /analyses/:id`: fetch specific analysis (includes parsed overlay payload + resume `extractedText`).
- `GET /queue/stats`: admin-oriented queue stats.

### `src/routes/resume.routes.ts` mounted at `/api/resumes`

- list/create/get/update/delete resumes
- parse resume text endpoint
- export endpoints (`/export/pdf`, `/export/word`)
- file retrieval and metadata endpoints
- resume-specific analyze endpoint

Patterns:

- auth required at router level
- field validation and update constraints
- file handling support for upload mode

### Other route modules

- `src/routes/template.routes.ts`
  - list/get templates, seed templates (admin-restricted)
- `src/routes/job-descriptions.routes.ts`
  - CRUD + pagination/filter for saved job descriptions
- `src/routes/models.routes.ts`
  - list models, force refresh model cache (admin-restricted)
- `src/routes/health.routes.ts`
  - health endpoints, with upstream checks requiring auth/admin context
- `src/routes/admin.routes.ts`
  - admin user management and lifecycle operations
- `src/routes/admin.settings.routes.ts`
  - provider/API key settings management

## 3) Middleware and Request Lifecycle

### Auth and authorization

- `src/middleware/auth.middleware.ts`
  - validates Bearer token
  - resolves user context
- `src/middleware/admin.middleware.ts`
  - verifies admin-tier access

### Error and async handling

- `src/middleware/error.middleware.ts`
  - `asyncHandler` wrapper
  - centralized structured errors and unknown-error fallback
- not-found handler inserted before global error handler

### Rate limiting

- `src/middleware/rate-limiter.middleware.ts`
  - per-user/tier quota middleware hooks
- `src/config/rate-limits.config.ts`
  - tier limits for free/pro/enterprise/admin

### Request context

- `src/middleware/request-context.middleware.ts`
  - request IDs
  - logging context creation for traceability

## 4) Service Layer (Business Logic)

### Auth service: `src/services/auth.service.ts`

Responsibilities:

- register/login/refresh workflows
- token generation and hashing
- refresh session creation/rotation/revocation
- expired session pruning

Security details:

- refresh token hash storage
- reuse detection logic with session revocation strategy

### AI service: `src/services/ai.service.ts`

Responsibilities:

- provider/model resolution
- model list retrieval + caching
- core resume analysis orchestration
- formatting heuristics and score structuring

Provider model:

- supports OpenRouter/OpenAI/Anthropic/Gemini style access paths
- model cache with TTL behavior

### Resume orchestration: `src/services/resume.service.ts`

Responsibilities:

- central facade for resume lifecycle
- create/read/update/delete
- dispatch to file/export/analysis/version services
- parse structured content and keep extracted text aligned

### File and extraction

- `src/services/file-storage.service.ts`
  - filesystem persistence, metadata, validation
- `src/services/resume-file.service.ts`
  - PDF/DOCX/TXT extraction, structured data detection

### Export service: `src/services/resume-export.service.ts`

Responsibilities:

- PDF generation via Puppeteer
- DOCX generation via docx library
- template-aware formatting logic

### Analysis helper service: `src/services/resume-analysis.service.ts`

Responsibilities:

- parse raw resume text into structured schema using AI
- normalize and extract plain text from structured objects

### Versioning service: `src/services/resume-version.service.ts`

Responsibilities:

- immutable version snapshots
- restore workflows
- version stats and retention cleanup

### Templates and admin settings

- `src/services/template.service.ts`
  - template CRUD/seed/usage behavior
- `src/services/admin.service.ts`
  - user admin operations + audit-linked updates
- `src/services/system-settings.service.ts`
  - global provider and key configuration

## 5) Queue and Job Processing

Core files:

- `src/queues/analysis.queue.ts`
- `src/jobs/analyze-resume.job.ts`
- `src/config/queue.config.ts`

Behavior:

1. route enqueues analysis with payload
2. worker extracts text and validates content
3. AI analysis executes with requested model params
4. analysis + related entities persisted transactionally
5. client polls for job status/progress

Queue modes:

- local memory mode for simple execution
- Redis-backed mode for stronger durability/scaling

## 6) Data Model Knowledge (Prisma)

Primary schema file:

- `prisma/schema.prisma`

Important entities:

- User
- Resume
- ResumeVersion
- Template
- JobDescription
- Analysis
- AiUsage
- RefreshSession
- Subscription
- AuditLog
- SystemSetting

Notable design details:

- `Resume` stores both text (`content`) and structured JSON (`structuredData`).
- file metadata fields connect resume to upload storage records.
- soft delete fields (`deletedAt`) appear in key models.
- analysis supports status and provider/model metadata.
- refresh session table enables session revocation and token lifecycle integrity.

Migrations:

- include baseline, template structure enhancement, and schema evolution updates.

## 7) Utilities and Contracts

### Logging: `src/utils/logger.ts`

- structured log levels
- context stack support
- request/user metadata capture

### Error system: `src/utils/errors.ts`

- AppError hierarchy
- operational vs unexpected categorization
- standardized status/code/message shaping

### Sanitization: `src/utils/sanitizer.ts`

- string/html/email/url/json sanitizers
- domain-specific limits for resume/job content
- XSS risk reduction helpers

### Pagination/rate-limit/text extractor

- `src/utils/pagination.ts`: query parsing, metadata, where-clause helpers
- `src/utils/rate-limiter.ts`: quota checks and time-window accounting
- `src/utils/resume-text-extractor.ts`: structured->plain conversion routines
- `src/utils/resume-review-overlay.ts`: maps AI inline suggestions to resume character and line anchors

### Shared types: `src/types/index.ts`

- API and domain interfaces
- type guards
- consistent contract typing across layers

## 8) Testing and Quality Coverage

Test structure:

- `src/__tests__/` shared setup/helpers/factories/mocks
- middleware tests under `src/middleware/__tests__/`
- service tests under `src/services/__tests__/`
- utility tests under `src/utils/__tests__/`

Strong areas:

- auth and sanitizer tests
- service behavior and error condition checks
- mock/factory infrastructure quality

Coverage gaps to monitor:

- route-level integration breadth beyond auth/jobs/analysis read endpoints
- file processing/export integration depth
- distributed rate-limit and queue durability edge cases

## 9) Backend Operational Scripts

In backend root:

- `seed.js`: baseline user seed
- `seed-templates.js`: default templates seed
- `create-admin.js`: elevate user to admin tier
- `check-users.js` / `check-templates.js`: diagnostics
- `docker-entrypoint.sh`: container startup orchestration (db prep, optional reset, app launch)

## 10) API Envelope and Error Patterns

Success pattern generally:

- `success: true`
- `data: ...`
- optional message/pagination metadata

Error pattern generally:

- structured code/message/status from error middleware
- request linkage/context in logs

## 11) Security and Reliability Notes

- JWT + refresh-session architecture reduces long-lived access token exposure.
- token/session revocation supports account/session control.
- sanitizers and validation reduce injection and malformed input risks.
- request context and structured logs improve debugging/auditing.

Watch items:

- environment defaults that relax strict controls for local dev must be revisited before hard production posture.
- local queue mode is non-durable across restarts.
- SQLite constraints may impact concurrent/high-throughput scenarios.

## 12) Backend Change-Impact Checklist

Update this document when changing:

1. route signatures, auth guards, or response shapes
2. service responsibilities or cross-service dependencies
3. Prisma schema or migration strategy
4. queue provider mode and retry/backoff settings
5. operational scripts and startup behavior
6. sanitizer/error/logger contracts
7. test coverage strategy or significant quality gaps
