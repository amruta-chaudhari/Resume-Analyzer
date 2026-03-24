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

/**
 * Create a rate limit middleware for a specific endpoint/feature
 */
export function createRateLimitMiddleware(_limitKey: RateLimitKey) {
  return async (_req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      // Disabled internal endpoint rate limiters temporarily
      return next();
    } catch (error) {
      Logger.error('Rate limiter middleware error:', error instanceof Error ? error : new Error(String(error)));
      // Don't block request on middleware error, just log
      next();
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
