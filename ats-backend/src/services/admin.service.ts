import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { ConflictError, NotFoundError } from '../utils/errors';
import { Logger } from '../utils/logger';
import { sanitizeEmail, sanitizeString } from '../utils/sanitizer';
import type { UserRole } from '../types';
import { ALL_AI_PROVIDERS } from './system-settings.service';
import { llmUsageService } from './llm-usage.service';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

type AdminAuditContext = {
  actorUserId: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

type ListUsersOptions = {
  search?: string;
  page?: number;
  pageSize?: number;
};

type UpdateUserInput = {
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  subscriptionTier?: string;
  role?: UserRole;
  emailVerified?: boolean;
  deleted?: boolean;
  llmMonthlyBudgetUsd?: number | null;
  llmMonthlyTokenLimit?: number | null;
  llmMonthlyRequestLimit?: number | null;
  llmAllowReasoning?: boolean | null;
  llmAllowedModels?: string | null;
  llmAllowedProviders?: string | null;
  llmOpenRouterKey?: string | null;
  llmOpenAiKey?: string | null;
  llmGeminiKey?: string | null;
  llmAnthropicKey?: string | null;
};

const USER_ROLES: UserRole[] = ['USER', 'ADMIN'];

const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && USER_ROLES.includes(value as UserRole);

const parseNumberOrNull = (value: unknown): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('LLM budget and token limits must be non-negative numbers');
  }
  return parsed;
};

const parseStringArrayAsJson = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string' && item.trim().length > 0)) {
      throw new Error('llmAllowedModels must be a JSON array of model ids');
    }
    return JSON.stringify(parsed.map((item) => item.trim()));
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0)) {
    return JSON.stringify(value.map((item) => item.trim()));
  }
  throw new Error('llmAllowedModels must be a JSON array of model ids');
};

const parseProviderArrayAsJson = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }

  const providerSet = new Set(ALL_AI_PROVIDERS);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string' && providerSet.has(item as any))) {
      throw new Error('llmAllowedProviders must be a JSON array of provider ids');
    }
    return JSON.stringify(Array.from(new Set(parsed)));
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string' && providerSet.has(item as any))) {
    return JSON.stringify(Array.from(new Set(value)));
  }

  throw new Error('llmAllowedProviders must be a JSON array of provider ids');
};

const parseSecretValue = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error('Provider keys must be strings');
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const maskSecret = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const prefix = value.slice(0, Math.min(6, value.length));
  const suffix = value.slice(-4);
  return `${prefix}...${suffix}`;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const buildUserSearchWhere = (search?: string): Prisma.UserWhereInput => {
  const normalizedSearch = sanitizeString(search).trim();

  if (!normalizedSearch) {
    return {};
  }

  return {
    OR: [
      { email: { contains: normalizedSearch } },
      { firstName: { contains: normalizedSearch } },
      { lastName: { contains: normalizedSearch } },
      { phone: { contains: normalizedSearch } },
    ],
  };
};

const buildPagination = (page?: number, pageSize?: number) => {
  const normalizedPage = Number.isFinite(page) ? Math.max(1, Number(page)) : DEFAULT_PAGE;
  const normalizedPageSize = Number.isFinite(pageSize)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize)))
    : DEFAULT_PAGE_SIZE;

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    skip: (normalizedPage - 1) * normalizedPageSize,
    take: normalizedPageSize,
  };
};

export class AdminService {
  private async runTransaction<T>(
    callback: (client: PrismaClientLike) => Promise<T>
  ): Promise<T> {
    if (typeof prisma.$transaction === 'function') {
      return prisma.$transaction((tx) => callback(tx));
    }

    return callback(prisma);
  }

