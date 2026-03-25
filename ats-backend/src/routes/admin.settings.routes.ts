import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { AdminRequest, adminMiddleware } from '../middleware/admin.middleware';
import { systemSettingsService } from '../services/system-settings.service';
import { AIService } from '../services/ai.service';
import { AppError } from '../utils/errors';

const router: Router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/settings', async (req: AdminRequest, res: Response) => {
  try {
    const settings = await systemSettingsService.getSettings();
    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load system settings' });
  }
});

router.patch(
  '/settings',
  [
    body('activeAiProvider').optional().isString(),
    body('openRouterKey').optional({ nullable: true }).isString(),
    body('openAiKey').optional({ nullable: true }).isString(),
    body('geminiKey').optional({ nullable: true }).isString(),
    body('anthropicKey').optional({ nullable: true }).isString(),
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

      return res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update system settings' });
    }
  }
);

export default router;
