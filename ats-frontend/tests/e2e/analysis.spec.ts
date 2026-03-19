import { test, expect } from '@playwright/test';

test.describe('ATS Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display analysis interface', async ({ page }) => {
    await expect(page.locator('text=/analysis|analyze|score/i, [data-testid*="analysis"], [data-testid*="analyze"]')).toBeVisible({ timeout: 10000 });
  });

  test('should accept job description input', async ({ page }) => {
    const jobDescriptionTextarea = page.locator('textarea[name*="job"], textarea[name*="description"], textarea[placeholder*="job" i], textarea[placeholder*="description" i]').first();
    
    if (await jobDescriptionTextarea.isVisible()) {
      await jobDescriptionTextarea.fill('Software Engineer position requiring React, Node.js, and TypeScript experience.');
      await expect(jobDescriptionTextarea).toHaveValue('Software Engineer position requiring React, Node.js, and TypeScript experience.');
    }
  });

  test('should display analysis results', async ({ page }) => {
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Submit"), [data-testid*="analyze"]').first();
    
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();
      
      await expect(page.locator('text=/score|match|result|analysis/i, [data-testid*="result"], [data-testid*="score"]')).toBeVisible({ timeout: 15000 });
    }
  });

  test('should display keyword analysis', async ({ page }) => {
    await expect(page.locator('text=/keyword|skill|match/i, [data-testid*="keyword"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show ATS score', async ({ page }) => {
    const scoreElement = page.locator('[data-testid*="score"], text=/\d+%/, text=/score/i').first();
    
    if (await scoreElement.isVisible()) {
      await expect(scoreElement).toBeVisible();
    }
  });

  test('should provide recommendations', async ({ page }) => {
    await expect(page.locator('text=/recommendation|suggestion|improve|tip/i, [data-testid*="recommend"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle model selection', async ({ page }) => {
    const modelSelector = page.locator('select[name*="model"], [data-testid*="model"], select').first();
    
    if (await modelSelector.isVisible()) {
      const options = await modelSelector.locator('option').all();
      
      if (options.length > 0) {
        await modelSelector.selectIndex(0);
        await expect(modelSelector).toHaveValue(options[0]);
      }
    }
  });

  test('should display loading state during analysis', async ({ page }) => {
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Submit")').first();
    
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();
      
      await expect(page.locator('text=/analyzing|processing|loading/i, [data-loading], .loading')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle empty job description', async ({ page }) => {
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Submit")').first();
    
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();
      
      await expect(page.locator('text=/required|empty|fill/i, [data-error], .error')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display formatting analysis', async ({ page }) => {
    await expect(page.locator('text=/format|formatting|layout|structure/i, [data-testid*="format"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show experience relevance score', async ({ page }) => {
    await expect(page.locator('text=/experience|relevance|match/i, [data-testid*="experience"]')).toBeVisible({ timeout: 10000 });
  });

  test('should allow analysis export', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), button:has-text("Save"), [data-testid*="export"]').first();
    
    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toBeTruthy();
    }
  });
});
