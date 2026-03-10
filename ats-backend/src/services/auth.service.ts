import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';
import prisma from '../lib/prisma';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class AuthService {
  async register(email: string, password: string, firstName?: string, lastName?: string) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
      },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, email);
    const refreshSession = await this.createRefreshSession(user.id);

    return { user, accessToken, refreshToken: refreshSession.token };
  }

  async login(email: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshSession = await this.createRefreshSession(user.id);

    return { user, accessToken, refreshToken: refreshSession.token };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

      if (!decoded?.userId || !decoded?.sessionId) {
        throw new Error('Invalid refresh token');
      }

      const tokenHash = this.hashToken(refreshToken);

      const currentSession = await prisma.refreshSession.findUnique({
        where: { id: decoded.sessionId },
      });

      if (!currentSession || currentSession.userId !== decoded.userId) {
        throw new Error('Invalid refresh token');
      }

      if (currentSession.revokedAt) {
        await this.revokeAllRefreshSessions(currentSession.userId);
        throw new Error('Refresh token reuse detected');
      }

      if (currentSession.tokenHash !== tokenHash) {
        await this.revokeAllRefreshSessions(currentSession.userId);
        throw new Error('Invalid refresh token');
      }

      if (currentSession.expiresAt <= new Date()) {
        await prisma.refreshSession.update({
          where: { id: currentSession.id },
          data: {
            revokedAt: new Date(),
            lastUsedAt: new Date(),
          },
        });
        throw new Error('Refresh token expired');
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      if (!user) {
        throw new Error('User not found');
      }

      const accessToken = this.generateAccessToken(user.id, user.email);
      const newSession = await this.createRefreshSession(user.id);

      await prisma.refreshSession.update({
        where: { id: currentSession.id },
        data: {
          revokedAt: new Date(),
          replacedBySessionId: newSession.sessionId,
          lastUsedAt: new Date(),
        },
      });

      return { accessToken, refreshToken: newSession.token };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async revokeAllRefreshSessions(userId: string) {
    await prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });
  }

  private generateAccessToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
  }

  private generateRefreshToken(userId: string, sessionId: string): string {
    return jwt.sign(
      { userId, sessionId },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async createRefreshSession(userId: string): Promise<{ token: string; sessionId: string }> {
    const sessionId = randomUUID();
    const token = this.generateRefreshToken(userId, sessionId);
    const tokenHash = this.hashToken(token);

    await prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { token, sessionId };
  }

  verifyAccessToken(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET!);
  }
}
