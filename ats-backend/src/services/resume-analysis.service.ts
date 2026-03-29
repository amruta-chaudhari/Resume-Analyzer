/**
 * Resume Analysis Service
 * Handles AI-powered parsing and analysis of resume content
 */

import { safeJsonParse } from '../lib/json';
import { extractTextFromStructuredData } from '../utils/resume-text-extractor';
import prisma from '../lib/prisma';
import { systemSettingsService } from './system-settings.service';

import OpenAI from 'openai';

const AI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,149}$/;

const normalizeModelId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || !MODEL_ID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
};

const parseAllowedModels = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

export class ResumeAnalysisService {
  /**
   * Extracts readable text from structured resume data
   * Delegates to shared utility for consistency across services
   * @param data - Structured resume data object
   * @returns Plain text representation of the resume
   */
  extractTextFromStructuredData(data: any): string {
    return extractTextFromStructuredData(data);
  }

  /**
   * Parses resume text using AI to extract structured data
   * @param text - Resume text to parse
   * @param userId - User ID (for tracking)
   * @returns Structured resume data as parsed by AI
   * @throws Error if parsing fails or AI service is unavailable
   */
  async parseResumeWithAI(text: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        subscriptionTier: true,
        llmMonthlyBudgetUsd: true,
        llmMonthlyTokenLimit: true,
        llmAllowReasoning: true,
        llmAllowedModels: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const settings = await systemSettingsService.getSettings();
    const policy = await systemSettingsService.getEffectiveLlmPolicy(user as any);

    const model = normalizeModelId(process.env.ANALYSIS_MODEL || 'openrouter/free') || 'openrouter/free';
    const globallyAllowedModels = parseAllowedModels(settings.allowedModels);
    if (globallyAllowedModels.length > 0 && !globallyAllowedModels.includes(model)) {
      throw new Error('Selected model is not allowed by admin policy');
    }

    if (policy.allowedModels && policy.allowedModels.length > 0 && !policy.allowedModels.includes(model)) {
      throw new Error('Selected model is not available for your plan');
    }

    if ((user as any).role !== 'ADMIN') {
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

      const usageRows = await prisma.aiUsage.findMany({
        where: {
          userId,
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          tokensUsed: true,
          costUsd: true,
        },
      });

      const usedTokens = usageRows.reduce((sum, row) => sum + (row.tokensUsed || 0), 0);
      const usedCost = usageRows.reduce((sum, row) => sum + (row.costUsd || 0), 0);

      const estimatedTokens = Math.max(500, Math.ceil(text.length / 4) + 2000);
      if (policy.monthlyTokenLimit != null && (usedTokens + estimatedTokens) > policy.monthlyTokenLimit) {
        throw new Error('Monthly token limit reached for your plan');
      }

      if (policy.monthlyBudgetUsd != null && usedCost >= policy.monthlyBudgetUsd) {
        throw new Error('Monthly LLM budget reached for your plan');
      }
    }

    const openai = new OpenAI({
        apiKey: AI_API_KEY,
        baseURL: process.env.BASE_URL || 'https://openrouter.ai/api/v1',
    });

    const startedAt = Date.now();

    try {
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: `Parse the following resume text into a structured JSON format. Extract the following sections:
            - personalInfo: { fullName, email, phone, location, linkedin, website }
            - summary: professional summary text
            - experience: array of { title, company, location, startDate, endDate, description, achievements }
            - education: array of { degree, institution, location, graduationDate, gpa }
            - skills: array of skill strings
            - certifications: array of { name, issuer, date, expiryDate }
            - projects: array of { name, description, technologies, url }

            Return only valid JSON, no markdown or explanations.`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const responseContent = completion.choices[0].message.content;

      if (!responseContent) {
        throw new Error('AI response was empty');
      }

      // Clean the response - remove any markdown formatting
      const cleanedContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();

      const parsedContent = safeJsonParse<Record<string, any> | null>(cleanedContent, null);
      if (!parsedContent) {
        throw new Error('Failed to parse structured response from AI');
      }

      const usage = (completion as any)?.usage;
      const promptTokens = Number(usage?.prompt_tokens || 0) || Math.max(1, Math.ceil(text.length / 4));
      const completionTokens = Number(usage?.completion_tokens || 0) || Math.max(1, Math.ceil(cleanedContent.length / 4));
      const totalTokens = Number(usage?.total_tokens || 0) || (promptTokens + completionTokens);

      await prisma.aiUsage.create({
        data: {
          userId,
          feature: 'resume_parse',
          aiProvider: 'openrouter',
          model,
          tokensUsed: totalTokens,
          promptTokens,
          completionTokens,
          responseTimeMs: Date.now() - startedAt,
          status: 'completed',
          requestSummary: `chars=${text.length}`,
        } as any,
      }).catch(() => undefined);

      return parsedContent;
    } catch (error: any) {
      await prisma.aiUsage.create({
        data: {
          userId,
          feature: 'resume_parse',
          aiProvider: 'openrouter',
          model,
          responseTimeMs: Date.now() - startedAt,
          status: 'failed',
          details: error instanceof Error ? error.message : 'Unknown AI parse failure',
        } as any,
      }).catch(() => undefined);
      throw new Error('Failed to parse resume with AI');
    }
  }

}
