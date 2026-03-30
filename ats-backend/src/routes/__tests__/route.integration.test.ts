import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import healthRoutes from '../health.routes';
import modelsRoutes from '../models.routes';

const mockFindUnique = jest.fn();

jest.mock('../../services/ai.service', () => ({
  AIService: jest.fn().mockImplementation(() => ({
    getAvailableModels: jest.fn().mockResolvedValue([
      {
        id: 'model-1',
        name: 'openrouter/free',
        provider: 'openrouter',
        description: 'Free model',
      },
    ]),
    refreshModelsCache: jest.fn().mockResolvedValue([
      {
        id: 'model-1',
        name: 'openrouter/free',
        provider: 'openrouter',
        description: 'Free model',
      },
    ]),
    checkHealth: jest.fn().mockResolvedValue({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'openrouter',
      modelCount: 1,
    }),
  })),
}));

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
  },
}));

describe('Route integration tests', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api', healthRoutes);
    app.use('/api', modelsRoutes);
  });

  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  it('GET /api/health returns healthy', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        status: 'healthy',
        service: 'ATS Resume Analyzer API',
      },
    });
  });

  it('GET /api/models returns available models', async () => {
    const res = await request(app).get('/api/models');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toMatchObject({
      id: 'model-1',
      name: 'openrouter/free',
    });
  });

  it('POST /api/models/refresh rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/models/refresh');

    expect(res.status).toBe(401);
  });

  it('GET /api/health/upstream rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/health/upstream');

    expect(res.status).toBe(401);
  });

  it('GET /api/health/upstream allows admin users', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'admin-1',
      role: 'ADMIN',
      subscriptionTier: 'admin',
      deletedAt: null,
    });

    const token = jwt.sign(
      { userId: 'admin-1', email: 'admin@example.com' },
      process.env.JWT_SECRET || 'test-jwt-secret-key'
    );

    const res = await request(app)
      .get('/api/health/upstream')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });
});
