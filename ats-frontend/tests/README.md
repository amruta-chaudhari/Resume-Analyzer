# ATS Resume Analyzer - Playwright Test Suite

## Test Coverage

This test suite covers the following areas:

### E2E Tests (`tests/e2e/`)
1. **Authentication** (`auth.spec.ts`)
   - Login/Signup navigation
   - Registration form validation
   - Login form submission
   - Session persistence

2. **Resume Management** (`resume-management.spec.ts`)
   - PDF/DOCX file upload
   - Resume list display
   - Resume deletion
   - Resume preview
   - Multiple file uploads
   - File size validation
   - File type validation

3. **ATS Analysis** (`analysis.spec.ts`)
   - Job description input
   - Analysis results display
   - Keyword analysis
   - ATS scoring
   - Recommendations
   - Model selection
   - Loading states
   - Export functionality

4. **Dashboard Navigation** (`dashboard.spec.ts`)
   - Navigation menu
   - Section navigation
   - User profile
   - Theme toggling
   - Responsive layout
   - Logout functionality

5. **UI Components** (`ui-components.spec.ts`)
   - Glassmorphism design
   - Gradient buttons
   - Loading animations
   - Icon rendering
   - Responsive layout
   - Form validation
   - Modal dialogs
   - Empty states
   - Error messages
   - Score rings

6. **Complete Workflow** (`complete-workflow.spec.ts`)
   - Full analysis workflow
   - Registration flow
   - Multiple resume management
   - Job description comparison
   - Export functionality
   - Session persistence
   - Theme switching

7. **Accessibility** (`accessibility.spec.ts`)
   - ARIA labels
   - Keyboard navigation
   - Focus indicators
   - Heading hierarchy
   - Alt text
   - Color contrast
   - Form labels
   - Screen reader support
   - Skip links
   - Reduced motion

8. **Error Handling** (`error-handling.spec.ts`)
   - Network errors
   - File upload errors
   - API timeouts
   - Invalid authentication
   - Session expiration
   - Large file handling
   - Concurrent operations
   - Special characters
   - Empty states
   - Rapid clicking
   - Browser navigation
   - Malformed JSON
   - Missing fields
   - Duplicate submissions

9. **Performance** (`performance.spec.ts`)
   - Page load time
   - First contentful paint
   - Memory leaks
   - Route changes
   - Image loading
   - Asset bundling
   - Main thread blocking
   - Re-renders
   - CSS optimization
   - Prefetching
   - Animation smoothness
   - Bundle size
   - Caching

### Integration Tests (`tests/integration/`)
1. **API Integration** (`api-integration.spec.ts`)
   - Backend connectivity
   - AI models endpoint
   - Authentication endpoints
   - Resume upload endpoint
   - Analysis endpoint
   - Error format validation
   - CORS handling

## Running Tests

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run with UI mode
npx playwright test --ui

# Run with HTML report
npx playwright test --reporter=html

# Run in headed mode (visible browser)
npx playwright test --headed

# Run specific browser
npx playwright test --project=chromium

# Run with slow mo
npx playwright test --slowmo=1000
```

## Test Structure

```
tests/
├── e2e/                  # End-to-end tests
│   ├── auth.spec.ts
│   ├── resume-management.spec.ts
│   ├── analysis.spec.ts
│   ├── dashboard.spec.ts
│   ├── ui-components.spec.ts
│   ├── complete-workflow.spec.ts
│   ├── accessibility.spec.ts
│   ├── error-handling.spec.ts
│   └── performance.spec.ts
├── integration/          # Integration tests
│   └── api-integration.spec.ts
└── mocks/               # Test mocks and fixtures
```

## Configuration

The Playwright configuration is in `playwright.config.ts`:
- Base URL: `http://localhost:3000`
- Timeout: Default Playwright timeout
- Retries: 0 (2 in CI)
- Workers: Auto (1 in CI)
- Reporters: HTML

## Environment Variables

```bash
VITE_API_URL=http://localhost:3001
```

## Fixtures

All tests use the default Playwright fixtures. Custom fixtures can be added in `tests/fixtures/`.

## Reporting

After running tests with `--reporter=html`, view the report:
```bash
npx playwright show-report
```

## Debugging

```bash
# Debug specific test
npx playwright test tests/e2e/auth.spec.ts --debug

# Run with Playwright Inspector
PWDEBUG=1 npx playwright test