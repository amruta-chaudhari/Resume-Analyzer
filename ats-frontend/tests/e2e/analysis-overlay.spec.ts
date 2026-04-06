import { test, expect, type Page } from '@playwright/test';

const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const createSimplePdfBuffer = (lines: string[]) => {
  const textStream = [
    'BT',
    '/F1 18 Tf',
    '72 744 Td',
    ...lines.flatMap((line, index) => index === 0
      ? [`(${escapePdfText(line)}) Tj`]
      : ['0 -26 Td', `(${escapePdfText(line)}) Tj`]),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(textStream, 'utf8')} >>\nstream\n${textStream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += object;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
};

const bootstrapAnalysisOverlayMocks = async (page: Page) => {
  const user = {
    id: 'overlay-user-1',
    email: 'overlay.user@example.com',
    firstName: 'Overlay',
    lastName: 'Tester',
    subscriptionTier: 'free',
  };

  const resumeText = [
    'Jane Doe',
    'jane@example.com | linkedin.com/in/janedoe',
    '',
    'Summary',
    'Builds accessible student-facing products for universities.',
    '',
    'Experience',
    'Frontend Intern',
    '- Built analytics dashboards',
    '- Improved resume completion funnel',
    '',
    'Skills',
    'React, TypeScript, Figma',
  ].join('\n');
  const anchorSnippet = '- Built analytics dashboards';
  const anchorStart = resumeText.indexOf(anchorSnippet);
  const anchorEnd = anchorStart + anchorSnippet.length;
  const pdfBuffer = createSimplePdfBuffer([
    'Jane Doe',
    'Experience',
    '- Built analytics dashboards',
    'React, TypeScript, Figma',
  ]);

  const analysis = {
    id: 'analysis-overlay-1',
    overallScore: 87,
    analysisMethod: 'hybrid_deterministic_v2',
    tokensUsed: 1450,
    promptTokens: 980,
    completionTokens: 470,
    estimatedCost: '0.000000',
    processingTime: 5210,
    modelUsed: {
      id: 'openrouter/free',
      name: 'GPT-5.4 Mini',
      provider: 'openrouter',
    },
    resume: {
      id: 'resume-1',
      title: 'Campus Product Resume',
      extractedText: resumeText,
    },
    skillsAnalysis: {
      score: 88,
      matchedKeywords: ['React', 'TypeScript', 'analytics'],
      missingKeywords: ['A/B testing'],
      recommendations: ['Highlight experimentation and dashboard ownership.'],
    },
    formattingScore: {
      score: 82,
      issues: ['Bullets could quantify impact more precisely.'],
      suggestions: ['Use consistent metric framing across your experience bullets.'],
    },
    experienceRelevance: {
      score: 90,
      relevantExperience: 'Strong alignment with frontend product delivery and analytics ownership.',
      gaps: ['Tie dashboard work to user adoption metrics.'],
    },
    actionableAdvice: [
      'Quantify dashboard adoption with active-user or stakeholder metrics.',
      'Add one line about how your funnel work improved outcomes.',
    ],
    resumeReviewOverlay: {
      resumeText,
      document: {
        sections: [
          {
            id: 'resume-section-summary-1',
            title: 'Summary',
            start: resumeText.indexOf('Summary'),
            end: resumeText.indexOf('Builds accessible student-facing products for universities.') + 'Builds accessible student-facing products for universities.'.length,
            lineStart: 4,
            lineEnd: 5,
            blockIds: ['resume-block-3', 'resume-block-4'],
          },
          {
            id: 'resume-section-experience-2',
            title: 'Experience',
            start: resumeText.indexOf('Experience'),
            end: resumeText.indexOf('- Improved resume completion funnel') + '- Improved resume completion funnel'.length,
            lineStart: 7,
            lineEnd: 10,
            blockIds: ['resume-block-5', 'resume-block-6', 'resume-block-7', 'resume-block-8'],
          },
          {
            id: 'resume-section-skills-3',
            title: 'Skills',
            start: resumeText.indexOf('Skills'),
            end: resumeText.length,
            lineStart: 12,
            lineEnd: 13,
            blockIds: ['resume-block-9', 'resume-block-10'],
          },
        ],
        blocks: [
          { id: 'resume-block-1', kind: 'name', text: 'Jane Doe', start: 0, end: 8, lineStart: 1, lineEnd: 1, sectionTitle: null },
          { id: 'resume-block-2', kind: 'contact', text: 'jane@example.com | linkedin.com/in/janedoe', start: 9, end: 50, lineStart: 2, lineEnd: 2, sectionTitle: null },
          { id: 'resume-block-3', kind: 'heading', text: 'Summary', start: 52, end: 59, lineStart: 4, lineEnd: 4, sectionTitle: 'Summary' },
          { id: 'resume-block-4', kind: 'paragraph', text: 'Builds accessible student-facing products for universities.', start: 60, end: 116, lineStart: 5, lineEnd: 5, sectionTitle: 'Summary' },
          { id: 'resume-block-5', kind: 'heading', text: 'Experience', start: 118, end: 128, lineStart: 7, lineEnd: 7, sectionTitle: 'Experience' },
          { id: 'resume-block-6', kind: 'paragraph', text: 'Frontend Intern', start: 129, end: 144, lineStart: 8, lineEnd: 8, sectionTitle: 'Experience' },
          { id: 'resume-block-7', kind: 'bullet', text: anchorSnippet, start: anchorStart, end: anchorEnd, lineStart: 9, lineEnd: 9, sectionTitle: 'Experience' },
          { id: 'resume-block-8', kind: 'bullet', text: '- Improved resume completion funnel', start: resumeText.indexOf('- Improved resume completion funnel'), end: resumeText.indexOf('- Improved resume completion funnel') + '- Improved resume completion funnel'.length, lineStart: 10, lineEnd: 10, sectionTitle: 'Experience' },
          { id: 'resume-block-9', kind: 'heading', text: 'Skills', start: resumeText.indexOf('Skills'), end: resumeText.indexOf('Skills') + 'Skills'.length, lineStart: 12, lineEnd: 12, sectionTitle: 'Skills' },
          { id: 'resume-block-10', kind: 'paragraph', text: 'React, TypeScript, Figma', start: resumeText.indexOf('React, TypeScript, Figma'), end: resumeText.length, lineStart: 13, lineEnd: 13, sectionTitle: 'Skills' },
        ],
      },
      suggestions: [
        {
          id: 'overlay-1',
          category: 'impact',
          severity: 'high',
          suggestion: 'Quantify dashboard adoption with active-user or stakeholder metrics.',
          rationale: 'Metrics turn strong project ownership into a recruiter-friendly outcome statement.',
          referenceText: anchorSnippet,
          status: 'anchored',
          start: anchorStart,
          end: anchorEnd,
          lineStart: 9,
          lineEnd: 9,
          anchorMethod: 'exact',
          anchorSection: 'Experience',
          anchorBlockIds: ['resume-block-7'],
          anchorSnippet,
        },
        {
          id: 'overlay-2',
          category: 'skills',
          severity: 'medium',
          suggestion: 'Mention experimentation or A/B testing if you have hands-on experience.',
          status: 'anchored',
          start: resumeText.indexOf('React, TypeScript, Figma'),
          end: resumeText.length,
          lineStart: 13,
          lineEnd: 13,
          anchorMethod: 'section',
          anchorSection: 'Skills',
          anchorBlockIds: ['resume-block-10'],
          anchorSnippet: 'React, TypeScript, Figma',
        },
      ],
      summary: { anchored: 2, unmapped: 0 },
    },
  };

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { user } }),
    });
  });

  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { status: 'healthy' } }),
    });
  });

  await page.route('**/api/resumes**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/resumes/resume-1/file') || url.includes('/api/resumes/resume-1/export/pdf')) {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          resumes: [],
          pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        },
      }),
    });
  });

  await page.route('**/api/resumes/resume-1/file/metadata', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          mimeType: 'application/pdf',
          originalName: 'campus-product-resume.pdf',
          size: pdfBuffer.length,
        },
      }),
    });
  });

  await page.route('**/api/resumes/resume-1/file', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      body: pdfBuffer,
    });
  });

  await page.route('**/api/job-descriptions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          jobDescriptions: [],
          pagination: { page: 1, limit: 100, totalItems: 0, totalPages: 1 },
        },
      }),
    });
  });

  await page.route('**/api/analyses/analysis-overlay-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: analysis }),
    });
  });

  await page.route('**/api/analyses**', async (route) => {
    if (route.request().url().includes('/api/analyses/analysis-overlay-1')) {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          analyses: [],
          pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 0 },
        },
      }),
    });
  });

  await page.goto('/login');
  await page.evaluate((authUser) => {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          user: authUser,
          refreshToken: 'overlay-refresh-token',
        },
        version: 0,
      })
    );
  }, user);
  await page.reload({ waitUntil: 'domcontentloaded' });
};

