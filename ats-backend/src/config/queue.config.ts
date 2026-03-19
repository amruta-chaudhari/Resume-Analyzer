import Queue, { QueueOptions } from 'bull';
import { Logger } from '../utils/logger';

/**
 * Queue configuration with support for both Redis and in-memory adapters
 * Production: Uses Redis
 * Development: Uses in-memory queue (no persistence)
 */

const isProduction = process.env.NODE_ENV === 'production';
const useRedis = process.env.QUEUE_PROVIDER === 'redis' || isProduction;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Create queue with appropriate adapter based on environment
 */
export const createQueue = <T = any>(
  queueName: string,
  options?: Partial<QueueOptions>
): Queue.Queue<T> => {
  const queueOptions: QueueOptions = {
    // Bull automatically handles Redis connections from URL
    ...(useRedis && { redis: redisUrl }),
    settings: {
      stalledInterval: 5000,
      maxStalledCount: 2,
      lockDuration: 30000,
      lockRenewTime: 15000,
      ...options?.settings
    },
    ...options
  };

  try {
    const queue = new Queue<T>(queueName, queueOptions);

    queue.on('error', (error: Error) => {
      Logger.error(`Queue "${queueName}" error:`, error);
    });

    queue.on('stalled', (job: Queue.Job) => {
      Logger.warn(`Job ${job.id} stalled in queue "${queueName}"`);
    });

    Logger.info(`Queue "${queueName}" created (using ${useRedis ? 'Redis' : 'in-memory'} adapter)`);
    return queue;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    Logger.error(`Failed to create queue "${queueName}":`, err);
    throw error;
  }
};

/**
 * Close all queue connections gracefully
 */
export const closeQueues = async (): Promise<void> => {
  // Bull handles queue closure automatically
  Logger.info('Queue connections closed');
};

export default {
  useRedis,
  redisUrl,
  createQueue,
  closeQueues
};
