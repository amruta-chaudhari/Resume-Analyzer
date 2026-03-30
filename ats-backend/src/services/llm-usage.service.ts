import prisma from '../lib/prisma';
import type { AiProviderId } from './system-settings.service';
import { systemSettingsService } from './system-settings.service';

type UsageUserPolicyInput = {
  id: string;
  subscriptionTier?: string | null;
  llmMonthlyBudgetUsd?: number | null;
  llmMonthlyTokenLimit?: number | null;
  llmMonthlyRequestLimit?: number | null;
  llmAllowReasoning?: boolean | null;
  llmAllowedModels?: string | null;
  llmAllowedProviders?: string | null;
};

export type LlmUsageSummary = {
  period: {
    start: string;
    end: string;
  };
  totals: {
    requestCount: number;
    completedRequests: number;
    failedRequests: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    totalCostUsd: number;
  };
  limits: {
    monthlyBudgetUsd: number | null;
    monthlyTokenLimit: number | null;
    monthlyRequestLimit: number | null;
  };
  remaining: {
    monthlyBudgetUsd: number | null;
    monthlyTokenLimit: number | null;
    monthlyRequestLimit: number | null;
  };
  allowedProviders: AiProviderId[] | null;
  providerBreakdown: Array<{
    provider: string;
    requestCount: number;
    completedRequests: number;
    failedRequests: number;
    totalTokens: number;
    totalCostUsd: number;
    lastUsedAt: string | null;
  }>;
  modelBreakdown: Array<{
    model: string;
    provider: string;
    requestCount: number;
    totalTokens: number;
    totalCostUsd: number;
  }>;
  featureBreakdown: Array<{
    feature: string;
    requestCount: number;
    totalTokens: number;
    totalCostUsd: number;
  }>;
};

export type AdminLlmAnalyticsFilters = {
  from?: Date;
  to?: Date;
  provider?: string;
  model?: string;
  feature?: string;
  status?: string;
  userId?: string;
  minTokens?: number;
  maxTokens?: number;
  minCost?: number;
  maxCost?: number;
  maxResponseTimeMs?: number;
  query?: string;
  limit?: number;
};

const getCurrentMonthUtcWindow = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
};

const roundUsd = (value: number) => Number(value.toFixed(6));

