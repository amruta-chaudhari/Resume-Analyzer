import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { ResumeService } from '../services/resume.service';
import { FileStorageService } from '../services/file-storage.service';
import { ResumeFileService } from '../services/resume-file.service';
import { AIService } from '../services/ai.service';
import prisma from '../lib/prisma';
import { safeJsonParse } from '../lib/json';

const router = Router();

const parseModelParameters = (body: any) => {
  const temperatureParam = Number.parseFloat(String(body.temperature ?? ''));
  const maxTokensParam = Number.parseInt(String(body.max_tokens ?? ''), 10);

  return {
    temperature: Number.isFinite(temperatureParam)
      ? Math.min(Math.max(temperatureParam, 0), 2)
      : undefined,
    max_tokens: Number.isFinite(maxTokensParam)
      ? Math.min(Math.max(maxTokensParam, 500), 16000)
      : undefined,
    include_reasoning: body.include_reasoning === 'true' || body.include_reasoning === true,
  };
};

const normalizeResumeUpdatePayload = (body: any) => {
  const allowedKeys = ['title', 'content', 'templateId', 'structuredData'];
  const incomingKeys = Object.keys(body || {});
  const invalidKeys = incomingKeys.filter((key) => !allowedKeys.includes(key));

  if (invalidKeys.length > 0) {
    throw new Error(`Unsupported fields: ${invalidKeys.join(', ')}`);
  }

  const normalized: {
    title?: string;
    content?: string;
    templateId?: string | null;
    structuredData?: string | Record<string, any> | null;
  } = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0 || body.title.length > 200) {
      throw new Error('Title must be a non-empty string up to 200 characters');
    }
    normalized.title = body.title.trim();
  }

  if (body.content !== undefined) {
    if (typeof body.content !== 'string' || body.content.trim().length === 0) {
      throw new Error('Content must be a non-empty string');
    }
    normalized.content = body.content;
  }

  if (body.templateId !== undefined) {
    if (body.templateId !== null && typeof body.templateId !== 'string') {
      throw new Error('Template ID must be a string or null');
    }
    normalized.templateId = body.templateId;
  }

  if (body.structuredData !== undefined) {
    if (body.structuredData !== null && typeof body.structuredData !== 'string' && typeof body.structuredData !== 'object') {
      throw new Error('Structured data must be an object, JSON string, or null');
    }
    normalized.structuredData = body.structuredData;
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error('No valid fields to update');
  }

  return normalized;
};

// Initialize services
const fileStorage = new FileStorageService();
const resumeFileService = new ResumeFileService(fileStorage);
const resumeService = new ResumeService(fileStorage, resumeFileService);
const aiService = new AIService();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: fileStorage.getMaxFileSize(),
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (fileStorage.getAllowedTypes().includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${fileStorage.getAllowedTypes().join(', ')}`));
    }
  },
});

// Initialize file storage
fileStorage.initialize().catch(console.error);

// All routes require authentication
router.use(authMiddleware);

// GET /api/resumes
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { page, limit, status } = req.query;
    const pageParam = Number.parseInt(page as string, 10);
    const limitParam = Number.parseInt(limit as string, 10);
    const normalizedPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const normalizedLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 10;

    const result = await resumeService.getResumes(
      req.userId!,
      normalizedPage,
      normalizedLimit,
      status as string
    );

    res.json({ success: true, data: result });
  } catch (_error: any) {
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// POST /api/resumes
router.post('/', upload.single('resume'), async (req: AuthRequest & { file?: Express.Multer.File }, res) => {
  try {
    const { title, content, templateId, structuredData } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let resume;

    if (req.file) {
      resume = await resumeService.createResumeFromFile(
        req.userId!,
        title,
        req.file,
        templateId
      );
    } else if (structuredData) {
      // Structured data (JSON)
      const parsedData = safeJsonParse<any>(structuredData, null);
      if (!parsedData) {
        return res.status(400).json({ error: 'Invalid structured data format' });
      }

      resume = await resumeService.createResumeFromStructuredData(
        req.userId!,
        title,
        parsedData,
        templateId
      );
    } else if (content) {
      // Plain text content
      resume = await resumeService.createResumeFromText(
        req.userId!,
        title,
        content,
        templateId
      );
    } else {
      return res.status(400).json({ error: 'Either file, structuredData, or content is required' });
    }

    res.status(201).json({ success: true, data: { resume } });
  } catch (_error: any) {
    res.status(500).json({ error: 'Failed to create resume' });
  }
});

// GET /api/resumes/:id
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const resume = await resumeService.getResumeById(req.params.id, req.userId!);
    res.json({ success: true, data: { resume } });
  } catch (error: any) {
    if (error.message === 'Resume not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

const updateResumeHandler = async (req: AuthRequest, res: Response) => {
  try {
    const normalizedPayload = normalizeResumeUpdatePayload(req.body);

    const resume = await resumeService.updateResume(
      req.params.id,
      req.userId!,
      normalizedPayload
    );
    res.json({ success: true, data: { resume } });
  } catch (error: any) {
    if (error.message?.startsWith('Unsupported fields:') || error.message === 'No valid fields to update' || error.message?.includes('must be')) {
      return res.status(400).json({ error: error.message });
    }

    if (error.message === 'Resume not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to update resume' });
  }
};

// PATCH /api/resumes/:id
router.patch('/:id', updateResumeHandler);

// PUT /api/resumes/:id
router.put('/:id', updateResumeHandler);

// DELETE /api/resumes/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await resumeService.deleteResume(req.params.id, req.userId!);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Resume not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// GET /api/resumes/:id/file - Download original resume file
router.get('/:id/file', async (req: AuthRequest, res) => {
  try {
    const fileBuffer = await resumeService.getResumeFile(req.params.id, req.userId!);

    if (!fileBuffer) {
      return res.status(404).json({ error: 'Original file not found' });
    }

    const metadata = await resumeService.getResumeFileMetadata(req.params.id, req.userId!);

    if (!metadata) {
      return res.status(404).json({ error: 'File metadata not found' });
    }

    res.setHeader('Content-Type', metadata.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
    res.setHeader('Content-Length', metadata.size);
    res.send(fileBuffer);
  } catch (_error: any) {
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// GET /api/resumes/:id/file/metadata - Get file metadata
router.get('/:id/file/metadata', async (req: AuthRequest, res) => {
  try {
    const metadata = await resumeService.getResumeFileMetadata(req.params.id, req.userId!);

    if (!metadata) {
      return res.status(404).json({ error: 'File metadata not found' });
    }

    res.json({ success: true, data: metadata });
  } catch (_error: any) {
    res.status(500).json({ error: 'Failed to load file metadata' });
  }
});

// GET /api/resumes/:id/export/pdf
router.get('/:id/export/pdf', async (req: AuthRequest, res) => {
  try {
    const pdfBuffer = await resumeService.exportToPDF(req.params.id, req.userId!);

    // Set headers for binary response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resume-${req.params.id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Send the buffer directly without any transformation
    res.status(200).end(pdfBuffer);
  } catch (_error: any) {
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// GET /api/resumes/:id/export/word
router.get('/:id/export/word', async (req: AuthRequest, res) => {
  try {
    const wordBuffer = await resumeService.exportToWord(req.params.id, req.userId!);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="resume-${req.params.id}.docx"`);
    res.send(wordBuffer);
  } catch (_error: any) {
    res.status(500).json({ error: 'Failed to export Word document' });
  }
});

