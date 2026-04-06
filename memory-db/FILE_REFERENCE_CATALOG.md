# ATS Resume Analyzer - File Reference Catalog

Last updated: 2026-04-02
Scope: Quick meaning map for major files and modules.

## Root and infra

- `README.md` - user/developer setup and overview.
- `AGENTS.md` - deep project guidance for coding agents.
- `CLAUDE.md` - parallel deep guide similar to AGENTS.
- `KNOWLEDGE_ROOT.md` - root-level architecture and ops memory.
- `docker-compose.yml` - container orchestration and volumes.
- `Dockerfile` - multi-stage production image.
- `Dockerfile.simple` - simplified image build.
- `run-docker.sh` - helper startup script for Docker workflow.
- `.env.docker.example` - template for Docker runtime env.
- `opencode.json` - MCP server/tool registry config.

## Backend app wiring

- `ats-backend/src/index.ts` - Express app bootstrap and lifecycle.
- `ats-backend/src/routes/index.ts` - route exports aggregator.
- `ats-backend/src/routes/health.routes.ts` - health and upstream checks.
- `ats-backend/src/middleware/error.middleware.ts` - global error pipeline.
- `ats-backend/src/middleware/request-context.middleware.ts` - request IDs and logger context.
- `ats-backend/src/middleware/auth.middleware.ts` - JWT auth guard.
- `ats-backend/src/middleware/admin.middleware.ts` - admin authorization guard.
- `ats-backend/src/middleware/rate-limiter.middleware.ts` - per-user/tier limiter middleware.
- `ats-backend/src/config/rate-limits.config.ts` - plan-tier rate limit policy.
- `ats-backend/src/config/queue.config.ts` - Bull/queue setup and close hooks.
- `ats-backend/src/lib/prisma.ts` - Prisma singleton.
- `ats-backend/src/lib/json.ts` - safe JSON parsing utility.

## Backend routes and services

- `ats-backend/src/routes/auth.routes.ts` - register/login/refresh/me/logout endpoints.
- `ats-backend/src/services/auth.service.ts` - token/session/auth core logic.
- `ats-backend/src/routes/models.routes.ts` - model list and admin refresh endpoint.
- `ats-backend/src/routes/resume.routes.ts` - resume CRUD, export, parse, analyze, file metadata.
- `ats-backend/src/services/resume.service.ts` - resume orchestration facade.
- `ats-backend/src/services/resume-file.service.ts` - text extraction from uploaded files.
- `ats-backend/src/services/file-storage.service.ts` - filesystem storage + validation.
- `ats-backend/src/services/resume-export.service.ts` - PDF/DOCX generation.
- `ats-backend/src/services/resume-version.service.ts` - version snapshot and restore workflows.
- `ats-backend/src/routes/template.routes.ts` - template list/get/seed endpoints.
- `ats-backend/src/services/template.service.ts` - template management and seeding.
- `ats-backend/src/routes/job-descriptions.routes.ts` - JD CRUD and bulk operations.
- `ats-backend/src/routes/analysis.routes.ts` - analysis submit/history/status/usage endpoints.
- `ats-backend/src/services/ai.service.ts` - provider/model resolution and resume analysis.
- `ats-backend/src/services/resume-analysis.service.ts` - AI parsing and structured extraction helpers.
- `ats-backend/src/services/llm-usage.service.ts` - usage summary and analytics.
- `ats-backend/src/routes/admin.routes.ts` - admin user and analytics operations.
- `ats-backend/src/routes/admin.settings.routes.ts` - admin system settings endpoints.
- `ats-backend/src/services/admin.service.ts` - admin business logic and audit actions.
- `ats-backend/src/services/system-settings.service.ts` - global provider/model/limit settings.

## Backend queue/jobs/utils

