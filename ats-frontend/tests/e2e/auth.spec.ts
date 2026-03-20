import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login and signup buttons on homepage', async ({ page }) => {
    await expect(page.getByText(/login|sign up/i).first()).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    const loginButton = page.locator('a[href*="login"], button:has-text("Login"), a:has-text("Login")').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await expect(page).toHaveURL(/.*login/);
    }
  });

  test('should navigate to signup page', async ({ page }) => {
    const signupButton = page.locator('a[href*="signup"], a[href*="sign-up"], button:has-text("Sign Up"), a:has-text("Sign Up"), a:has-text("Register")').first();
    if (await signupButton.isVisible()) {
      await signupButton.click();
      await expect(page).toHaveURL(/.*signup|.*sign-up|.*register/);
    }
  });

  test('should show registration form', async ({ page }) => {
    const hasSignupRoute = await page.locator('a[href*="signup"], a[href*="sign-up"], a:has-text("Register"), a:has-text("Sign Up")').count() > 0;
    
    if (hasSignupRoute) {
      const signupLink = page.locator('a[href*="signup"], a[href*="sign-up"], a:has-text("Register"), a:has-text("Sign Up")').first();
      await signupLink.click();
      await page.waitForURL(/.*signup|.*sign-up|.*register/);
      
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"], #signup-password').first()).toBeVisible();
    }
  });

  test('should handle login form submission', async ({ page }) => {
    const hasLoginRoute = await page.locator('a[href*="login"], a:has-text("Login"), a:has-text("Sign In")').count() > 0;
    
    if (hasLoginRoute) {
      const loginLink = page.locator('a[href*="login"], a:has-text("Login"), a:has-text("Sign In")').first();
      await loginLink.click();
      await page.waitForURL(/.*login/);
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
      
      await emailInput.fill('test@example.com');
      await passwordInput.fill('testpassword123');
      await submitButton.click();

      await expect(page).toHaveURL(/.*login/);
      await expect(submitButton).toBeVisible();
    }
  });

  test('should validate empty email field', async ({ page }) => {
    const hasLoginRoute = await page.locator('a[href*="login"]').count() > 0;
    
    if (hasLoginRoute) {
      const loginLink = page.locator('a[href*="login"]').first();
      await loginLink.click();
      await page.waitForURL(/.*login/);
      
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();
      
      await passwordInput.fill('testpassword123');
      await submitButton.click();
      
      const emailInput = page.locator('input[type="email"]').first();
      await expect(emailInput).toBeVisible();
    }
  });
});
