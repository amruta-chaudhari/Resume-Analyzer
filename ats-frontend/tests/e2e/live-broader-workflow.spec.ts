import { test, expect } from '@playwright/test';
import { createMovieUniversePhdPersona } from '../helpers/livePersona';
import { expectDashboardReady, expectLoggedOut } from '../helpers/auth';

test.describe('Live Broader Workflow', () => {
  test.describe.configure({ mode: 'serial' });

  test('supports live resume CRUD, job description CRUD, and stored-resume analysis for a movie-company PhD persona', async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Live end-to-end workflow runs once in chromium.');
    test.setTimeout(180000);

    const persona = createMovieUniversePhdPersona(testInfo);

    await page.goto('/signup');
    await page.getByLabel(/first name/i).fill('Elara');
    await page.getByLabel(/last name/i).fill('Voss');
    await page.getByLabel(/^email$/i).fill(persona.auth.email);
    await page.getByLabel(/^password$/i).first().fill(persona.auth.password);
    await page.getByLabel(/confirm password/i).fill(persona.auth.password);
    await page.getByRole('button', { name: /create account/i }).click();

    await expectDashboardReady(page);

    await page.goto('/dashboard/resumes');
    await expect(page.getByRole('heading', { name: /my resumes/i })).toBeVisible();

    await page.getByRole('button', { name: /create new resume|create your first resume/i }).first().click();
    await expect(page.getByRole('heading', { name: /create new resume/i })).toBeVisible();
    await page.getByLabel(/resume title/i).fill(persona.resumeTitle);
    await page.getByLabel(/resume content/i).fill(persona.resumeContent);
    await page.getByRole('button', { name: /^create resume$/i }).click();

    const initialResumeCard = page.getByRole('button').filter({ hasText: persona.resumeTitle }).first();
    await expect(initialResumeCard).toBeVisible({ timeout: 15000 });

    await initialResumeCard.getByLabel(/edit resume/i).click();
    await expect(page.getByRole('heading', { name: /edit resume/i })).toBeVisible();
    await page.getByLabel(/resume title/i).fill(persona.updatedResumeTitle);
    await page.getByLabel(/resume content/i).fill(persona.updatedResumeContent);
    await page.getByRole('button', { name: /update resume/i }).click();

    const updatedResumeCard = page.getByRole('button').filter({ hasText: persona.updatedResumeTitle }).first();
    await expect(updatedResumeCard).toBeVisible({ timeout: 15000 });

    await page.goto('/dashboard/history');
    await expect(page.getByRole('heading', { name: /analysis history/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /job description manager/i })).toBeVisible();

    await page.getByRole('button', { name: /add job description|add your first job description/i }).first().click();
    await page.getByLabel(/job title/i).fill(persona.jobTitle);
    await page.getByLabel(/^job description/i).fill(persona.jobDescription);
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(page.getByText(persona.jobTitle)).toBeVisible({ timeout: 15000 });

    const jobManagerCard = (title: string) => page.locator('div.glass.rounded-2xl.p-6').filter({
      hasText: title,
      has: page.getByLabel(/edit job description/i),
    });

    const initialJobCard = jobManagerCard(persona.jobTitle);
    await expect(initialJobCard).toHaveCount(1);
    await initialJobCard.getByLabel(/edit job description/i).click();
    await page.getByLabel(/job title/i).fill(persona.updatedJobTitle);
    await page.getByLabel(/^job description/i).fill(persona.updatedJobDescription);
    await page.getByRole('button', { name: /^update$/i }).click();
    await expect(page.getByText(persona.updatedJobTitle)).toBeVisible({ timeout: 15000 });

    await page.goto('/dashboard/resumes');
    const analysisResumeCard = page.getByRole('button').filter({ hasText: persona.updatedResumeTitle }).first();
    await analysisResumeCard.click();

    await expect(page.getByRole('button', { name: /back to resumes/i })).toBeVisible();
    await page.getByLabel(/job description/i).fill(persona.updatedJobDescription);
    await page.getByRole('button', { name: /analyze resume match/i }).click();

    const analysisErrorAppeared = await page
      .getByRole('alert')
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true)
      .catch(() => false);

    if (analysisErrorAppeared) {
      const errorMessage = (await page.getByRole('alert').textContent())?.trim() || 'Unknown analysis error';
      throw new Error(`Stored-resume analysis failed before navigation: ${errorMessage}`);
    }

    await expect(page).toHaveURL(/\/analysis\//, { timeout: 120000 });
    await expect(page.getByRole('heading', { name: /analysis results/i })).toBeVisible({ timeout: 120000 });
    await expect(page.getByText(/overall match score/i)).toBeVisible();

    await page.getByRole('button', { name: /back to dashboard|new analysis/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.goto('/dashboard/history');
    await expect(page.getByRole('button', { name: new RegExp(persona.updatedJobTitle, 'i') }).first()).toBeVisible({ timeout: 15000 });

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    const updatedJobCard = jobManagerCard(persona.updatedJobTitle);
    await expect(updatedJobCard).toHaveCount(1);
    await updatedJobCard.getByLabel(/delete job description/i).click();
    await expect(jobManagerCard(persona.updatedJobTitle)).toHaveCount(0);

    await page.goto('/dashboard/resumes');
    const deleteResumeCard = page.getByRole('button').filter({ hasText: persona.updatedResumeTitle }).first();
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await deleteResumeCard.getByLabel(/delete resume/i).click();
    await expect(page.getByText(persona.updatedResumeTitle)).not.toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /logout/i }).click();
    await expectLoggedOut(page);
  });
});