- `ats-backend/src/queues/analysis.queue.ts` - queue abstraction + local fallback.
- `ats-backend/src/jobs/analyze-resume.job.ts` - worker processor for analysis jobs.
- `ats-backend/src/utils/ats-analysis.ts` - deterministic ATS scoring, formatting diagnostics, and keyword heuristics.
- `ats-backend/src/utils/resume-text-processing.ts` - text cleanup and quality checks.
- `ats-backend/src/utils/resume-text-extractor.ts` - structured resume to text conversion.
- `ats-backend/src/utils/resume-visual-input.ts` - image/PDF visual payload generation.
- `ats-backend/src/utils/pagination.ts` - pagination/filter/date helpers.
- `ats-backend/src/utils/sanitizer.ts` - sanitization helpers.
- `ats-backend/src/utils/rate-limiter.ts` - in-memory usage limiter utility.
- `ats-backend/src/utils/logger.ts` - structured logging.
- `ats-backend/src/utils/errors.ts` - typed app error classes.
- `ats-backend/src/types/index.ts` - shared type contracts.

## Backend data and scripts

- `ats-backend/prisma/schema.prisma` - full DB model schema.
- `ats-backend/prisma/migrations/*/migration.sql` - schema evolution timeline.
- `ats-backend/seed.js` - baseline seed script.
- `ats-backend/seed-templates.js` - default templates seed.
- `ats-backend/create-admin.js` - admin bootstrap utility.
- `ats-backend/check-users.js` - user diagnostics script.
- `ats-backend/check-templates.js` - template diagnostics script.

## Frontend app shell/pages

- `ats-frontend/src/index.jsx` - React entrypoint.
- `ats-frontend/src/App.jsx` - route topology.
- `ats-frontend/src/pages/Login.jsx` - login UI flow.
- `ats-frontend/src/pages/SignUp.jsx` - signup UI flow.
- `ats-frontend/src/pages/Dashboard.jsx` - authenticated app shell.
- `ats-frontend/src/pages/AnalysisDashboard.jsx` - analysis submission flow.
- `ats-frontend/src/pages/AnalysisPage.jsx` - analysis result display.
- `ats-frontend/src/pages/ResumeManagementPage.jsx` - resume library flow.
- `ats-frontend/src/pages/HistoryPage.jsx` - historical analyses and usage.
- `ats-frontend/src/pages/JobDescriptionsPage.jsx` - JD management page.
- `ats-frontend/src/pages/AdminPage.jsx` - admin root page export.

## Frontend components (user)

- `ats-frontend/src/components/AnalysisResults.jsx` - overall result composition.
- `ats-frontend/src/components/ActionableAdvice.jsx` - recommendation checklist.
- `ats-frontend/src/components/KeywordAnalysis.jsx` - keyword matched/missing analysis.
- `ats-frontend/src/components/ExperienceRelevance.jsx` - experience score panel.
- `ats-frontend/src/components/FormattingScore.jsx` - formatting diagnostics panel with structured checklist signals.
- `ats-frontend/src/components/ScoreRing.jsx` - circular score visualization.
- `ats-frontend/src/components/FileUpload.jsx` - file/saved resume selector.
- `ats-frontend/src/components/JobDescriptionInput.jsx` - JD input and quick actions.
- `ats-frontend/src/components/JobDescriptionManager.jsx` - JD CRUD manager.
- `ats-frontend/src/components/ResumeForm.jsx` - resume create/edit form.
- `ats-frontend/src/components/ResumeList.jsx` - resume listing and actions.
- `ats-frontend/src/components/ResumeDetail.jsx` - single resume detail and actions.
- `ats-frontend/src/components/AnalysisHistory.jsx` - analysis history list.
- `ats-frontend/src/components/ModelSelector.jsx` - model picker UI.
- `ats-frontend/src/components/ModelParameters.jsx` - advanced model params.
- `ats-frontend/src/components/ModelFilters.jsx` - model filtering controls.
- `ats-frontend/src/components/ModelCostCalculator.jsx` - cost estimate widget.
- `ats-frontend/src/components/SettingsPanel.jsx` - app settings panel.
- `ats-frontend/src/components/UsageSummaryCard.jsx` - usage/limits summary card.

