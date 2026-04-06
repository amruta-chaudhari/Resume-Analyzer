# ATS Resume Analyzer - Frontend Knowledge Base

Last updated: 2026-04-05
Scope: Complete frontend architecture, pages/components, data/state patterns, design system, tests, and build pipeline.

## 1) Frontend Stack

- React 18
- React Router v7
- Vite build/dev server
- Tailwind CSS + custom glassmorphism CSS
- Zustand for auth state persistence
- Axios for API transport + token refresh interceptor
- Playwright for E2E/integration coverage

## 2) App Entry and Routing

Primary files:

- `src/index.jsx`
- `src/App.jsx`
- `src/pages/Dashboard.jsx`

Route model:

- Public:
  - `/login`
  - `/signup`
- Protected:
  - `/dashboard/*`
  - `/admin/*` (admin role required)
- Redirect conventions:
  - root and legacy paths redirect to dashboard analysis view
  - `/analysis/:id` redirects to `/dashboard/analysis/:id`

Nested dashboard routes:

- `/dashboard/analysis`
- `/dashboard/analysis/:id`
- `/dashboard/resumes`
- `/dashboard/job-descriptions`
- `/dashboard/history`

## 3) Auth Guard and Session Behavior

Guard component:

- `src/components/ProtectedRoute.jsx`

Checks:

1. hydration state complete
2. authenticated token/session presence
3. optional admin-tier condition

Redirect behavior:

- unauthenticated users go to login
- non-admin users denied admin route and sent to dashboard flow

## 4) Page-Level Responsibilities

### `src/pages/AnalysisDashboard.jsx`

- Main ATS workflow orchestration
- file upload + job description input
- model/parameter controls
- submit analysis request and handle async completion polling
- transition to result view route

### `src/pages/AnalysisPage.jsx`

- Displays full analysis output
- handles loading/error/result state transitions
- renders an inline resume improvement map at the bottom via `ResumeImprovementOverlay`
- renders a real page overlay viewer via `ResumeReviewCanvas` + `ResumePdfOverlayPreview`, using hoverable markers on rendered resume pages when a PDF source is available

### `src/pages/ResumeManagementPage.jsx`

- list/detail/edit/create resume flows
- controls view-state switching between list/form/detail
- manages export and CRUD interactions

### `src/pages/HistoryPage.jsx`

- combines analysis history with job description management

### Auth pages

- `src/pages/Login.jsx`
- `src/pages/SignUp.jsx`

Responsibilities:

- auth form handling
- success-state redirect logic using intended destination

### Admin page

- `src/pages/AdminPage.jsx`
- `src/pages/admin/AdminLayout.jsx`
- `src/pages/admin/AdminAnalyticsPage.jsx`
- `src/pages/admin/AdminUsageEventsPage.jsx`
- `src/pages/admin/AdminUsersPage.jsx`
- `src/pages/admin/AdminSystemPage.jsx`

Responsibilities:

- admin-only management interface and system settings controls

## 5) Reusable Component System

Major groups in `src/components/`:

Analysis visualization:

- `ScoreRing.jsx`
- `AnalysisResults.jsx`
- `KeywordAnalysis.jsx`
- `FormattingScore.jsx`
  - renders formatting score, issue list, and structured diagnostics when present
- `ExperienceRelevance.jsx`
- `ActionableAdvice.jsx`
- `ResumeImprovementOverlay.jsx`
- `ResumeReviewCanvas.jsx`
- `ResumePdfOverlayPreview.jsx`
- `resumePdfOverlay.js`

Input/workflow:

- `FileUpload.jsx`
- `JobDescriptionInput.jsx`
- `ResumeForm.jsx`

AI controls:

- `ModelSelector.jsx`
- `ModelParameters.jsx`
- `ModelCostCalculator.jsx`
- `ModelFilters.jsx`

Data management/display:

- `ResumeList.jsx`
- `ResumeDetail.jsx`
- `AnalysisHistory.jsx`
- `JobDescriptionManager.jsx`

App utilities:

- `LoadingSpinner.jsx`
- `ErrorMessage.jsx`
- `EmptyState.jsx`
- `ThemeToggle.jsx`
- `ProtectedRoute.jsx`
- `AppErrorBoundary.jsx`
- `SafeHtml.jsx`
- `SettingsPanel.jsx`
- `components/admin/SystemSettingsPanel.jsx`

