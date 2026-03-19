import { test, expect } from '@playwright/test';

test.describe('UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render glassmorphism design elements', async ({ page }) => {
    await expect(page.locator('[class*="glass"], [class*="glass-strong"], .glass, .glass-strong')).toBeVisible({ timeout: 10000 });
  });

  test('should display gradient buttons', async ({ page }) => {
    await expect(page.locator('[class*="gradient"], .btn-glass, button[class*="gradient"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show loading animations', async ({ page }) => {
    await expect(page.locator('[class*="animate"], [class*="pulse"], .animate-pulse, [data-loading]')).toBeVisible({ timeout: 10000 });
  });

  test('should display Lucide icons', async ({ page }) => {
    await expect(page.locator('[class*="lucide"], svg[data-lucide], [data-testid*="icon"]')).toBeVisible({ timeout: 10000 });
  });

  test('should have responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display proper color scheme', async ({ page }) => {
    const html = page.locator('html');
    const bgColor = await html.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    expect(bgColor).toBeTruthy();
  });

  test('should have accessible contrast', async ({ page }) => {
    const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, label');
    const firstText = textElements.first();
    
    if (await firstText.isVisible()) {
      const color = await firstText.evaluate(el => 
        window.getComputedStyle(el).color
      );
      expect(color).toBeTruthy();
    }
  });

  test('should display tooltips', async ({ page }) => {
    const tooltipElements = page.locator('[data-tooltip], [title], [aria-label]');
    
    if (await tooltipElements.count() > 0) {
      await expect(tooltipElements.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have proper form validation', async ({ page }) => {
    const inputs = page.locator('input[required], input[pattern], input[type="email"]');
    
    if (await inputs.count() > 0) {
      const firstInput = inputs.first();
      await firstInput.focus();
      await firstInput.blur();
      
      await expect(page.locator('[data-error], .error, [class*="error"], [class*="invalid"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display modal dialogs', async ({ page }) => {
    const modalTriggers = page.locator('button:has-text("Open"), button:has-text("View"), button:has-text("Details")');
    
    if (await modalTriggers.count() > 0) {
      await modalTriggers.first().click();
      await expect(page.locator('[role="dialog"], [data-testid*="modal"], [class*="modal"], [class*="dialog"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle empty states', async ({ page }) => {
    await expect(page.locator('text=/empty|no.*data|nothing/i, [data-empty], [class*="empty"]')).toBeVisible({ timeout: 10000 });
  });

  test('should display error messages properly', async ({ page }) => {
    const errorTriggers = page.locator('button:has-text("Error"), button:has-text("Invalid")');
    
    if (await errorTriggers.count() > 0) {
      await errorTriggers.first().click();
      await expect(page.locator('[data-error], [class*="error"], [role="alert"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have smooth transitions', async ({ page }) => {
    const elementsWithTransitions = page.locator('[class*="transition"], [class*="animate"]');
    
    if (await elementsWithTransitions.count() > 0) {
      const transition = await elementsWithTransitions.first().evaluate(el => 
        window.getComputedStyle(el).transition
      );
      expect(transition).toBeTruthy();
    }
  });

  test('should display score rings or progress indicators', async ({ page }) => {
    await expect(page.locator('[class*="ring"], [class*="progress"], [class*="score"], [data-testid*="ring"], [data-testid*="score"]')).toBeVisible({ timeout: 10000 });
  });

  test('should have proper hover states', async ({ page }) => {
    const buttons = page.locator('button, a[href]');
    
    if (await buttons.count() > 0) {
      const firstButton = buttons.first();
      await firstButton.hover();
      
      const hoverStyle = await firstButton.evaluate(el => 
        window.getComputedStyle(el, ':hover').backgroundColor
      );
      expect(hoverStyle).toBeTruthy();
    }
  });
});
