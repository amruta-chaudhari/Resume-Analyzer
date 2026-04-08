import { test, expect } from '@playwright/test';

test.describe('Public routes', () => {
  test('should render privacy and terms pages without authentication', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /Privacy policy/i })).toBeVisible();

    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /Terms of service/i })).toBeVisible();
  });

  test('should show a dedicated not-found page for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByRole('heading', { name: /Page not found/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Go to dashboard/i })).toBeVisible();

    await page.getByRole('link', { name: /Go to dashboard/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
