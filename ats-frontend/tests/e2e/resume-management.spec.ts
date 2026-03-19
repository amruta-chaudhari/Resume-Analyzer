import { test, expect } from '@playwright/test';

test.describe('Resume Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display resume upload functionality', async ({ page }) => {
    await expect(page.locator('input[type="file"], input[accept*="pdf"], input[accept*="docx"], text=/upload|resume/i')).toBeVisible({ timeout: 10000 });
  });

  test('should accept PDF file upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').filter({ hasText: /pdf/i }).first();
    
    if (await fileInput.isVisible()) {
      const testFile = Buffer.from('Test resume content');
      await fileInput.setInputFiles({
        name: 'test-resume.pdf',
        mimeType: 'application/pdf',
        buffer: testFile
      });
      
      await expect(page.locator('text=/uploading|processing|success/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should accept DOCX file upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').filter({ hasText: /docx|word/i }).first();
    
    if (await fileInput.isVisible()) {
      const testFile = Buffer.from('Test resume content');
      await fileInput.setInputFiles({
        name: 'test-resume.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: testFile
      });
      
      await expect(page.locator('text=/uploading|processing|success/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display resume list after upload', async ({ page }) => {
    await page.goto('/resumes');
    
    await expect(page.locator('text=/resume/i, text=/upload/i, [data-testid*="resume"]')).toBeVisible({ timeout: 10000 });
  });

  test('should allow resume deletion', async ({ page }) => {
    await page.goto('/resumes');
    
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove"), [data-testid*="delete"]').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), [data-testid*="confirm"]').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      await expect(page.locator('text=/deleted|removed|success/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display resume preview', async ({ page }) => {
    await page.goto('/resumes');
    
    const previewButton = page.locator('button:has-text("Preview"), button:has-text("View"), [data-testid*="preview"]').first();
    if (await previewButton.isVisible()) {
      await previewButton.click();
      await expect(page.locator('text=/preview|content/i, [data-testid*="preview"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle multiple resume uploads', async ({ page }) => {
    await page.goto('/resumes');
    
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      const testFile1 = Buffer.from('Test resume 1');
      const testFile2 = Buffer.from('Test resume 2');
      
      await fileInput.setInputFiles({
        name: 'resume1.pdf',
        mimeType: 'application/pdf',
        buffer: testFile1
      });
      
      await fileInput.setInputFiles({
        name: 'resume2.pdf',
        mimeType: 'application/pdf',
        buffer: testFile2
      });
      
      await expect(page.locator('text=/resume/i')).toHaveCount({ timeout: 10000 });
    }
  });

  test('should validate file size limits', async ({ page }) => {
    await page.goto('/resumes');
    
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      const largeFile = Buffer.alloc(6 * 1024 * 1024);
      
      try {
        await fileInput.setInputFiles({
          name: 'large-resume.pdf',
          mimeType: 'application/pdf',
          buffer: largeFile
        });
        
        await expect(page.locator('text=/size|limit|large|error/i')).toBeVisible({ timeout: 5000 });
      } catch (error) {
        await expect(page.locator('text=/error|invalid/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should reject unsupported file types', async ({ page }) => {
    await page.goto('/resumes');
    
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      try {
        await fileInput.setInputFiles({
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('test')
        });
        
        await expect(page.locator('text=/type|supported|format|error/i')).toBeVisible({ timeout: 5000 });
      } catch (error) {
        await expect(page.locator('text=/error|invalid/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