## Frontend components (platform)

- `ats-frontend/src/components/ProtectedRoute.jsx` - auth/admin route guard.
- `ats-frontend/src/components/ThemeToggle.jsx` - theme switch control.
- `ats-frontend/src/components/SafeHtml.jsx` - sanitized HTML renderer.
- `ats-frontend/src/components/AppErrorBoundary.jsx` - crash boundary.
- `ats-frontend/src/components/ErrorMessage.jsx` - standardized error alert.
- `ats-frontend/src/components/LoadingSpinner.jsx` - loading indicator.
- `ats-frontend/src/components/EmptyState.jsx` - empty data state UI.

## Frontend admin module

- `ats-frontend/src/pages/admin/AdminLayout.jsx` - admin shell and tabs.
- `ats-frontend/src/pages/admin/AdminUsersPage.jsx` - user management list and bulk ops.
- `ats-frontend/src/pages/admin/AdminUserDetailPage.jsx` - per-user controls and diagnostics.
- `ats-frontend/src/pages/admin/AdminSystemPage.jsx` - system settings page.
- `ats-frontend/src/pages/admin/AdminAnalyticsPage.jsx` - analytics charts and summaries.
- `ats-frontend/src/pages/admin/AdminUsageEventsPage.jsx` - usage events explorer.
- `ats-frontend/src/pages/admin/shared.js` - admin shared helpers/constants.
- `ats-frontend/src/components/admin/SystemSettingsPanel.jsx` - settings editor UI.
- `ats-frontend/src/services/adminService.js` - admin API wrapper layer.

## Frontend services/hooks/utils

- `ats-frontend/src/services/api.js` - Axios client, interceptors, API wrappers.
- `ats-frontend/src/services/authService.js` - auth API helper functions.
- `ats-frontend/src/stores/authStore.js` - persisted auth state.
- `ats-frontend/src/hooks/useTheme.js` - theme state and persistence.
- `ats-frontend/src/hooks/useModelSelector.js` - model list/filter/selection state.
- `ats-frontend/src/hooks/useSanitizer.js` - sanitized rendering helpers.
- `ats-frontend/src/utils/sanitizer.js` - client-side sanitization helpers.
- `ats-frontend/src/utils/dateFormat.js` - date formatting helper.
- `ats-frontend/src/utils/jobTitle.js` - job-title extraction helper.

## Frontend styling and quality infra

- `ats-frontend/src/index.css` - custom style system and theme classes.
- `ats-frontend/tailwind.config.cjs` - Tailwind scan/theme config.
- `ats-frontend/postcss.config.cjs` - PostCSS pipeline config.
- `ats-frontend/vite.config.js` - Vite build/dev config.
- `ats-frontend/vitest.config.js` - unit/component test config.
- `ats-frontend/playwright.config.ts` - e2e/integration config.

## Tests and helpers

Backend:

- `ats-backend/src/routes/__tests__/*.ts` - route-level tests.
- `ats-backend/src/services/__tests__/*.ts` - service-level tests.
- `ats-backend/src/middleware/__tests__/*.ts` - middleware tests.
- `ats-backend/src/utils/__tests__/*.ts` - utility tests.
- `ats-backend/src/__tests__/setup.ts` - backend test setup.
- `ats-backend/src/__tests__/helpers.ts` - backend test helpers.
- `ats-backend/src/__tests__/factories.ts` - backend fixture factories.

Frontend:

- `ats-frontend/src/components/__tests__/*.jsx` - component tests.
- `ats-frontend/src/hooks/__tests__/*.js` - hook tests.
- `ats-frontend/src/stores/__tests__/*.js` - store tests.
- `ats-frontend/tests/e2e/*.ts` - browser end-to-end suites.
- `ats-frontend/tests/integration/*.ts` - integration API/ui suites.
- `ats-frontend/tests/helpers/*.ts` - test utilities.
- `ats-frontend/scripts/build-presentation.mjs` - presentation build helper.
