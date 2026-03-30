import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import type { UserRole } from '../types';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
}

const JWT_ISSUER = process.env.JWT_ISSUER?.trim() || undefined;
const JWT_ACCESS_AUDIENCE = process.env.JWT_AUDIENCE?.trim() || undefined;

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256'],
      ...(JWT_ISSUER ? { issuer: JWT_ISSUER } : {}),
      ...(JWT_ACCESS_AUDIENCE ? { audience: JWT_ACCESS_AUDIENCE } : {}),
    }) as any;

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = user.role;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
