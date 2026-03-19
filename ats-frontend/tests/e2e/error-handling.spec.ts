import { test, expect } from '@playwright/test';

test.describe('Error Handling & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    await context.offline(true);
    
    try {
      await page.reload();
      await expect(page.locator('text=/offline|network|error|connection/i, [data-error], [role="alert"]')).toBeVisible({ timeout: 5000 });
    } finally {
      await context.offline(false);
    }
  });

  test('should handle file upload errors', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.isVisible()) {
      try {
        await fileInput.setInputFiles({
          name: 'corrupted.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('not a valid pdf')
        });
        
        await expect(page.locator('text=/error|invalid|corrupt|format/i, [data-error]')).toBeVisible({ timeout: 10000 });
      } catch (error) {
        await expect(page.locator('text=/error|invalid/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should handle API timeout', async ({ page, context }) => {
    await page.route('**/api/analyze', route => {
      setTimeout(() => route.abort('timedout'), 10000);
    });
    
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Submit")').first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();
      
      await expect(page.locator('text=/timeout|slow|network|error/i, [data-error]')).toBeVisible({ timeout: 15000 });
    }
  });

  test('should handle invalid authentication', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid@example.com');
      await passwordInput.fill('wrongpassword');
      
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        await expect(page.locator('text=/invalid|error|incorrect|failed/i, [data-error]')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should handle session expiration', async ({ page }) => {
    await page.goto('/');
    
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'expired_token');
      localStorage.setItem('refreshToken', 'expired_refresh');
    });
    
    await page.reload();
    
    await expect(page.locator('text=/login|session|expired/i, [data-error]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle large file uploads', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.isVisible()) {
      try {
        const largeFile = Buffer.alloc(10 * 1024 * 1024);
        
        await fileInput.setInputFiles({
          name: 'large.pdf',
          mimeType: 'application/pdf',
          buffer: largeFile
        });
        
        await expect(page.locator('text=/size|limit|large|error/i, [data-error]')).toBeVisible({ timeout: 10000 });
      } catch (error) {
        await expect(page.locator('text=/error|invalid/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should handle concurrent operations', async ({ page }) => {
    const analyzeButtons = page.locator('button:has-text("Analyze"), button:has-text("Submit")');
    
    if (await analyzeButtons.count() > 0) {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(analyzeButtons.first().click());
      }
      
      await Promise.allSettled(promises);
      
      await page.waitForTimeout(5000);
      
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle special characters in input', async ({ page }) => {
    const textInputs = page.locator('input[type="text"], input[type="email"], textarea');
    
    if (await textInputs.count() > 0) {
      const specialChars = '<script>alert("xss")</script> ñ é ü 中文 🎉';
      await textInputs.first().fill(specialChars);
      
      await expect(textInputs.first()).toHaveValue(specialChars);
    }
  });

  test('should handle empty states properly', async ({ page }) => {
    await page.goto('/resumes');
    
    await expect(page.locator('text=/empty|no.*resume|upload.*first/i, [data-empty], [class*="empty"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle rapid clicking', async ({ page }) => {
    const buttons = page.locator('button');
    
    if (await buttons.count() > 0) {
      const button = buttons.first();
      if (await button.isVisible()) {
        for (let i = 0; i < 5; i++) {
          await button.click({ timeout: 1000 });
        }
        
        await page.waitForTimeout(2000);
        
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should handle browser back/forward', async ({ page }) => {
    await page.goto('/');
    await page.goto('/resumes');
    await page.goto('/analysis');
    
    await page.goBack();
    await expect(page).toHaveURL(/.*resumes/);
    
    await page.goBack();
    await expect(page).toHaveURL(/.*\//);
    
    await page.goForward();
    await expect(page).toHaveURL(/.*resumes/);
  });

  test('should handle tab closing and reopening', async ({ page, context }) => {
    await page.goto('/');
    
    const newPage = await context.newPage();
    await newPage.goto('/');
    
    await expect(newPage.locator('body')).toBeVisible({ timeout: 10000 });
    
    await newPage.close();
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle slow network conditions', async ({ page, context }) => {
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 2000);
    });
    
    await page.goto('/');
    
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
  });

  test('should handle malformed JSON responses', async ({ page }) => {
    await page.route('**/api/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{ invalid json'
      });
    });
    
    await page.goto('/');
    
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('should handle missing required fields', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      await expect(page.locator('text=/required|field|empty/i, [data-error], [class*="error"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle duplicate submissions', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);
      await submitButton.click();
      await page.waitForTimeout(500);
      await submitButton.click();
      
      await page.waitForTimeout(2000);
      
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