## 6) Styling and Design Language

Core styles:

- `src/index.css`
- `tailwind.config.cjs`

Design direction:

- glassmorphism cards and controls
- gradient-heavy accent styling
- dark/light theme compatibility
- animated score and feedback visuals

Custom style patterns include classes such as:

- `.glass`
- `.glass-strong`
- `.hover-glass`
- `.dropdown-glass`
- `.btn-glass`

Theme behavior:

- class-based dark mode
- persisted preference with system fallback

Motion behavior:

- ring animations
- pulse/fade/hover transitions
- reduced-motion media-query safety considerations

Responsiveness:

- mobile-first Tailwind usage
- layout shifts between stacked and multi-column presentations
- mobile-friendly navigation behavior

## 7) Frontend Data Layer and API Contract

### API client

- `src/services/api.js`

Features:

- centralized axios instance
- dynamic base URL selection from env/runtime assumptions
- request interceptor adds bearer access token
- response interceptor handles refresh-and-retry on 401
- deduplicated refresh promise to prevent parallel refresh storms

### Service modules

- `src/services/authService.js` and related API wrappers

Responsibilities:

- login/register/refresh/me and domain API calls
- normalize backend envelopes for UI components

### Contract assumptions

Common success shape:

- `success: true`
- `data: ...`

Special handling:

- analysis queue responses include job IDs and state polling details
- export endpoints return blobs/binary payloads
- rendered resume overlay preview fetches either the original PDF (`/api/resumes/:id/file`) or a generated PDF preview (`/api/resumes/:id/export/pdf`) and resolves marker positions client-side with `pdfjs-dist`
- paginated endpoints include list + pagination metadata

## 8) State Management and Persistence

Auth store:

- `src/stores/authStore.js`
- Zustand persist middleware

Pattern:

- persist stable identity/session items (not all transient state)
- hydration gate prevents premature protected rendering

Other state:

- local component state for page-specific interactions
- localStorage use in theme/model preference paths

## 9) Hooks and Utilities

Hooks:

- `src/hooks/useTheme.js`
- `src/hooks/useModelSelector.js`
- `src/hooks/useSanitizer.js`

Utility modules in `src/utils/`:

- sanitization helpers for text/html/url/email and nested objects
- job title extraction helper
- other formatting/validation helpers as feature-specific utilities

Design intent:

- keep view components lean by moving reusable logic to hooks/utilities

## 10) Frontend Testing Strategy

Test directories:

- `tests/e2e/`
- `tests/integration/`
- `tests/helpers/`

Tooling:

- Playwright with multi-browser/device projects
- helpers for user persona and test environment orchestration

Coverage themes:

- auth journeys
- dashboard and analysis workflows
- error handling behavior
- performance smoke checks
- accessibility checks
- admin access workflows

Known quality gap:

- frontend unit/component tests are limited compared to E2E coverage depth.

## 11) Build and Tooling Pipeline

Config files:

- `vite.config.js`
- `postcss.config.cjs`
- `tailwind.config.cjs`
- `playwright.config.ts`
- `package.json`
- `scripts/build-presentation.mjs`

Build flow:

- Vite compiles app into static build output used by backend containerized serving path.

Additional tooling:

- presentation script generates PPTX from markdown/assets for demos.

## 12) UX and Product Design Decisions

Primary UX choices:

- analysis-first landing within protected dashboard
- persistent settings and model customization support
- clear progress/status handling for async analysis jobs
- mobile-ready navigation and card-based content structure
- visual emphasis on score storytelling and actionable recommendations

## 13) Risks and Tech Debt to Track

- color/threshold constants repeated across components instead of centralized tokens
- some accessibility semantics can still be expanded (dropdown keyboard navigation in custom listboxes)
- complex hook/component logic could benefit from stronger documentation and unit tests
- mixed local state/localStorage patterns can drift without standardization

## 14) Frontend Change-Impact Checklist

Update this document when changing:

1. route map or guard behavior
2. API envelope handling/interceptor logic
3. Zustand persistence contracts
4. major components or analysis visualization model
5. design tokens/theme/motion system
6. Playwright coverage strategy or CI integration
7. build output path or deployment assumptions