  async listUsers(options: ListUsersOptions = {}) {
    const { page, pageSize, skip, take } = buildPagination(options.page, options.pageSize);
    const where = buildUserSearchWhere(options.search);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          subscriptionTier: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          deletedAt: true,
          _count: {
            select: {
              resumes: true,
              analyses: true,
              jobDescriptions: true,
              aiUsage: true,
              refreshSessions: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => ({
        ...user,
        counts: user._count,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          subscriptionTier: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          deletedAt: true,
          llmMonthlyBudgetUsd: true,
          llmMonthlyTokenLimit: true,
          llmMonthlyRequestLimit: true,
          llmAllowReasoning: true,
          llmAllowedModels: true,
          llmAllowedProviders: true,
          llmOpenRouterKey: true,
          llmOpenAiKey: true,
          llmGeminiKey: true,
          llmAnthropicKey: true,
          resumesCreated: true,
          analysesRunToday: true,
          lastAnalysisDate: true,
          aiGenerationsToday: true,
        aiOptimizationsToday: true,
        _count: {
          select: {
            resumes: true,
            analyses: true,
            jobDescriptions: true,
            aiUsage: true,
            refreshSessions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const [
      recentResumes,
      recentAnalyses,
      recentJobDescriptions,
      recentAiUsage,
      recentSessions,
      recentAuditLogs,
      usageSummary,
    ] = await Promise.all([
      prisma.resume.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      }),
      prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          analysisType: true,
          aiProvider: true,
          modelUsed: true,
          status: true,
          createdAt: true,
          completedAt: true,
          errorMessage: true,
        },
      }),
      prisma.jobDescription.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      }),
      prisma.aiUsage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          feature: true,
          aiProvider: true,
          model: true,
          tokensUsed: true,
          estimatedCost: true,
          responseTimeMs: true,
          wasCached: true,
          createdAt: true,
        },
      }),
      prisma.refreshSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          expiresAt: true,
          revokedAt: true,
          replacedBySessionId: true,
          createdAt: true,
          lastUsedAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: {
          OR: [
            {
              entityType: 'user',
              entityId: userId,
            },
            {
              userId,
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          userId: true,
          action: true,
          entityType: true,
          entityId: true,
          ipAddress: true,
          userAgent: true,
          changes: true,
          createdAt: true,
        },
      }),
      llmUsageService.getCurrentMonthSummary({
        id: user.id,
        subscriptionTier: user.subscriptionTier,
        llmMonthlyBudgetUsd: user.llmMonthlyBudgetUsd,
        llmMonthlyTokenLimit: user.llmMonthlyTokenLimit,
        llmMonthlyRequestLimit: user.llmMonthlyRequestLimit,
        llmAllowReasoning: user.llmAllowReasoning,
        llmAllowedModels: user.llmAllowedModels,
        llmAllowedProviders: user.llmAllowedProviders,
      }).catch(() => null),
    ]);

    const {
      llmOpenRouterKey,
      llmOpenAiKey,
      llmGeminiKey,
      llmAnthropicKey,
      ...safeUser
    } = user;

    return {
      user: {
        ...safeUser,
        counts: user._count,
        hasOpenRouterKey: Boolean(llmOpenRouterKey),
        hasOpenAiKey: Boolean(llmOpenAiKey),
        hasGeminiKey: Boolean(llmGeminiKey),
        hasAnthropicKey: Boolean(llmAnthropicKey),
        openRouterKeyMasked: maskSecret(llmOpenRouterKey),
        openAiKeyMasked: maskSecret(llmOpenAiKey),
        geminiKeyMasked: maskSecret(llmGeminiKey),
        anthropicKeyMasked: maskSecret(llmAnthropicKey),
      },
      recentResumes,
      recentAnalyses,
      recentJobDescriptions,
      recentAiUsage,
      recentSessions,
      usageSummary,
      recentAuditLogs: recentAuditLogs.map((entry) => ({
        ...entry,
        changes: this.parseChanges(entry.changes),
      })),
    };
  }

  async updateUser(userId: string, input: UpdateUserInput, auditContext: AdminAuditContext) {
    const sanitizedInput = this.normalizeUpdateInput(input);

    return this.runTransaction(async (tx) => {
      const existingUser = await this.requireUser(tx, userId);

      const nextData = this.buildUserUpdateData(existingUser, sanitizedInput);

      if (Object.keys(nextData).length === 0) {
        return {
          ...existingUser,
          counts: undefined,
        };
      }

      try {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: nextData,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            subscriptionTier: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            deletedAt: true,
             llmMonthlyBudgetUsd: true,
             llmMonthlyTokenLimit: true,
             llmMonthlyRequestLimit: true,
             llmAllowReasoning: true,
             llmAllowedModels: true,
             llmAllowedProviders: true,
             llmOpenRouterKey: true,
             llmOpenAiKey: true,
             llmGeminiKey: true,
             llmAnthropicKey: true,
           },
         });

        await this.createAuditLog(tx, auditContext, {
          action: 'ADMIN_USER_UPDATED',
          entityType: 'user',
          entityId: userId,
          changes: {
            before: this.pickAuditedUserFields(existingUser),
            after: this.pickAuditedUserFields(updatedUser),
          },
        });

        Logger.info('Admin updated user', {
          actorUserId: auditContext.actorUserId,
          targetUserId: userId,
        });

        return updatedUser;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictError('Email already in use', { email: sanitizedInput.email });
        }

        throw error;
      }
    });
  }

  async setUserPassword(userId: string, password: string, auditContext: AdminAuditContext) {
    const trimmedPassword = password.trim();

    if (trimmedPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const passwordHash = await bcrypt.hash(trimmedPassword, 10);

    return this.runTransaction(async (tx) => {
      const user = await this.requireUser(tx, userId);

      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      const revokedSessions = await tx.refreshSession.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
        },
      });

      await this.createAuditLog(tx, auditContext, {
        action: 'ADMIN_USER_PASSWORD_RESET',
        entityType: 'user',
        entityId: user.id,
        changes: {
          revokedSessions: revokedSessions.count,
          passwordChanged: true,
        },
      });

      Logger.warn('Admin reset user password', {
        actorUserId: auditContext.actorUserId,
        targetUserId: user.id,
      });

      return {
        success: true,
        revokedSessions: revokedSessions.count,
      };
    });
  }

  async revokeUserSessions(userId: string, auditContext: AdminAuditContext) {
    return this.runTransaction(async (tx) => {
      const user = await this.requireUser(tx, userId);
      const result = await tx.refreshSession.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
        },
      });

      await this.createAuditLog(tx, auditContext, {
        action: 'ADMIN_USER_SESSIONS_REVOKED',
        entityType: 'user',
        entityId: user.id,
        changes: {
          revokedSessions: result.count,
        },
      });

      Logger.warn('Admin revoked user sessions', {
        actorUserId: auditContext.actorUserId,
        targetUserId: user.id,
        revokedSessions: result.count,
      });

      return {
        success: true,
        revokedSessions: result.count,
      };
    });
  }

  private normalizeUpdateInput(input: UpdateUserInput) {
    const normalized: UpdateUserInput = {};

    if (input.email !== undefined) {
      normalized.email = sanitizeEmail(input.email);
    }

    if (input.firstName !== undefined) {
      normalized.firstName = input.firstName ? sanitizeString(input.firstName) : null;
    }

    if (input.lastName !== undefined) {
      normalized.lastName = input.lastName ? sanitizeString(input.lastName) : null;
    }

    if (input.phone !== undefined) {
      normalized.phone = input.phone ? sanitizeString(input.phone) : null;
    }

    if (input.subscriptionTier !== undefined) {
      normalized.subscriptionTier = sanitizeString(input.subscriptionTier);
    }

    if (input.role !== undefined) {
      if (!isUserRole(input.role)) {
        throw new Error('Invalid user role');
      }
      normalized.role = input.role;
    }

    if (input.emailVerified !== undefined) {
      normalized.emailVerified = Boolean(input.emailVerified);
    }

    if (input.deleted !== undefined) {
      normalized.deleted = Boolean(input.deleted);
    }

    if (input.llmMonthlyBudgetUsd !== undefined) {
      normalized.llmMonthlyBudgetUsd = parseNumberOrNull(input.llmMonthlyBudgetUsd) ?? null;
    }

    if (input.llmMonthlyTokenLimit !== undefined) {
      const parsed = parseNumberOrNull(input.llmMonthlyTokenLimit);
      normalized.llmMonthlyTokenLimit = parsed != null ? Math.floor(parsed) : null;
    }

    if (input.llmMonthlyRequestLimit !== undefined) {
      const parsed = parseNumberOrNull(input.llmMonthlyRequestLimit);
      normalized.llmMonthlyRequestLimit = parsed != null ? Math.floor(parsed) : null;
    }

    if (input.llmAllowReasoning !== undefined) {
      normalized.llmAllowReasoning = input.llmAllowReasoning == null ? null : Boolean(input.llmAllowReasoning);
    }

    if (input.llmAllowedModels !== undefined) {
      normalized.llmAllowedModels = parseStringArrayAsJson(input.llmAllowedModels) ?? null;
    }

    if (input.llmAllowedProviders !== undefined) {
      normalized.llmAllowedProviders = parseProviderArrayAsJson(input.llmAllowedProviders) ?? null;
    }

    if (input.llmOpenRouterKey !== undefined) {
      normalized.llmOpenRouterKey = parseSecretValue(input.llmOpenRouterKey) ?? null;
    }

    if (input.llmOpenAiKey !== undefined) {
      normalized.llmOpenAiKey = parseSecretValue(input.llmOpenAiKey) ?? null;
    }

    if (input.llmGeminiKey !== undefined) {
      normalized.llmGeminiKey = parseSecretValue(input.llmGeminiKey) ?? null;
    }

    if (input.llmAnthropicKey !== undefined) {
      normalized.llmAnthropicKey = parseSecretValue(input.llmAnthropicKey) ?? null;
    }

    return normalized;
  }

  private buildUserUpdateData(
    existingUser: {
      email: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      role: UserRole;
      subscriptionTier: string;
      emailVerified: boolean;
      deletedAt: Date | null;
      llmMonthlyBudgetUsd?: number | null;
      llmMonthlyTokenLimit?: number | null;
      llmMonthlyRequestLimit?: number | null;
      llmAllowReasoning?: boolean | null;
      llmAllowedModels?: string | null;
      llmAllowedProviders?: string | null;
      llmOpenRouterKey?: string | null;
      llmOpenAiKey?: string | null;
      llmGeminiKey?: string | null;
      llmAnthropicKey?: string | null;
    },
    input: UpdateUserInput
  ): Prisma.UserUpdateInput {
    const nextData: Prisma.UserUpdateInput = {};

    if (input.email !== undefined) {
      if (!input.email) {
        throw new Error('A valid email address is required');
      }

      if (input.email !== existingUser.email) {
        nextData.email = input.email;
      }
    }

    if (input.firstName !== undefined && input.firstName !== existingUser.firstName) {
      nextData.firstName = input.firstName;
    }

    if (input.lastName !== undefined && input.lastName !== existingUser.lastName) {
      nextData.lastName = input.lastName;
    }

    if (input.phone !== undefined && input.phone !== existingUser.phone) {
      nextData.phone = input.phone;
    }

    if (
      input.subscriptionTier !== undefined &&
      input.subscriptionTier &&
      input.subscriptionTier !== existingUser.subscriptionTier
    ) {
      nextData.subscriptionTier = input.subscriptionTier;
    }

    if (input.role !== undefined && input.role !== existingUser.role) {
      nextData.role = input.role;
    }

    if (
      input.emailVerified !== undefined &&
      input.emailVerified !== existingUser.emailVerified
    ) {
      nextData.emailVerified = input.emailVerified;
    }

    if (input.deleted !== undefined) {
      const nextDeletedAt = input.deleted ? existingUser.deletedAt || new Date() : null;
      const currentDeletedState = Boolean(existingUser.deletedAt);

      if (Boolean(nextDeletedAt) !== currentDeletedState) {
        nextData.deletedAt = nextDeletedAt;
      }
    }

    if (
      input.llmMonthlyBudgetUsd !== undefined &&
      input.llmMonthlyBudgetUsd !== existingUser.llmMonthlyBudgetUsd
    ) {
      nextData.llmMonthlyBudgetUsd = input.llmMonthlyBudgetUsd;
    }

    if (
      input.llmMonthlyTokenLimit !== undefined &&
      input.llmMonthlyTokenLimit !== existingUser.llmMonthlyTokenLimit
    ) {
      nextData.llmMonthlyTokenLimit = input.llmMonthlyTokenLimit;
    }

    if (
      input.llmMonthlyRequestLimit !== undefined &&
      input.llmMonthlyRequestLimit !== existingUser.llmMonthlyRequestLimit
    ) {
      nextData.llmMonthlyRequestLimit = input.llmMonthlyRequestLimit;
    }

    if (
      input.llmAllowReasoning !== undefined &&
      input.llmAllowReasoning !== existingUser.llmAllowReasoning
    ) {
      nextData.llmAllowReasoning = input.llmAllowReasoning;
    }

    if (
      input.llmAllowedModels !== undefined &&
      input.llmAllowedModels !== existingUser.llmAllowedModels
    ) {
      nextData.llmAllowedModels = input.llmAllowedModels;
    }

    if (
      input.llmAllowedProviders !== undefined &&
      input.llmAllowedProviders !== existingUser.llmAllowedProviders
    ) {
      nextData.llmAllowedProviders = input.llmAllowedProviders;
    }

    if (input.llmOpenRouterKey !== undefined && input.llmOpenRouterKey !== existingUser.llmOpenRouterKey) {
      nextData.llmOpenRouterKey = input.llmOpenRouterKey;
    }

    if (input.llmOpenAiKey !== undefined && input.llmOpenAiKey !== existingUser.llmOpenAiKey) {
      nextData.llmOpenAiKey = input.llmOpenAiKey;
    }

    if (input.llmGeminiKey !== undefined && input.llmGeminiKey !== existingUser.llmGeminiKey) {
      nextData.llmGeminiKey = input.llmGeminiKey;
    }

    if (input.llmAnthropicKey !== undefined && input.llmAnthropicKey !== existingUser.llmAnthropicKey) {
      nextData.llmAnthropicKey = input.llmAnthropicKey;
    }

    return nextData;
  }

  private async requireUser(tx: PrismaClientLike, userId: string) {
    const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          subscriptionTier: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          deletedAt: true,
          llmMonthlyBudgetUsd: true,
          llmMonthlyTokenLimit: true,
          llmMonthlyRequestLimit: true,
          llmAllowReasoning: true,
          llmAllowedModels: true,
          llmAllowedProviders: true,
          llmOpenRouterKey: true,
          llmOpenAiKey: true,
          llmGeminiKey: true,
          llmAnthropicKey: true,
        },
      });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return user;
  }

  private async createAuditLog(
    tx: PrismaClientLike,
    auditContext: AdminAuditContext,
    entry: {
      action: string;
      entityType: string;
      entityId: string;
      changes: Record<string, unknown>;
    }
  ) {
    await tx.auditLog.create({
      data: {
        userId: auditContext.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        changes: JSON.stringify({
          ...entry.changes,
          requestId: auditContext.requestId,
        }),
      },
    });
  }

  private pickAuditedUserFields(user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: UserRole;
    subscriptionTier: string;
    emailVerified: boolean;
    deletedAt: Date | null;
      llmMonthlyBudgetUsd?: number | null;
      llmMonthlyTokenLimit?: number | null;
      llmMonthlyRequestLimit?: number | null;
      llmAllowReasoning?: boolean | null;
      llmAllowedModels?: string | null;
      llmAllowedProviders?: string | null;
      llmOpenRouterKey?: string | null;
      llmOpenAiKey?: string | null;
      llmGeminiKey?: string | null;
      llmAnthropicKey?: string | null;
    }) {
      return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      emailVerified: user.emailVerified,
      deletedAt: user.deletedAt,
      llmMonthlyBudgetUsd: user.llmMonthlyBudgetUsd,
      llmMonthlyTokenLimit: user.llmMonthlyTokenLimit,
      llmMonthlyRequestLimit: user.llmMonthlyRequestLimit,
      llmAllowReasoning: user.llmAllowReasoning,
      llmAllowedModels: user.llmAllowedModels,
      llmAllowedProviders: user.llmAllowedProviders,
      hasOpenRouterKey: Boolean(user.llmOpenRouterKey),
      hasOpenAiKey: Boolean(user.llmOpenAiKey),
      hasGeminiKey: Boolean(user.llmGeminiKey),
      hasAnthropicKey: Boolean(user.llmAnthropicKey),
    };
  }

  private parseChanges(changes: string | null) {
    if (!changes) {
      return null;
    }

    try {
      return JSON.parse(changes);
    } catch (_error) {
      return changes;
    }
  }
}
