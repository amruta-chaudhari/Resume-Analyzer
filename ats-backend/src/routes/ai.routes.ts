import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { AIService } from '../services/ai.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { FileStorageService } from '../services/file-storage.service';
import { ResumeFileService } from '../services/resume-file.service';
import prisma from '../lib/prisma';
import { safeJsonParse } from '../lib/json';

const router = Router();
const aiService = new AIService();

const serverError = (res: Response, error: string) => {
  res.status(500).json({
    success: false,
    error,
  });
};

// Initialize services
const fileStorage = new FileStorageService();
const resumeFileService = new ResumeFileService(fileStorage);

// Initialize file storage
fileStorage.initialize().catch(console.error);

// Configure multer for file uploads (store in memory)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'));
        }
    }
});

// GET /api/models - Get available AI models
router.get('/models', async (req, res) => {
    try {
        const models = await aiService.getAvailableModels();
        res.json({
            success: true,
            data: models
        });
    } catch (_error: any) {
        serverError(res, 'Failed to fetch models');
    }
});

// POST /api/models/refresh - Refresh model cache
router.post('/models/refresh', async (req, res) => {
    try {
        const models = await aiService.refreshModelsCache();
        res.json({
            success: true,
            data: models,
            message: 'Model cache refreshed'
        });
    } catch (_error: any) {
        serverError(res, 'Failed to refresh models');
    }
});

// POST /api/analyze - Analyze resume
router.post('/analyze', authMiddleware, upload.single('resume'), async (req: AuthRequest & { file?: Express.Multer.File }, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const jobDescription = typeof req.body.jobDescription === 'string'
            ? req.body.jobDescription.trim()
            : '';
        const jobTitle = typeof req.body.jobTitle === 'string' && req.body.jobTitle.trim().length > 0
            ? req.body.jobTitle.trim()
            : 'Untitled Job';
        const selectedModel = typeof req.body.selectedModel === 'string' ? req.body.selectedModel : undefined;

        const temperatureParam = Number.parseFloat(String(req.body.temperature ?? ''));
        const maxTokensParam = Number.parseInt(String(req.body.max_tokens ?? ''), 10);
        const temperature = Number.isFinite(temperatureParam)
            ? Math.min(Math.max(temperatureParam, 0), 2)
            : undefined;
        const maxTokens = Number.isFinite(maxTokensParam)
            ? Math.min(Math.max(maxTokensParam, 500), 16000)
            : undefined;

        const modelParameters = {
            temperature,
            max_tokens: maxTokens,
            include_reasoning: req.body.include_reasoning === 'true' || req.body.include_reasoning === true
        };

        if (!jobDescription || jobDescription.length < 30) {
            return res.status(400).json({
                success: false,
                error: 'Job description must be at least 30 characters'
            });
        }

        // Extract text from file
        let text = '';
        try {
            if (req.file.mimetype === 'application/pdf') {
                const parser = new PDFParse({ data: req.file.buffer });
                const data = await parser.getText();
                text = data.text;
            } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const result = await mammoth.extractRawText({ buffer: req.file.buffer });
                text = result.value;
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'Unsupported file type'
                });
            }
        } catch (_error: any) {
            return res.status(400).json({
                success: false,
                error: 'Failed to parse file'
            });
        }

        if (!text || text.trim().length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Resume text is too short or could not be extracted'
            });
        }

        // Analyze with AI
        const analysisResult = await aiService.analyzeResume(text, jobDescription, selectedModel, modelParameters);

        // Process and save the file
        const fileData = await resumeFileService.processResumeFile(req.file, req.userId!);

        // Save to database in a transaction
        const savedData = await prisma.$transaction(async (tx) => {
            // Create or find job description
            let jobDesc = await tx.jobDescription.findFirst({
                where: {
                    userId: req.userId!,
                    title: jobTitle
                }
            });

            if (!jobDesc) {
                jobDesc = await tx.jobDescription.create({
                    data: {
                        userId: req.userId!,
                        title: jobTitle,
                        description: jobDescription
                    }
                });
            } else {
                // Update existing job description
                jobDesc = await tx.jobDescription.update({
                    where: { id: jobDesc.id },
                    data: {
                        description: jobDescription,
                        updatedAt: new Date()
                    }
                });
            }

            // Create resume record
            const resume = await tx.resume.create({
                data: {
                    userId: req.userId!,
                    title: `Resume for ${jobTitle}`,
                    structuredData: fileData.structuredData ? JSON.stringify(fileData.structuredData) : null,
                    extractedText: fileData.processedContent.text,
                    originalFileId: fileData.originalFile.id,
                    originalFileName: fileData.originalFile.originalName,
                    originalFileSize: fileData.originalFile.size,
                    originalFileType: fileData.originalFile.mimeType,
                    fileProcessedAt: new Date(),
                    status: 'analyzed'
                }
            });

            // Save analysis result
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
                    tokensUsed: analysisResult.tokensUsed || null
                }
            });

            return { jobDesc, resume, analysis };
        });

        res.json({
            success: true,
            data: {
                ...analysisResult,
                savedAnalysisId: savedData.analysis.id,
                savedResumeId: savedData.resume.id,
                savedJobDescriptionId: savedData.jobDesc.id
            }
        });

    } catch (_error: any) {
        serverError(res, 'Analysis failed');
    }
});