// POST /api/resumes/parse
router.post('/parse', async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length < 30) {
      return res.status(400).json({ error: 'Resume text must be at least 30 characters' });
    }

    const parsedResume = await resumeService.parseResumeWithAI(text.trim(), req.userId!);
    res.json({ success: true, data: parsedResume });
  } catch (_error: any) {
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

// POST /api/resumes/:id/analyze
router.post('/:id/analyze', async (req: AuthRequest, res) => {
  try {
    const { jobDescription, jobTitle, selectedModel } = req.body;

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 30) {
      return res.status(400).json({ error: 'Job description must be at least 30 characters' });
    }

    const resume = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.userId!, deletedAt: null },
      select: {
        id: true,
        title: true,
        extractedText: true,
        content: true,
      },
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resumeText = (resume.extractedText || resume.content || '').trim();
    if (resumeText.length < 50) {
      return res.status(400).json({ error: 'Resume content is too short to analyze' });
    }

    const modelParameters = parseModelParameters(req.body);

    const normalizedJobTitle = typeof jobTitle === 'string' && jobTitle.trim().length > 0
      ? jobTitle.trim()
      : 'Untitled Job';

    const analysisResult = await aiService.analyzeResume(
      resumeText,
      jobDescription.trim(),
      selectedModel,
      modelParameters
    );

    const savedData = await prisma.$transaction(async (tx) => {
      let jobDesc = await tx.jobDescription.findFirst({
        where: {
          userId: req.userId!,
          title: normalizedJobTitle,
        },
      });

      if (!jobDesc) {
        jobDesc = await tx.jobDescription.create({
          data: {
            userId: req.userId!,
            title: normalizedJobTitle,
            description: jobDescription.trim(),
          },
        });
      } else {
        jobDesc = await tx.jobDescription.update({
          where: { id: jobDesc.id },
          data: {
            description: jobDescription.trim(),
            updatedAt: new Date(),
          },
        });
      }

      const analysis = await tx.analysis.create({
        data: {
          userId: req.userId!,
          resumeId: resume.id,
          jobDescriptionId: jobDesc.id,
          analysisType: 'ats_analysis',
          aiProvider: analysisResult.modelUsed?.provider || 'unknown',
          modelUsed: analysisResult.modelUsed?.id || selectedModel || 'unknown',
          results: JSON.stringify(analysisResult),
          status: 'completed',
          completedAt: new Date(),
          processingTimeMs: analysisResult.processingTime || null,
          tokensUsed: analysisResult.tokensUsed || null,
        },
      });

      return { jobDesc, analysis };
    });

    res.json({
      success: true,
      data: {
        ...analysisResult,
        savedAnalysisId: savedData.analysis.id,
        savedResumeId: resume.id,
        savedJobDescriptionId: savedData.jobDesc.id,
      },
    });
  } catch (_error: any) {
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

// GET /api/resumes/:id/preview
router.get('/:id/preview', async (req: AuthRequest, res) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.userId!, deletedAt: null },
      include: { template: true },
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Try to parse content as JSON, fallback to plain text
    const structuredContent = typeof resume.content === 'string'
      ? safeJsonParse<Record<string, any> | null>(resume.content, { text: resume.content })
      : resume.content;

    const safeContent = structuredContent ?? { text: resume.content ?? '' };
    const html = resumeService.generateFormattedHTML(safeContent, resume.template);
    res.send(html);
  } catch (_error: any) {
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// POST /api/resumes/preview
router.post('/preview', async (req: AuthRequest, res) => {
  try {
    const { content, templateId } = req.body;

    if (!content || typeof content !== 'object') {
      return res.status(400).json({ error: 'Preview content is required' });
    }

    // Find template if specified
    const template = templateId ? await prisma.template.findUnique({
      where: { id: templateId },
    }) : null;

    const html = resumeService.generateFormattedHTML(content, template);
    res.send(html);
  } catch (_error: any) {
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

export default router;
