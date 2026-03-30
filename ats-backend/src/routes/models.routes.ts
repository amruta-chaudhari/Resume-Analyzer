/**
 * AI Models Routes
 * Handles model listing and cache refresh endpoints
 */

import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import type { AIModel, ApiResponse } from '../types/index';

const router: Router = Router();
const aiService = new AIService();

/**
 * Standard error response helper
 */
const serverError = (res: Response, error: string) => {
  res.status(500).json({
    success: false,
    error,
  });
};

/**
 * GET /api/models - Get available AI models
 * Returns cached list of models available through OpenRouter
 * No authentication required
 */
router.get('/models', async (req: Request, res: Response) => {
    try {
        const models = await aiService.getAvailableModels();
        const response: ApiResponse<AIModel[]> = {
            success: true,
            data: models
        };
        res.json(response);
    } catch (_error: unknown) {
        serverError(res, 'Failed to fetch models');
    }
});

router.post('/models/refresh', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
    try {
        const models = await aiService.refreshModelsCache();
        const response: ApiResponse<AIModel[]> = {
            success: true,
            data: models,
            message: 'Model cache refreshed'
        };
        res.json(response);
    } catch (_error: unknown) {
        serverError(res, 'Failed to refresh models');
    }
});

export default router;
