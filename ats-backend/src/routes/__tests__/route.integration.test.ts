import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import healthRoutes from '../health.routes';
import modelsRoutes from '../models.routes';

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
  })),
}));

describe('Route integration tests', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api', healthRoutes);
    app.use('/api', modelsRoutes);
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
});