test.describe('Analysis overlay viewer', () => {
  test('renders the review canvas and links suggestion cards to resume blocks', async ({ page }) => {
    await bootstrapAnalysisOverlayMocks(page);
    await page.goto('/dashboard/analysis/analysis-overlay-1');

    await expect(page.getByRole('heading', { name: /analysis results/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /inline resume improvement map/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /resume review canvas/i })).toBeVisible();
    await expect(page.getByText(/rendered resume overlay/i)).toBeVisible();
    await expect(page.getByText(/original pdf/i)).toBeVisible();

    await expect(page.getByRole('button', { name: /open overlay suggestion 1 on page 1/i })).toBeVisible();
    await page.getByRole('button', { name: /open overlay suggestion 1 on page 1/i }).hover();

    await expect(page.getByText(/quantify dashboard adoption with active-user or stakeholder metrics/i).first()).toBeVisible();
    await expect(page.getByText(/page 1/i).first()).toBeVisible();
  });

  test('keeps the review canvas usable on mobile viewports', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootstrapAnalysisOverlayMocks(page);
    await page.goto('/dashboard/analysis/analysis-overlay-1');

    await expect(page.getByRole('heading', { name: /resume review canvas/i })).toBeVisible();
    await expect(page.getByText(/overlay suggestions/i)).toBeVisible();
    await expect(page.getByText(/hover the numbered info markers placed directly on the real resume pages/i)).toBeVisible();
  });
});
