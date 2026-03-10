import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import resumeRoutes from './routes/resume.routes';
import aiRoutes from './routes/ai.routes';
import templateRoutes from './routes/template.routes';
import { authMiddleware } from './middleware/auth.middleware';
import path from 'path';

dotenv.config();

const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const app = express();
const PORT = process.env.PORT || 3001;

const defaultCorsOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const configuredCorsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : defaultCorsOrigins;

type HitBucket = {
  count: number;
  resetAt: number;
};

const createRateLimiter = (windowMs: number, max: number) => {
  const buckets = new Map<string, HitBucket>();
  let lastCleanup = 0;

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();

    if (now - lastCleanup > windowMs) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
      lastCleanup = now;
    }

    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      res.setHeader('Retry-After', Math.ceil((existing.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    existing.count += 1;
    return next();
  };
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || configuredCorsOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

const globalLimiter = createRateLimiter(15 * 60 * 1000, 500);
const authLimiter = createRateLimiter(15 * 60 * 1000, 50);
const analyzeLimiter = createRateLimiter(15 * 60 * 1000, 40);
const adminLimiter = createRateLimiter(15 * 60 * 1000, 10);

app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
app.use(cors(corsOptions));
app.use(globalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/auth', authLimiter);
app.use('/api/analyze', analyzeLimiter);
app.use('/api/models/refresh', adminLimiter);
app.use('/api/templates/seed', adminLimiter);

app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  next(err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api', aiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'ATS Resume Analyzer API',
    version: '1.0.0'
  });
});

// Protected route example
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: 'This is a protected route', userId: (req as any).userId });
});

// serve react at /

app.use(express.static('build'));

app.get(/^\/(?!api(?:\/|$)|health(?:\/|$)).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../build/index.html"));
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (res.headersSent) {
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
