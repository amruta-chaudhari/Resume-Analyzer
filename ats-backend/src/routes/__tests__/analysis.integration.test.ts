import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';

const mockFindFirst = jest.fn();

jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    req.userId = 'user-1';
    req.userRole = 'USER';
    return next();
  },
}));

jest.mock('../../middleware/rate-limiter.middleware', () => ({
  analysesPerDayLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/admin.middleware', () => ({
  adminMiddleware: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../queues/analysis.queue', () => ({
  queueAnalysisJob: jest.fn(),
  getJobStatus: jest.fn(),
  getQueueStats: jest.fn(),
}));

jest.mock('../../services/ai.service', () => ({
  AIService: jest.fn().mockImplementation(() => ({
    planAnalysisExecution: jest.fn(),
  })),
}));

jest.mock('../../services/system-settings.service', () => ({
  systemSettingsService: {
    getEffectiveLlmPolicy: jest.fn(),
    getSettings: jest.fn(),
  },
}));

jest.mock('../../services/llm-usage.service', () => ({
  llmUsageService: {
    getCurrentMonthSummary: jest.fn(),
  },
}));

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    analysis: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    aiUsage: {
      findMany: jest.fn(),
    },
  },
}));

describe('Analysis route integration', () => {
  let app: express.Express;
  let analysisRoutes: any;

  beforeEach(() => {
    jest.clearAllMocks();
    analysisRoutes = require('../analysis.routes').default;
    app = express();
    app.use(bodyParser.json());
    app.use('/api', analysisRoutes);
  });

  it('GET /api/analyses/:id requires authentication', async () => {
    const response = await request(app).get('/api/analyses/analysis-1');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('GET /api/analyses/:id returns parsed overlay data and extracted text', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'analysis-1',
      analysisType: 'ats_analysis',
      aiProvider: 'openrouter',
      modelUsed: 'openai/gpt-5.4-mini',
      status: 'completed',
      createdAt: '2026-04-05T10:00:00.000Z',
      completedAt: '2026-04-05T10:00:05.000Z',
      processingTimeMs: 5000,
      tokensUsed: 1200,
      results: JSON.stringify({
        overallScore: 83,
        resumeReviewOverlay: {
          resumeText: 'Jane Doe\nSkills\nReact',
          suggestions: [
            {
              id: 'overlay-suggestion-1',
              category: 'skills',
              severity: 'high',
              suggestion: 'Add GraphQL to your skills section.',
              status: 'anchored',
              start: 9,
              end: 15,
              lineStart: 2,
              lineEnd: 2,
            },
          ],
          summary: {
            anchored: 1,
            unmapped: 0,
          },
        },
      }),
      resume: {
        id: 'resume-1',
        title: 'Resume for SWE',
        content: null,
        extractedText: 'Jane Doe\nSkills\nReact',
        createdAt: '2026-04-01T00:00:00.000Z',
        originalFileName: 'resume.pdf',
        originalFileId: 'file-1',
      },
      jobDescription: {
        id: 'job-1',
        title: 'Software Engineer',
        company: 'Campus Labs',
        description: 'Build accessible web apps',
      },
    });

    const response = await request(app)
      .get('/api/analyses/analysis-1')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.overallScore).toBe(83);
    expect(response.body.data.resume.extractedText).toContain('Skills');
    expect(response.body.data.resumeReviewOverlay.summary).toEqual({
      anchored: 1,
      unmapped: 0,
    });
    expect(response.body.data.resumeReviewOverlay.suggestions[0].category).toBe('skills');
  });
});
