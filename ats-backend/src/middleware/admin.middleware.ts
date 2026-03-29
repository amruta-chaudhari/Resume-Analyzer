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

export const hasAdminRole = (role?: UserRole | null): boolean => role === 'ADMIN' || role === 'SUPER_ADMIN';

export const hasSuperAdminRole = (role?: UserRole | null): boolean => role === 'SUPER_ADMIN';

export const requireRole = (minimumRole: UserRole = 'ADMIN') => {
  const checkFn = minimumRole === 'SUPER_ADMIN' ? hasSuperAdminRole : hasAdminRole;

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

      if (!checkFn(user.role)) {
        const message = minimumRole === 'SUPER_ADMIN' ? 'Super admin access required' : 'Admin access required';
        return res.status(403).json({ error: message });
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
