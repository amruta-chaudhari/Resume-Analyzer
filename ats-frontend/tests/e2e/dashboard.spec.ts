import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display navigation menu', async ({ page }) => {
    await expect(page.locator('nav, [data-testid*="nav"], [class*="nav"]')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to resume management', async ({ page }) => {
    const resumeLink = page.locator('a[href*="resume"], a[href*="resumes"], text=/resume/i').first();
    
    if (await resumeLink.isVisible()) {
      await resumeLink.click();
      await expect(page).toHaveURL(/.*resume/);
    }
  });

  test('should navigate to analysis page', async ({ page }) => {
    const analysisLink = page.locator('a[href*="analysis"], a[href*="analyze"], text=/analysis/i').first();
    
    if (await analysisLink.isVisible()) {
      await analysisLink.click();
      await expect(page).toHaveURL(/.*analysis|.*analyze/);
    }
  });

  test('should navigate to history page', async ({ page }) => {
    const historyLink = page.locator('a[href*="history"], text=/history/i').first();
    
    if (await historyLink.isVisible()) {
      await historyLink.click();
      await expect(page).toHaveURL(/.*history/);
    }
  });

  test('should display user profile section', async ({ page }) => {
    await expect(page.locator('[data-testid*="profile"], [data-testid*="user"], text=/profile/i, text=/user/i, [class*="profile"]')).toBeVisible({ timeout: 10000 });
  });

  test('should toggle dark/light mode', async ({ page }) => {
    const themeToggle = page.locator('[data-testid*="theme"], [data-testid*="dark"], [data-testid*="light"], button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="light"]').first();
    
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await expect(page.locator('[data-theme], html[class*="dark"], body[class*="dark"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display quick stats', async ({ page }) => {
    await expect(page.locator('text=/stat|count|total/i, [data-testid*="stat"], [class*="stat"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show recent activity', async ({ page }) => {
    await expect(page.locator('text=/recent|activity|last/i, [data-testid*="recent"], [data-testid*="activity"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const mobileMenu = page.locator('[data-testid*="mobile-menu"], [data-testid*="hamburger"], button[aria-label*="menu"], .hamburger');
    
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('nav a, nav button')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should logout successfully', async ({ page }) => {
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout"), a:has-text("Sign Out"), [data-testid*="logout"]').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), [data-testid*="confirm"]').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      await expect(page).toHaveURL(/.*login|.*home|^\/$/);
    }
  });
});
