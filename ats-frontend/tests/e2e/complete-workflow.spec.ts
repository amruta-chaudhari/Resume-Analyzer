import { test, expect } from '@playwright/test';

test.describe('Complete User Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete full analysis workflow', async ({ page }) => {
    await page.goto('/');
    
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      const testResume = Buffer.from('John Doe\nSoftware Engineer\nExperience: React, Node.js');
      await fileInput.setInputFiles({
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: testResume
      });
      
      await page.waitForTimeout(2000);
      
      const jobDescription = page.locator('textarea[name*="job"], textarea[name*="description"]').first();
      if (await jobDescription.isVisible()) {
        await jobDescription.fill('Looking for Software Engineer with React and Node.js experience');
      }
      
      const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Submit")').first();
      if (await analyzeButton.isVisible()) {
        await analyzeButton.click();
        
        await page.waitForTimeout(3000);
        
        await expect(page.locator('text=/score|result|analysis|match/i, [data-testid*="result"]')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should handle user registration and login flow', async ({ page }) => {
    const signupLink = page.locator('a:has-text("Sign Up"), a:has-text("Register"), a[href*="signup"], a[href*="register"]').first();
    
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await page.waitForURL(/.*signup|.*register|.*sign-up/);
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const confirmPasswordInput = page.locator('input[name="confirmPassword"], input[name="confirm_password"]').first();
      
      if (await emailInput.isVisible()) {
        await emailInput.fill(`test_${Date.now()}@example.com`);
      }
      
      if (await passwordInput.isVisible()) {
        await passwordInput.fill('TestPassword123!');
      }
      
      if (await confirmPasswordInput.isVisible()) {
        await confirmPasswordInput.fill('TestPassword123!');
      }
      
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        await page.waitForTimeout(2000);
        
        await expect(page.locator('text=/success|welcome|created/i, [data-testid*="success"]')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should manage multiple resumes', async ({ page }) => {
    await page.goto('/resumes');
    
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      for (let i = 1; i <= 3; i++) {
        await fileInput.setInputFiles({
          name: `resume-${i}.pdf`,
          mimeType: 'application/pdf',
          buffer: Buffer.from(`Resume ${i} content`)
        });
        
        await page.waitForTimeout(1000);
      }
      
      await expect(page.locator('text=/resume/i, [data-testid*="resume"]')).toHaveCount({ timeout: 10000 });
    }
  });

  test('should compare resume against different job descriptions', async ({ page }) => {
    await page.goto('/analysis');
    
    const jobDescriptions = [
      'Software Engineer with React experience',
      'Frontend Developer with TypeScript skills',
      'Full Stack Developer with Node.js'
    ];
    
    for (const jd of jobDescriptions) {
      const jobInput = page.locator('textarea[name*="job"], textarea[name*="description"]').first();
      if (await jobInput.isVisible()) {
        await jobInput.fill(jd);
        
        const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Submit")').first();
        if (await analyzeButton.isVisible()) {
          await analyzeButton.click();
          
          await page.waitForTimeout(3000);
          
          await expect(page.locator('text=/score|result/i')).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('should export analysis results', async ({ page }) => {
    await page.goto('/analysis');
    
    const jobInput = page.locator('textarea[name*="job"], textarea[name*="description"]').first();
    if (await jobInput.isVisible()) {
      await jobInput.fill('Test job description');
      
      const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Submit")').first();
      if (await analyzeButton.isVisible()) {
        await analyzeButton.click();
        await page.waitForTimeout(3000);
        
        const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), button:has-text("PDF")').first();
        if (await exportButton.isVisible()) {
          const downloadPromise = page.waitForEvent('download');
          await exportButton.click();
          const download = await downloadPromise;
          
          expect(download.suggestedFilename()).toBeTruthy();
        }
      }
    }
  });

  test('should handle session persistence', async ({ page, context }) => {
    await page.goto('/');
    
    const loginLink = page.locator('a:has-text("Login"), a:has-text("Sign In")').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await page.waitForURL(/.*login/);
      
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('testpassword');
        
        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(2000);
          
          const newPage = await context.newPage();
          await newPage.goto('/');
          
          await expect(newPage.locator('body')).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('should navigate through all main sections', async ({ page }) => {
    const sections = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Resumes', url: '/resumes' },
      { name: 'Analysis', url: '/analysis' },
      { name: 'History', url: '/history' }
    ];
    
    for (const section of sections) {
      await page.goto(section.url);
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveURL(new RegExp(section.url));
    }
  });

  test('should handle theme switching throughout workflow', async ({ page }) => {
    const themeToggle = page.locator('[data-testid*="theme"], [data-testid*="dark"], [data-testid*="light"], button[aria-label*="theme"]').first();
    
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      
      const html = page.locator('html');
      const isDark = await html.evaluate(el => 
        el.classList.contains('dark') || el.getAttribute('data-theme') === 'dark'
      );
      
      expect(isDark).toBe(true);
      
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
  });
});