export class LlmUsageService {
  async getCurrentMonthSummary(user: UsageUserPolicyInput): Promise<LlmUsageSummary> {
    const { start, end } = getCurrentMonthUtcWindow();
    const [policy, rows] = await Promise.all([
      systemSettingsService.getEffectiveLlmPolicy(user),
      prisma.aiUsage.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          feature: true,
          aiProvider: true,
          model: true,
          tokensUsed: true,
          promptTokens: true,
          completionTokens: true,
          costUsd: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    let requestCount = 0;
    let completedRequests = 0;
    let failedRequests = 0;
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalCostUsd = 0;

    const providerMap = new Map<string, {
      provider: string;
      requestCount: number;
      completedRequests: number;
      failedRequests: number;
      totalTokens: number;
      totalCostUsd: number;
      lastUsedAt: string | null;
    }>();
    const modelMap = new Map<string, {
      model: string;
      provider: string;
      requestCount: number;
      totalTokens: number;
      totalCostUsd: number;
    }>();
    const featureMap = new Map<string, {
      feature: string;
      requestCount: number;
      totalTokens: number;
      totalCostUsd: number;
    }>();

    for (const row of rows) {
      requestCount += 1;
      totalTokens += row.tokensUsed || 0;
      promptTokens += row.promptTokens || 0;
      completionTokens += row.completionTokens || 0;
      totalCostUsd += row.costUsd || 0;

      if ((row.status || '').toLowerCase() === 'completed') {
        completedRequests += 1;
      } else {
        failedRequests += 1;
      }

      const providerKey = row.aiProvider || 'unknown';
      const providerEntry = providerMap.get(providerKey) || {
        provider: providerKey,
        requestCount: 0,
        completedRequests: 0,
        failedRequests: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        lastUsedAt: null,
      };
      providerEntry.requestCount += 1;
      providerEntry.totalTokens += row.tokensUsed || 0;
      providerEntry.totalCostUsd += row.costUsd || 0;
      providerEntry.lastUsedAt = providerEntry.lastUsedAt || row.createdAt.toISOString();
      if ((row.status || '').toLowerCase() === 'completed') {
        providerEntry.completedRequests += 1;
      } else {
        providerEntry.failedRequests += 1;
      }
      providerMap.set(providerKey, providerEntry);

      const modelKey = `${providerKey}::${row.model || 'unknown'}`;
      const modelEntry = modelMap.get(modelKey) || {
        model: row.model || 'unknown',
        provider: providerKey,
        requestCount: 0,
        totalTokens: 0,
        totalCostUsd: 0,
      };
      modelEntry.requestCount += 1;
      modelEntry.totalTokens += row.tokensUsed || 0;
      modelEntry.totalCostUsd += row.costUsd || 0;
      modelMap.set(modelKey, modelEntry);

      const featureKey = row.feature || 'unknown';
      const featureEntry = featureMap.get(featureKey) || {
        feature: featureKey,
        requestCount: 0,
        totalTokens: 0,
        totalCostUsd: 0,
      };
      featureEntry.requestCount += 1;
      featureEntry.totalTokens += row.tokensUsed || 0;
      featureEntry.totalCostUsd += row.costUsd || 0;
      featureMap.set(featureKey, featureEntry);
    }

    const remainingBudgetUsd =
      policy.monthlyBudgetUsd == null ? null : Math.max(0, roundUsd(policy.monthlyBudgetUsd - totalCostUsd));
    const remainingTokenLimit =
      policy.monthlyTokenLimit == null ? null : Math.max(0, policy.monthlyTokenLimit - totalTokens);
    const remainingRequestLimit =
      policy.monthlyRequestLimit == null ? null : Math.max(0, policy.monthlyRequestLimit - requestCount);

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      totals: {
        requestCount,
        completedRequests,
        failedRequests,
        totalTokens,
        promptTokens,
        completionTokens,
        totalCostUsd: roundUsd(totalCostUsd),
      },
      limits: {
        monthlyBudgetUsd: policy.monthlyBudgetUsd,
        monthlyTokenLimit: policy.monthlyTokenLimit,
        monthlyRequestLimit: policy.monthlyRequestLimit,
      },
      remaining: {
        monthlyBudgetUsd: remainingBudgetUsd,
        monthlyTokenLimit: remainingTokenLimit,
        monthlyRequestLimit: remainingRequestLimit,
      },
      allowedProviders: policy.allowedProviders,
      providerBreakdown: Array.from(providerMap.values()).map((entry) => ({
        ...entry,
        totalCostUsd: roundUsd(entry.totalCostUsd),
      })),
      modelBreakdown: Array.from(modelMap.values())
        .map((entry) => ({
          ...entry,
          totalCostUsd: roundUsd(entry.totalCostUsd),
        }))
        .sort((a, b) => b.totalCostUsd - a.totalCostUsd || b.totalTokens - a.totalTokens)
        .slice(0, 10),
      featureBreakdown: Array.from(featureMap.values())
        .map((entry) => ({
          ...entry,
          totalCostUsd: roundUsd(entry.totalCostUsd),
        }))
        .sort((a, b) => b.totalCostUsd - a.totalCostUsd || b.requestCount - a.requestCount),
    };
  }

  async getAdminAnalytics(filters: AdminLlmAnalyticsFilters = {}) {
    const where: any = {};

    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) {
        where.createdAt.gte = filters.from;
      }
      if (filters.to) {
        where.createdAt.lte = filters.to;
      }
    }

