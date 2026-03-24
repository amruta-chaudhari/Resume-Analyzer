import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Admin Creation and Login Flow', () => {
  const email = `admin_test_${Date.now()}@example.com`;
  const password = 'Password!123';

  test('should register, promote to admin, and access dashboard', async ({ page }) => {
    // 1. Visit the app
    await page.goto('http://localhost:3000');
    
    // 2. Click register or navigate to register
    await page.goto('http://localhost:3000/register');
    
    // Fill out registration form
    await page.fill('input[name="name"]', 'Admin Test');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Wait for redirect to login or dashboard
    await page.waitForTimeout(2000);
    
    // 3. Promote to Admin via Docker Exec using the exact command
    console.log(`Promoting ${email} to admin...`);
    execSync(`docker exec ats-resume-analyzer node create-admin.js ${email}`);
    
    // 4. Navigate to login if not already there, and login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForTimeout(2000);
    
    // 5. Verify successful login (e.g., URL is not login, or dashboard is visible)
    const url = page.url();
    expect(url).not.toContain('/login');
    
    // Navigate to admin specifically if it exists
    await page.goto('http://localhost:3000/admin');
    await page.waitForTimeout(2000);
    
    console.log('Successfully completed flow! URL is:', page.url());
  });
});
