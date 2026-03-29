import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from './auth.middleware';
import type { UserRole } from '../types';

export interface AdminRequest extends AuthRequest {
  adminUser?: {
    id: string;
    email: string;
    role: UserRole;
    subscriptionTier: string;
  };
}

export const hasAdminRole = (role?: UserRole | null): boolean => role === 'ADMIN';
export const requireRole = (_minimumRole: UserRole = 'ADMIN') => {

  return async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          role: true,
          subscriptionTier: true,
          deletedAt: true,
        },
      });

      if (!user || user.deletedAt) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (!hasAdminRole(user.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      req.adminUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
      };

      return next();
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to verify admin access' });
    }
  };
};

export const adminMiddleware = requireRole('ADMIN');