    if (filters.provider) {
      where.aiProvider = filters.provider;
    }
    if (filters.model) {
      where.model = filters.model;
    }
    if (filters.feature) {
      where.feature = filters.feature;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (
      filters.minTokens != null ||
      filters.maxTokens != null
    ) {
      where.tokensUsed = {
        ...(filters.minTokens != null ? { gte: filters.minTokens } : {}),
        ...(filters.maxTokens != null ? { lte: filters.maxTokens } : {}),
      };
    }

    if (
      filters.minCost != null ||
      filters.maxCost != null
    ) {
      where.costUsd = {
        ...(filters.minCost != null ? { gte: filters.minCost } : {}),
        ...(filters.maxCost != null ? { lte: filters.maxCost } : {}),
      };
    }

    if (filters.maxResponseTimeMs != null) {
      where.responseTimeMs = {
        lte: filters.maxResponseTimeMs,
      };
    }

    if (filters.query) {
      const query = filters.query.trim();
      if (query) {
        where.OR = [
          { model: { contains: query, mode: 'insensitive' } },
          { feature: { contains: query, mode: 'insensitive' } },
          { aiProvider: { contains: query, mode: 'insensitive' } },
          { userId: { contains: query, mode: 'insensitive' } },
        ];
      }
    }

    const rows = await prisma.aiUsage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userId: true,
        feature: true,
        aiProvider: true,
        model: true,
        tokensUsed: true,
        promptTokens: true,
        completionTokens: true,
        costUsd: true,
        status: true,
        responseTimeMs: true,
        createdAt: true,
      },
    });

    const normalizedLimit = Math.min(Math.max(Number(filters.limit || 50), 10), 200);
    const events = rows
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, normalizedLimit)
      .map((row) => ({
        id: row.id,
        userId: row.userId,
        provider: row.aiProvider || 'unknown',
        model: row.model || 'unknown',
        feature: row.feature || 'unknown',
        status: row.status || 'unknown',
        tokensUsed: row.tokensUsed || 0,
        promptTokens: row.promptTokens || 0,
        completionTokens: row.completionTokens || 0,
        costUsd: roundUsd(row.costUsd || 0),
        responseTimeMs: row.responseTimeMs || 0,
        createdAt: row.createdAt.toISOString(),
      }));

    const overview = {
      requests: rows.length,
      completed: rows.filter((row) => (row.status || '').toLowerCase() === 'completed').length,
      failed: rows.filter((row) => (row.status || '').toLowerCase() !== 'completed').length,
      totalTokens: rows.reduce((sum, row) => sum + (row.tokensUsed || 0), 0),
      promptTokens: rows.reduce((sum, row) => sum + (row.promptTokens || 0), 0),
      completionTokens: rows.reduce((sum, row) => sum + (row.completionTokens || 0), 0),
      totalCostUsd: roundUsd(rows.reduce((sum, row) => sum + (row.costUsd || 0), 0)),
      avgLatencyMs: rows.length > 0
        ? Math.round(rows.reduce((sum, row) => sum + (row.responseTimeMs || 0), 0) / rows.length)
        : 0,
    };

    const groupMap = (getKey: (row: typeof rows[number]) => string, getLabel: (row: typeof rows[number]) => Record<string, unknown>) => {
      const map = new Map<string, any>();
      for (const row of rows) {
        const key = getKey(row);
        const entry = map.get(key) || {
          ...getLabel(row),
          requestCount: 0,
          totalTokens: 0,
          totalCostUsd: 0,
          completed: 0,
          failed: 0,
        };
        entry.requestCount += 1;
        entry.totalTokens += row.tokensUsed || 0;
        entry.totalCostUsd += row.costUsd || 0;
        if ((row.status || '').toLowerCase() === 'completed') {
          entry.completed += 1;
        } else {
          entry.failed += 1;
        }
        map.set(key, entry);
      }
      return Array.from(map.values()).map((entry) => ({
        ...entry,
        totalCostUsd: roundUsd(entry.totalCostUsd),
      }));
    };

    const timeseriesMap = new Map<string, { date: string; requests: number; totalTokens: number; totalCostUsd: number }>();
    for (const row of rows) {
      const date = row.createdAt.toISOString().slice(0, 10);
      const entry = timeseriesMap.get(date) || { date, requests: 0, totalTokens: 0, totalCostUsd: 0 };
      entry.requests += 1;
      entry.totalTokens += row.tokensUsed || 0;
      entry.totalCostUsd += row.costUsd || 0;
      timeseriesMap.set(date, entry);
    }

    return {
      overview,
      filters: {
        from: filters.from?.toISOString() || null,
        to: filters.to?.toISOString() || null,
        provider: filters.provider || null,
        model: filters.model || null,
        feature: filters.feature || null,
        status: filters.status || null,
        userId: filters.userId || null,
        minTokens: filters.minTokens ?? null,
        maxTokens: filters.maxTokens ?? null,
        minCost: filters.minCost ?? null,
        maxCost: filters.maxCost ?? null,
        maxResponseTimeMs: filters.maxResponseTimeMs ?? null,
        query: filters.query || null,
        limit: normalizedLimit,
      },
      timeseries: Array.from(timeseriesMap.values()).map((entry) => ({
        ...entry,
        totalCostUsd: roundUsd(entry.totalCostUsd),
      })),
      providerBreakdown: groupMap((row) => row.aiProvider || 'unknown', (row) => ({ provider: row.aiProvider || 'unknown' }))
        .sort((a, b) => b.totalCostUsd - a.totalCostUsd || b.requestCount - a.requestCount),
      modelBreakdown: groupMap((row) => `${row.aiProvider || 'unknown'}::${row.model || 'unknown'}`, (row) => ({
        provider: row.aiProvider || 'unknown',
        model: row.model || 'unknown',
      })).sort((a, b) => b.totalCostUsd - a.totalCostUsd || b.requestCount - a.requestCount).slice(0, 20),
      featureBreakdown: groupMap((row) => row.feature || 'unknown', (row) => ({ feature: row.feature || 'unknown' }))
        .sort((a, b) => b.totalCostUsd - a.totalCostUsd || b.requestCount - a.requestCount),
      userBreakdown: groupMap((row) => row.userId, (row) => ({ userId: row.userId }))
        .sort((a, b) => b.totalCostUsd - a.totalCostUsd || b.requestCount - a.requestCount)
        .slice(0, 20),
      events,
    };
  }
}

export const llmUsageService = new LlmUsageService();
