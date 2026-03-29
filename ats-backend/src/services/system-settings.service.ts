import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

export type PlanLimitTier = string;
export const ALL_AI_PROVIDERS = ['openrouter', 'openai', 'gemini', 'anthropic'] as const;
export type AiProviderId = (typeof ALL_AI_PROVIDERS)[number];
export const DEFAULT_ACTIVE_PROVIDERS = ALL_AI_PROVIDERS.join(',');

export interface PlanLimitConfig {
  monthlyBudgetUsd: number | null;
  monthlyTokenLimit: number | null;
  monthlyRequestLimit: number | null;
  allowReasoning: boolean;
  allowedModels: string[] | null;
  allowedProviders: AiProviderId[] | null;
}

export type PlanLimitsConfig = Record<string, PlanLimitConfig>;

export interface EffectiveLlmPolicy {
  subscriptionTier: string;
  monthlyBudgetUsd: number | null;
  monthlyTokenLimit: number | null;
  monthlyRequestLimit: number | null;
  allowReasoning: boolean;
  allowedModels: string[] | null;
  allowedProviders: AiProviderId[] | null;
}

export interface SystemSettingsUpdate {
  activeAiProvider?: string;
  openRouterKey?: string | null;
  openAiKey?: string | null;
  geminiKey?: string | null;
  anthropicKey?: string | null;
  allowedModels?: string | null;
  modelPricing?: string | null;
  planLimits?: string | null;
}

type LoadedSettingsRow = {
  id: string;
  activeAiProvider: string;
  openRouterKey: string | null;
  openAiKey: string | null;
  geminiKey: string | null;
  anthropicKey: string | null;
  allowedModels: string | null;
  modelPricing: string | null;
  planLimits?: string | null;
};

const DEFAULT_PLAN_LIMITS: PlanLimitsConfig = {
  free: {
    monthlyBudgetUsd: 2,
    monthlyTokenLimit: 150000,
    monthlyRequestLimit: 40,
    allowReasoning: false,
    allowedModels: null,
    allowedProviders: null,
  },
  pro: {
    monthlyBudgetUsd: 25,
    monthlyTokenLimit: 2000000,
    monthlyRequestLimit: 600,
    allowReasoning: true,
    allowedModels: null,
    allowedProviders: null,
  },
  enterprise: {
    monthlyBudgetUsd: 200,
    monthlyTokenLimit: 20000000,
    monthlyRequestLimit: 6000,
    allowReasoning: true,
    allowedModels: null,
    allowedProviders: null,
  },
  admin: {
    monthlyBudgetUsd: null,
    monthlyTokenLimit: null,
    monthlyRequestLimit: null,
    allowReasoning: true,
    allowedModels: null,
    allowedProviders: null,
  },
};

const PROVIDER_VALUES = new Set([...ALL_AI_PROVIDERS, 'multiple']);

const normalizeNumberOrNull = (value: unknown): number | null => {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const normalizeStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return null;
  }

  return Array.from(new Set(normalized));
};

const normalizeProviderArray = (value: unknown): AiProviderId[] | null => {
  const normalized = normalizeStringArray(value);
  if (!normalized) {
    return null;
  }

  const providers = normalized.filter((item): item is AiProviderId =>
    (ALL_AI_PROVIDERS as readonly string[]).includes(item)
  );

  return providers.length > 0 ? Array.from(new Set(providers)) : null;
};

const safeJsonParse = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const normalizePlanLimitEntry = (
  base: PlanLimitConfig,
  incoming: unknown
): PlanLimitConfig => {
  if (!incoming || typeof incoming !== 'object') {
    return base;
  }

  const record = incoming as Record<string, unknown>;

  return {
    monthlyBudgetUsd: normalizeNumberOrNull(record.monthlyBudgetUsd) ?? base.monthlyBudgetUsd,
    monthlyTokenLimit: normalizeNumberOrNull(record.monthlyTokenLimit) ?? base.monthlyTokenLimit,
    monthlyRequestLimit: normalizeNumberOrNull(record.monthlyRequestLimit) ?? base.monthlyRequestLimit,
    allowReasoning:
      typeof record.allowReasoning === 'boolean' ? record.allowReasoning : base.allowReasoning,
    allowedModels: normalizeStringArray(record.allowedModels) ?? base.allowedModels,
    allowedProviders: normalizeProviderArray(record.allowedProviders) ?? base.allowedProviders,
  };
};

