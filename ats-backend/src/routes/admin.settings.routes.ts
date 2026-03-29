import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { AdminRequest, adminMiddleware } from '../middleware/admin.middleware';
import { systemSettingsService } from '../services/system-settings.service';
import { AIService } from '../services/ai.service';
import { AppError } from '../utils/errors';
import { Logger } from '../utils/logger';

const router: Router = Router();

const ALLOWED_PROVIDERS = new Set(['openrouter', 'openai', 'gemini', 'anthropic', 'multiple']);

const parseJsonString = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const validateProviderInput = (raw: unknown): boolean => {
  if (typeof raw !== 'string') {
    return false;
  }

  const normalized = raw.trim().toLowerCase();
  if (ALLOWED_PROVIDERS.has(normalized)) {
    return true;
  }

  const parts = normalized.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 && parts.every((part) => ALLOWED_PROVIDERS.has(part));
};

const validateAllowedModelsString = (raw: unknown): boolean => {
  if (raw == null) {
    return true;
  }

  if (typeof raw !== 'string') {
    return false;
  }

  const parsed = parseJsonString<unknown>(raw, null);
  if (!Array.isArray(parsed)) {
    return false;
  }

  return parsed.every((item) => typeof item === 'string' && item.trim().length > 0);
};

const validateModelPricingString = (raw: unknown): boolean => {
  if (raw == null) {
    return true;
  }

  if (typeof raw !== 'string') {
    return false;
  }

  const parsed = parseJsonString<Record<string, unknown> | null>(raw, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }

  return Object.values(parsed).every((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const record = value as Record<string, unknown>;
    const prompt = record.prompt;
    const completion = record.completion;

    const isValidCost = (candidate: unknown) => {
      if (candidate == null || candidate === '') {
        return true;
      }

      const parsedNumber = Number(candidate);
      return Number.isFinite(parsedNumber) && parsedNumber >= 0;
    };

    return isValidCost(prompt) && isValidCost(completion);
  });
};

const validatePlanLimitsString = (raw: unknown): boolean => {
  if (raw == null) {
    return true;
  }

  if (typeof raw !== 'string') {
    return false;
  }

  const parsed = parseJsonString<Record<string, unknown> | null>(raw, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }

  const tiers = ['free', 'pro', 'enterprise', 'admin'];
  return tiers.every((tier) => {
    const tierValue = parsed[tier];
    if (!tierValue || typeof tierValue !== 'object' || Array.isArray(tierValue)) {
      return false;
    }

    const tierRecord = tierValue as Record<string, unknown>;
    const budget = tierRecord.monthlyBudgetUsd;
    const tokens = tierRecord.monthlyTokenLimit;
    const allowReasoning = tierRecord.allowReasoning;
    const allowedModels = tierRecord.allowedModels;

    const isNumberOrNull = (candidate: unknown) => {
      if (candidate == null || candidate === '') {
        return true;
      }

      const parsedNumber = Number(candidate);
      return Number.isFinite(parsedNumber) && parsedNumber >= 0;
    };

    const isAllowedModelsValid =
      allowedModels == null ||
      (Array.isArray(allowedModels) && allowedModels.every((item) => typeof item === 'string'));

    return (
      isNumberOrNull(budget) &&
      isNumberOrNull(tokens) &&
      typeof allowReasoning === 'boolean' &&
      isAllowedModelsValid
    );
  });
};

router.use(authMiddleware, adminMiddleware);

router.get('/settings', async (req: AdminRequest, res: Response) => {
  try {
    const settings = await systemSettingsService.getSettings({ includeSecrets: false });
    return res.json({
      success: true,
      data: settings,
    });
  } catch (error: unknown) {
    Logger.error('Failed to load system settings', error instanceof Error ? error : undefined);
    return res.status(500).json({ error: 'Failed to load system settings' });
  }
});
router.get('/models', async (req: AdminRequest, res: Response) => {
  try {
    const aiService = new AIService();
    const providerOverride = req.query.provider as string | undefined;

    if (providerOverride && !validateProviderInput(providerOverride)) {
      return res.status(400).json({ error: 'Invalid provider query parameter' });
    }
    
    // Pass checkCache=false, skipFilter=true to get exactly what's currently returned from the providers
    const models = await aiService.getAvailableModels(false, true, providerOverride);
    return res.json({
      success: true,
      data: models,
    });
  } catch (error: unknown) {
    Logger.error('Failed to load models list', error instanceof Error ? error : undefined);
    return res.status(500).json({ error: 'Failed to load models list' });
  }
});

router.patch(
  '/settings',
  [
    body('activeAiProvider').optional().custom(validateProviderInput),
    body('openRouterKey').optional({ nullable: true }).isString(),
    body('openAiKey').optional({ nullable: true }).isString(),
    body('geminiKey').optional({ nullable: true }).isString(),
    body('anthropicKey').optional({ nullable: true }).isString(),
    body('allowedModels').optional({ nullable: true }).custom(validateAllowedModelsString),
    body('modelPricing').optional({ nullable: true }).custom(validateModelPricingString),
    body('planLimits').optional({ nullable: true }).custom(validatePlanLimitsString),
  ],
  async (req: AdminRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input', details: errors.array() });
      }

      const updated = await systemSettingsService.updateSettings(req.body);

      // Force model cache clear so new models list becomes instantly available
      const aiService = new AIService();
      aiService.clearCache();

      const safeSettings = await systemSettingsService.getSettings({ includeSecrets: false });

      return res.json({
        success: true,
        data: safeSettings,
      });
    } catch (error: unknown) {
      Logger.error('Failed to update system settings', error instanceof Error ? error : undefined);
      return res.status(500).json({ error: 'Failed to update system settings' });
    }
  }
);

export default router;
