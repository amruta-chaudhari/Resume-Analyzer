/**
 * Rate Limiter Middleware
 * 
 * Enforces per-user rate limits based on subscription tier.
 * Applies different limits to different endpoints.
 * 
 * Returns 429 (Too Many Requests) when limits are exceeded.
 * Includes rate limit headers for client information.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../lib/prisma';
import { rateLimiter, formatResetTime, type RateLimitKey } from '../utils/rate-limiter';
import { Logger } from '../utils/logger';

const parseBooleanFlag = (rawValue: string | undefined): boolean => {
  if (!rawValue) {
    return false;
  }

  const normalized = rawValue.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const isRateLimitingDisabled = () => parseBooleanFlag(process.env.DISABLE_RATE_LIMITS);

/**
 * Create a rate limit middleware for a specific endpoint/feature
 */
export function createRateLimitMiddleware(limitKey: RateLimitKey) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (isRateLimitingDisabled()) {
        return next();
      }

      if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          role: true,
          subscriptionTier: true,
          deletedAt: true,
        },
      });

      if (!user || user.deletedAt) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        return next();
      }

      const usage = rateLimiter.checkLimit(user.id, limitKey, user.subscriptionTier);

      res.setHeader('X-RateLimit-Limit', String(usage.limit));
      res.setHeader('X-RateLimit-Remaining', String(usage.remaining));
      res.setHeader('X-RateLimit-Reset', formatResetTime(usage.resetAt));

      if (!usage.allowed) {
        Logger.warn('Per-user rate limit exceeded', {
          userId: user.id,
          limitKey,
          limit: usage.limit,
          current: usage.current,
        });

        return res.status(429).json({
          success: false,
          error: 'Usage limit exceeded for your current plan',
          data: {
            limitKey,
            limit: usage.limit,
            current: usage.current,
            resetInSeconds: Number(formatResetTime(usage.resetAt)),
          },
        });
      }

      rateLimiter.incrementUsage(user.id, limitKey);
      return next();
    } catch (error) {
      Logger.error('Rate limiter middleware error:', error instanceof Error ? error : new Error(String(error)));
      // Don't block request on middleware error, just log
      return next();
    }
  };
}

/**
 * Middleware for daily analyses limit
 */
export const analysesPerDayLimiter = createRateLimitMiddleware('analyses_daily');

/**
 * Middleware for monthly resume uploads limit
 */
export const resumeUploadsPerMonthLimiter = createRateLimitMiddleware('resumes_monthly');

/**
 * Middleware for monthly job descriptions limit
 */
export const jobDescriptionsPerMonthLimiter = createRateLimitMiddleware(
  'job_descriptions_monthly'
);