const normalizePlanLimits = (value: unknown): PlanLimitsConfig => {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_PLAN_LIMITS };
  }

  const record = value as Record<string, unknown>;
  const normalized: PlanLimitsConfig = {};
  const planKeys = Array.from(new Set([
    ...Object.keys(DEFAULT_PLAN_LIMITS),
    ...Object.keys(record),
  ])).filter(Boolean);

  for (const key of planKeys) {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey) {
      continue;
    }

    const base = DEFAULT_PLAN_LIMITS[normalizedKey] || DEFAULT_PLAN_LIMITS.free;
    normalized[normalizedKey] = normalizePlanLimitEntry(base, record[key]);
  }

  if (!normalized.free) {
    normalized.free = { ...DEFAULT_PLAN_LIMITS.free };
  }

  return normalized;
};

const normalizeProviderValue = (value: unknown): string => {
  if (typeof value !== 'string') {
    return DEFAULT_ACTIVE_PROVIDERS;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'multiple') {
    return ALL_AI_PROVIDERS.join(',');
  }

  if ((ALL_AI_PROVIDERS as readonly string[]).includes(normalized)) {
    return normalized;
  }

  const parts = normalized
    .split(',')
    .map((item) => item.trim())
    .filter((item) => PROVIDER_VALUES.has(item) && item !== 'multiple');

  if (parts.length === 0) {
    return DEFAULT_ACTIVE_PROVIDERS;
  }

  return Array.from(new Set(parts)).join(',');
};

export const parseProviderList = (value: string | null | undefined): AiProviderId[] => {
  if (!value) {
    return [...ALL_AI_PROVIDERS];
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'multiple') {
    return [...ALL_AI_PROVIDERS];
  }

  const parts = normalized
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is AiProviderId => (ALL_AI_PROVIDERS as readonly string[]).includes(item));

  return parts.length > 0 ? Array.from(new Set(parts)) : [...ALL_AI_PROVIDERS];
};

const maskSecret = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const visibleSuffix = value.slice(-4);
  const visiblePrefix = value.slice(0, Math.min(6, value.length));
  return `${visiblePrefix}...${visibleSuffix}`;
};

