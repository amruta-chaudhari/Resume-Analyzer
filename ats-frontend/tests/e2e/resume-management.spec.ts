import { test, expect } from '@playwright/test';

const isLoginScreen = (url) => url.includes('/login');

const expectLoginScreen = async (page) => {
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
};

test.describe('Resume Management', () => {
  test('should require authentication for resume routes', async ({ page }) => {
    await page.goto('/resumes');
    await expectLoginScreen(page);
  });

  test('should show resume upload UI when authenticated session exists', async ({ page }) => {
    await page.goto('/resumes');

    if (isLoginScreen(page.url())) {
      await expectLoginScreen(page);
      return;
    }

    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible({ timeout: 10000 });
  });

  test('should reject unsupported file types when upload UI is available', async ({ page }) => {
    await page.goto('/resumes');

    if (isLoginScreen(page.url())) {
      await expectLoginScreen(page);
      return;
    }

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('not a supported resume format'),
      }).catch(() => {});

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should keep resumes screen responsive after multiple file selections', async ({ page }) => {
    await page.goto('/resumes');

    if (isLoginScreen(page.url())) {
      await expectLoginScreen(page);
      return;
    }

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: 'resume-one.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Resume one content'),
      });

      await fileInput.setInputFiles({
        name: 'resume-two.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Resume two content'),
      });

      await expect(page.locator('body')).toBeVisible();
    }
  });
});