// GET /api/analyses - Get user's analysis history
router.get('/analyses', authMiddleware, async (req: AuthRequest, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const pageParam = parseInt(req.query.page as string, 10);
        const limitParam = parseInt(req.query.limit as string, 10);
        const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
        const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 10;
        const offset = (page - 1) * limit;

        const [analyses, totalCount] = await Promise.all([
            prisma.analysis.findMany({
                where: { userId: req.userId },
                include: {
                    resume: {
                        select: { id: true, title: true, createdAt: true }
                    },
                    jobDescription: {
                        select: { id: true, title: true, company: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit
            }),
            prisma.analysis.count({
                where: { userId: req.userId }
            })
        ]);

        // Parse the results JSON for each analysis
        const formattedAnalyses = analyses.map(analysis => {
            const parsedResults = safeJsonParse<Record<string, any> | null>(analysis.results, null);
            return {
                id: analysis.id,
                analysisType: analysis.analysisType,
                aiProvider: analysis.aiProvider,
                modelUsed: analysis.modelUsed,
                status: analysis.status,
                createdAt: analysis.createdAt,
                completedAt: analysis.completedAt,
                processingTimeMs: analysis.processingTimeMs,
                tokensUsed: analysis.tokensUsed,
                resume: analysis.resume,
                jobDescription: analysis.jobDescription,
                jobTitle: analysis.jobDescription?.title || 'Untitled Analysis',
                overallScore: parsedResults?.overallScore || parsedResults?.overall_match_score || null,
                results: parsedResults
            };
        });

        res.json({
            success: true,
            data: {
                analyses: formattedAnalyses,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            }
        });
    } catch (_error: any) {
        serverError(res, 'Failed to fetch analyses');
    }
});

// GET /api/analyses/:id - Get specific analysis
router.get('/analyses/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const analysis = await prisma.analysis.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId
            },
            include: {
                resume: {
                    select: { 
                        id: true, 
                        title: true, 
                        content: true, 
                        createdAt: true,
                        originalFileName: true,
                        originalFileId: true
                    }
                },
                jobDescription: {
                    select: { id: true, title: true, company: true, description: true }
                }
            }
        });

        if (!analysis) {
            return res.status(404).json({
                success: false,
                error: 'Analysis not found'
            });
        }

        const parsedResults = safeJsonParse<Record<string, any> | null>(analysis.results, null);

        res.json({
            success: true,
            data: {
                id: analysis.id,
                analysisType: analysis.analysisType,
                aiProvider: analysis.aiProvider,
                modelUsed: analysis.modelUsed,
                status: analysis.status,
                createdAt: analysis.createdAt,
                completedAt: analysis.completedAt,
                processingTimeMs: analysis.processingTimeMs,
                tokensUsed: analysis.tokensUsed,
                resume: analysis.resume,
                jobDescription: analysis.jobDescription,
                jobTitle: analysis.jobDescription?.title || 'Untitled Analysis',
                overallScore: parsedResults?.overallScore || parsedResults?.overall_match_score || null,
                ...parsedResults
            }
        });
    } catch (_error: any) {
        serverError(res, 'Failed to fetch analysis');
    }
});

// GET /api/job-descriptions - Get user's job descriptions
router.get('/job-descriptions', authMiddleware, async (req: AuthRequest, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const jobDescriptions = await prisma.jobDescription.findMany({
            where: { 
                userId: req.userId,
                deletedAt: null
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json({
            success: true,
            data: jobDescriptions
        });
    } catch (_error: any) {
        serverError(res, 'Failed to fetch job descriptions');
    }
});

// POST /api/job-descriptions - Create job description
router.post('/job-descriptions', authMiddleware, async (req: AuthRequest, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const { title, company, location, description, sourceUrl } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                error: 'Title and description are required'
            });
        }

        const jobDescription = await prisma.jobDescription.create({
            data: {
                userId: req.userId,
                title,
                company,
                location,
                description,
                sourceUrl
            }
        });

        res.status(201).json({
            success: true,
            data: jobDescription
        });
    } catch (_error: any) {
        serverError(res, 'Failed to create job description');
    }
});

// PUT /api/job-descriptions/:id - Update job description
router.put('/job-descriptions/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const { title, company, location, description, sourceUrl } = req.body;

        const jobDescription = await prisma.jobDescription.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId,
                deletedAt: null
            }
        });

        if (!jobDescription) {
            return res.status(404).json({
                success: false,
                error: 'Job description not found'
            });
        }

        const updatedJobDescription = await prisma.jobDescription.update({
            where: { id: req.params.id },
            data: {
                title,
                company,
                location,
                description,
                sourceUrl,
                updatedAt: new Date()
            }
        });

        res.json({
            success: true,
            data: updatedJobDescription
        });
    } catch (_error: any) {
        serverError(res, 'Failed to update job description');
    }
});

// DELETE /api/job-descriptions/:id - Delete job description
router.delete('/job-descriptions/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const jobDescription = await prisma.jobDescription.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId,
                deletedAt: null
            }
        });

        if (!jobDescription) {
            return res.status(404).json({
                success: false,
                error: 'Job description not found'
            });
        }

        await prisma.jobDescription.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() }
        });

        res.json({
            success: true,
            message: 'Job description deleted successfully'
        });
    } catch (_error: any) {
        serverError(res, 'Failed to delete job description');
    }
});

// GET /health - Health check
router.get('/health', async (req, res) => {
    try {
        const health = await aiService.checkHealth();
        res.json({
            success: true,
            data: health
        });
    } catch (_error: any) {
        serverError(res, 'Health check failed');
    }
});

export default router;