export class SystemSettingsService {
  private isMissingPlanLimitsColumnError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2022' &&
      String(error.meta?.column || '').includes('planLimits')
    );
  }

  private async loadSettingsRow(): Promise<LoadedSettingsRow | null> {
    try {
      return (await prisma.systemSetting.findUnique({
        where: { id: 'global' },
        select: {
          id: true,
          activeAiProvider: true,
          openRouterKey: true,
          openAiKey: true,
          geminiKey: true,
          anthropicKey: true,
          allowedModels: true,
          modelPricing: true,
          planLimits: true,
        },
      })) as LoadedSettingsRow | null;
    } catch (error) {
      if (!this.isMissingPlanLimitsColumnError(error)) {
        throw error;
      }

      return (await prisma.systemSetting.findUnique({
        where: { id: 'global' },
        select: {
          id: true,
          activeAiProvider: true,
          openRouterKey: true,
          openAiKey: true,
          geminiKey: true,
          anthropicKey: true,
          allowedModels: true,
          modelPricing: true,
        },
      })) as LoadedSettingsRow | null;
    }
  }

  /**
   * Fetch the global system settings. Returns defaults and env vars if row is missing.
   */
  async getSettings(options?: { includeSecrets?: boolean }) {
    const includeSecrets = options?.includeSecrets ?? true;

    let settings = await this.loadSettingsRow();

    if (!settings) {
      try {
        await prisma.systemSetting.create({
          data: { id: 'global' },
        });
      } catch {
        // Ignore create races and continue by reading current row.
      }

      settings = await this.loadSettingsRow();
    }

    const resolvedSettings: LoadedSettingsRow = settings ?? {
      id: 'global',
      activeAiProvider: DEFAULT_ACTIVE_PROVIDERS,
      openRouterKey: null,
      openAiKey: null,
      geminiKey: null,
      anthropicKey: null,
      allowedModels: null,
      modelPricing: null,
      planLimits: null,
    };

    const openRouterKey = resolvedSettings.openRouterKey || process.env.OPENROUTER_API_KEY || null;
    const openAiKey = resolvedSettings.openAiKey || process.env.OPENAI_API_KEY || null;
    const geminiKey = resolvedSettings.geminiKey || process.env.GEMINI_API_KEY || null;
    const anthropicKey = resolvedSettings.anthropicKey || process.env.ANTHROPIC_API_KEY || null;

    const rawPlanLimits = safeJsonParse<Record<string, unknown> | null>(
      resolvedSettings.planLimits,
      null
    );
    const normalizedPlanLimits = normalizePlanLimits(rawPlanLimits);

    return {
      activeAiProvider: normalizeProviderValue(resolvedSettings.activeAiProvider),
      openRouterKey: includeSecrets ? openRouterKey : null,
      openAiKey: includeSecrets ? openAiKey : null,
      geminiKey: includeSecrets ? geminiKey : null,
      anthropicKey: includeSecrets ? anthropicKey : null,
      hasOpenRouterKey: Boolean(openRouterKey),
      hasOpenAiKey: Boolean(openAiKey),
      hasGeminiKey: Boolean(geminiKey),
      hasAnthropicKey: Boolean(anthropicKey),
      openRouterKeyMasked: maskSecret(openRouterKey),
      openAiKeyMasked: maskSecret(openAiKey),
      geminiKeyMasked: maskSecret(geminiKey),
      anthropicKeyMasked: maskSecret(anthropicKey),
      allowedModels: resolvedSettings.allowedModels || null,
      modelPricing: resolvedSettings.modelPricing || null,
      planLimits: JSON.stringify(normalizedPlanLimits),
      planLimitsResolved: normalizedPlanLimits,
    };
  }

  async getPlanLimits(): Promise<PlanLimitsConfig> {
    const settings = await this.getSettings({ includeSecrets: false });
    return normalizePlanLimits(safeJsonParse<Record<string, unknown> | null>(settings.planLimits, null));
  }

  getDefaultPlanLimits(): PlanLimitsConfig {
    return DEFAULT_PLAN_LIMITS;
  }

  async getEffectiveLlmPolicy(user: {
    subscriptionTier?: string | null;
    llmMonthlyBudgetUsd?: number | null;
    llmMonthlyTokenLimit?: number | null;
    llmMonthlyRequestLimit?: number | null;
    llmAllowReasoning?: boolean | null;
    llmAllowedModels?: string | null;
    llmAllowedProviders?: string | null;
  }): Promise<EffectiveLlmPolicy> {
    const normalizedTier = (user.subscriptionTier || 'free').toLowerCase() as PlanLimitTier;
    const planLimits = await this.getPlanLimits();
    const tierLimits = planLimits[normalizedTier] || planLimits.free || Object.values(planLimits)[0] || DEFAULT_PLAN_LIMITS.free;
    const userAllowedModels = normalizeStringArray(safeJsonParse<unknown>(user.llmAllowedModels, null));
    const userAllowedProviders = normalizeProviderArray(safeJsonParse<unknown>(user.llmAllowedProviders, null));

    return {
      subscriptionTier: normalizedTier,
      monthlyBudgetUsd:
        user.llmMonthlyBudgetUsd != null
          ? normalizeNumberOrNull(user.llmMonthlyBudgetUsd)
          : tierLimits.monthlyBudgetUsd,
      monthlyTokenLimit:
        user.llmMonthlyTokenLimit != null
          ? normalizeNumberOrNull(user.llmMonthlyTokenLimit)
          : tierLimits.monthlyTokenLimit,
      monthlyRequestLimit:
        user.llmMonthlyRequestLimit != null
          ? normalizeNumberOrNull(user.llmMonthlyRequestLimit)
          : tierLimits.monthlyRequestLimit,
      allowReasoning:
        user.llmAllowReasoning != null ? Boolean(user.llmAllowReasoning) : tierLimits.allowReasoning,
      allowedModels: userAllowedModels ?? tierLimits.allowedModels,
      allowedProviders: userAllowedProviders ?? tierLimits.allowedProviders,
    };
  }

  /**
   * Update the global system settings.
   */
  async updateSettings(data: SystemSettingsUpdate) {
    const normalizedPlanLimits = data.planLimits
      ? normalizePlanLimits(safeJsonParse<Record<string, unknown> | null>(data.planLimits, null))
      : null;

    const updated = await prisma.systemSetting.upsert({
      where: { id: 'global' },
      update: {
        activeAiProvider:
          data.activeAiProvider !== undefined
            ? normalizeProviderValue(data.activeAiProvider)
            : undefined,
        openRouterKey: data.openRouterKey !== undefined ? data.openRouterKey : undefined,
        openAiKey: data.openAiKey !== undefined ? data.openAiKey : undefined,
        geminiKey: data.geminiKey !== undefined ? data.geminiKey : undefined,
        anthropicKey: data.anthropicKey !== undefined ? data.anthropicKey : undefined,
        allowedModels: data.allowedModels !== undefined ? data.allowedModels : undefined,
        modelPricing: data.modelPricing !== undefined ? data.modelPricing : undefined,
        planLimits:
          data.planLimits !== undefined
            ? JSON.stringify(normalizedPlanLimits ?? DEFAULT_PLAN_LIMITS)
            : undefined,
      },
      create: {
        id: 'global',
        activeAiProvider: normalizeProviderValue(data.activeAiProvider),
        openRouterKey: data.openRouterKey,
        openAiKey: data.openAiKey,
        geminiKey: data.geminiKey,
        anthropicKey: data.anthropicKey,
        allowedModels: data.allowedModels,
        modelPricing: data.modelPricing,
        planLimits: JSON.stringify(normalizedPlanLimits ?? DEFAULT_PLAN_LIMITS),
      },
    });

    return updated;
  }
}

export const systemSettingsService = new SystemSettingsService();
