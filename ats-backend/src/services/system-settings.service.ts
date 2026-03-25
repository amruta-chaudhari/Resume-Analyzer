import prisma from '../lib/prisma';

export interface SystemSettingsUpdate {
  activeAiProvider?: string;
  openRouterKey?: string | null;
  openAiKey?: string | null;
  geminiKey?: string | null;
  anthropicKey?: string | null;
  allowedModels?: string | null;
  modelPricing?: string | null;
}

export class SystemSettingsService {
  /**
   * Fetch the global system settings. Returns defaults and env vars if row is missing.
   */
  async getSettings() {
    let settings = await prisma.systemSetting.findUnique({
      where: { id: 'global' },
    });

    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: { id: 'global' },
      });
    }

    return {
      activeAiProvider: settings.activeAiProvider || 'openrouter',
      openRouterKey: settings.openRouterKey || process.env.OPENROUTER_API_KEY || null,
      openAiKey: settings.openAiKey || process.env.OPENAI_API_KEY || null,
      geminiKey: settings.geminiKey || process.env.GEMINI_API_KEY || null,
      anthropicKey: settings.anthropicKey || process.env.ANTHROPIC_API_KEY || null,
      allowedModels: settings.allowedModels || null,
      modelPricing: settings.modelPricing || null,
    };
  }

  /**
   * Update the global system settings.
   */
  async updateSettings(data: SystemSettingsUpdate) {
    const updated = await prisma.systemSetting.upsert({
      where: { id: 'global' },
      update: {
        activeAiProvider: data.activeAiProvider !== undefined ? data.activeAiProvider : undefined,
        openRouterKey: data.openRouterKey !== undefined ? data.openRouterKey : undefined,
        openAiKey: data.openAiKey !== undefined ? data.openAiKey : undefined,
        geminiKey: data.geminiKey !== undefined ? data.geminiKey : undefined,
        anthropicKey: data.anthropicKey !== undefined ? data.anthropicKey : undefined,
        allowedModels: data.allowedModels !== undefined ? data.allowedModels : undefined,
        modelPricing: data.modelPricing !== undefined ? data.modelPricing : undefined,
      },
      create: {
        id: 'global',
        activeAiProvider: data.activeAiProvider || 'openrouter',
        openRouterKey: data.openRouterKey,
        openAiKey: data.openAiKey,
        geminiKey: data.geminiKey,
        anthropicKey: data.anthropicKey,
        allowedModels: data.allowedModels,
        modelPricing: data.modelPricing,
      },
    });

    return updated;
  }
}

export const systemSettingsService = new SystemSettingsService();
