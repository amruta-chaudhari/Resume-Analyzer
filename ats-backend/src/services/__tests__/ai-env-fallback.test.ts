import { MockDataFactory } from '../../__tests__/factories';

describe('AI environment fallback', () => {
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
  const originalBaseUrl = process.env.BASE_URL;

  const applyFallbackEnv = () => {
    delete process.env.OPENAI_API_KEY;
    process.env.OPENROUTER_API_KEY = 'fallback-openrouter-key';
    process.env.BASE_URL = 'https://openrouter.ai/api/v1';
  };

  const restoreEnv = () => {
    if (originalOpenAIKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenAIKey;
    }

    if (originalOpenRouterKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
    }

    if (originalBaseUrl === undefined) {
      delete process.env.BASE_URL;
    } else {
      process.env.BASE_URL = originalBaseUrl;
    }
  };

  afterEach(() => {
    restoreEnv();
    jest.resetModules();
    jest.clearAllMocks();
    jest.unmock('openai');
  });

  it('AIService uses OPENROUTER_API_KEY when OPENAI_API_KEY is missing', async () => {
    applyFallbackEnv();

    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(MockDataFactory.generateAnalysisResult()) } }],
    });
    const mockOpenAI = jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }));

    jest.doMock('openai', () => ({
      __esModule: true,
      default: mockOpenAI,
    }));

    jest.doMock('../system-settings.service', () => ({
      __esModule: true,
      systemSettingsService: {
        getSettings: jest.fn().mockResolvedValue({
          activeAiProvider: 'openrouter',
          openRouterKey: null,
          openAiKey: null,
          geminiKey: null,
          anthropicKey: null,
          allowedModels: null,
          modelPricing: null,
        }),
      },
    }));

    const { AIService } = await import('../ai.service');
    const aiService = new AIService();

    await aiService.analyzeResume(
      MockDataFactory.generateResumeText(),
      MockDataFactory.generateJobDescription()
    );

    expect(mockOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'fallback-openrouter-key',
      baseURL: 'https://openrouter.ai/api/v1',
    }));
  });

  it('ResumeAnalysisService uses OPENROUTER_API_KEY when OPENAI_API_KEY is missing', async () => {
    applyFallbackEnv();

    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            personalInfo: { fullName: 'Jane Doe' },
            summary: 'Summary',
            experience: [],
            education: [],
            skills: ['TypeScript'],
            certifications: [],
            projects: [],
          }),
        },
      }],
    });
    const mockOpenAI = jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }));

    jest.doMock('openai', () => ({
      __esModule: true,
      default: mockOpenAI,
    }));

    jest.doMock('../../lib/prisma', () => ({
      __esModule: true,
      default: {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-1',
            role: 'USER',
            subscriptionTier: 'free',
            llmMonthlyBudgetUsd: null,
            llmMonthlyTokenLimit: null,
            llmAllowReasoning: null,
            llmAllowedModels: null,
          }),
        },
        aiUsage: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ id: 'usage-1' }),
        },
      },
    }));

    jest.doMock('../system-settings.service', () => ({
      __esModule: true,
      systemSettingsService: {
        getSettings: jest.fn().mockResolvedValue({
          allowedModels: null,
        }),
        getEffectiveLlmPolicy: jest.fn().mockResolvedValue({
          allowedModels: null,
          monthlyTokenLimit: null,
          monthlyBudgetUsd: null,
          allowReasoning: true,
          subscriptionTier: 'free',
        }),
      },
    }));

    const { ResumeAnalysisService } = await import('../resume-analysis.service');
    const resumeAnalysisService = new ResumeAnalysisService();

    await resumeAnalysisService.parseResumeWithAI('Jane Doe', 'user-1');

    expect(mockOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'fallback-openrouter-key',
      baseURL: 'https://openrouter.ai/api/v1',
    }));
  });
});
