import Queue from 'bull';
import { createQueue } from '../config/queue.config';
import { Logger } from '../utils/logger';

/**
 * Job data structure for resume analysis
 */
export interface AnalysisJobData {
  userId: string;
  resumeText: string;
  jobDescription: string;
  jobTitle: string;
  fileBuffer?: Buffer;
  fileName?: string;
  fileMimeType?: string;
  selectedModel?: string;
  temperature?: number;
  max_tokens?: number;
  include_reasoning?: boolean;
}

/**
 * Job result structure
 */
export interface AnalysisJobResult {
  analysisId: string;
  resumeId: string;
  jobDescriptionId: string;
  overallScore?: number;
  status: 'completed' | 'failed';
  error?: string;
}

// Create the analysis queue
let analysisQueue: Queue.Queue<AnalysisJobData> | null = null;

/**
 * Get or create the analysis queue
 */
export const getAnalysisQueue = (): Queue.Queue<AnalysisJobData> => {
  if (!analysisQueue) {
    analysisQueue = createQueue<AnalysisJobData>('resume-analysis', {
      settings: {
        stalledInterval: 5000,
        maxStalledCount: 2,
        lockDuration: 60000, // 60 seconds for analysis
        lockRenewTime: 30000,
        retryProcessDelay: 5000
      },
      defaultJobOptions: {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000 // Start with 2 second delay, exponential increase
        },
        removeOnComplete: {
          age: 3600 // Keep completed jobs for 1 hour
        },
        removeOnFail: false // Keep failed jobs for investigation
      }
    });

    Logger.info('Analysis queue initialized with retry strategy (3 attempts, exponential backoff)');
  }

  return analysisQueue;
};

/**
 * Queue a resume analysis job
 */
export const queueAnalysisJob = async (data: AnalysisJobData): Promise<Queue.Job<AnalysisJobData>> => {
  const queue = getAnalysisQueue();
  
  try {
    const job = await queue.add(data, {
      jobId: `analysis-${data.userId}-${Date.now()}` as any,
      priority: 5,
      delay: 0 // Process immediately
    });

    Logger.info(`Analysis job queued: ${job.id} for user ${data.userId}`);
    return job;
  } catch (error) {
    Logger.error('Failed to queue analysis job:', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Get job status
 */
export const getJobStatus = async (jobId: string): Promise<{
  id: string;
  state: string;
  progress: number;
  data?: AnalysisJobData;
  result?: AnalysisJobResult;
  failedReason?: string;
  attempt?: number;
  startedAt?: Date;
  finishedAt?: Date;
} | null> => {
  const queue = getAnalysisQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress();

  return {
    id: String(job.id),
    state,
    progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    attempt: job.attemptsMade,
    startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
    finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined
  };
};

/**
 * Cancel a queued job
 */
export const cancelJob = async (jobId: string): Promise<boolean> => {
  const queue = getAnalysisQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    Logger.warn(`Job ${jobId} not found`);
    return false;
  }

  try {
    await job.remove();
    Logger.info(`Job ${jobId} cancelled`);
    return true;
  } catch (error) {
    Logger.error(`Failed to cancel job ${jobId}:`, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
};

/**
 * Get queue statistics
 */
export const getQueueStats = async (): Promise<{
  active: number;
  delayed: number;
  failed: number;
  waiting: number;
  completed: number;
  paused: number;
}> => {
  const queue = getAnalysisQueue();
  
  try {
    const [active, delayed, failed, waiting, completed, paused] = await Promise.all([
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getFailedCount(),
      queue.getWaitingCount(),
      queue.getCompletedCount(),
      queue.getPausedCount()
    ]);

    return { active, delayed, failed, waiting, completed, paused };
  } catch (error) {
    Logger.error('Failed to get queue stats:', error instanceof Error ? error : new Error(String(error)));
    return { active: 0, delayed: 0, failed: 0, waiting: 0, completed: 0, paused: 0 };
  }
};

export default {
  getAnalysisQueue,
  queueAnalysisJob,
  getJobStatus,
  cancelJob,
  getQueueStats
};
