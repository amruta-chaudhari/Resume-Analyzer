import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  jobDescription: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockRegister = jest.fn();
const mockLogin = jest.fn();
const mockRefresh = jest.fn();
const mockRevokeRefreshSession = jest.fn();

jest.mock('../../services/auth.service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    register: mockRegister,
    login: mockLogin,
    refreshToken: mockRefresh,
    revokeRefreshSession: mockRevokeRefreshSession,
  })),
}));

jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    req.userId = 'user-1';
    req.userRole = 'USER';
    return next();
  },
}));

jest.mock('../../middleware/rate-limiter.middleware', () => ({
  jobDescriptionsPerMonthLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

describe('Auth + Job description route integration', () => {
  let app: express.Express;
  let authRoutes: any;
  let jobDescriptionRoutes: any;

  beforeEach(() => {
    jest.clearAllMocks();
    authRoutes = require('../auth.routes').default;
    jobDescriptionRoutes = require('../job-descriptions.routes').default;
    app = express();
    app.use(bodyParser.json());
    app.use('/api/auth', authRoutes);
    app.use('/api', jobDescriptionRoutes);
  });

  it('POST /api/auth/register returns tokens for valid payload', async () => {
    mockRegister.mockResolvedValueOnce({
      user: {
        id: 'user-1',
        email: 'student@example.com',
        firstName: 'Student',
        lastName: 'User',
        subscriptionTier: 'free',
        emailVerified: false,
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'student@example.com',
        password: 'Password123!',
        firstName: 'Student',
        lastName: 'User',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBe('access-token');
  });

  it('POST /api/auth/login maps invalid credentials to 401', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'wrong-password',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('POST /api/auth/refresh validates required refreshToken', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid input/i);
  });

  it('POST /api/job-descriptions rejects too-short description', async () => {
    const res = await request(app)
      .post('/api/job-descriptions')
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: 'Software Engineer',
        description: 'Too short',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/between 30 and 20000 characters/i);
  });

  it('POST /api/job-descriptions/bulk-delete validates ids list', async () => {
    const res = await request(app)
      .post('/api/job-descriptions/bulk-delete')
      .set('Authorization', 'Bearer valid-token')
      .send({ ids: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one job description id is required/i);
  });

  it('POST /api/job-descriptions/bulk-delete returns summary counts', async () => {
    mockPrisma.jobDescription.updateMany.mockResolvedValueOnce({ count: 2 });

    const res = await request(app)
      .post('/api/job-descriptions/bulk-delete')
      .set('Authorization', 'Bearer valid-token')
      .send({ ids: ['jd-1', 'jd-2', 'jd-2'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      requested: 2,
      deleted: 2,
      skipped: 0,
    });
  });
});
