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
}

export const llmUsageService = new LlmUsageService();
