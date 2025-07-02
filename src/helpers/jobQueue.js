import { Queue } from 'bullmq';
import { redisOptions } from '../db/connectRedis.js';
import { logger } from '../utils/logger.js';

export const jobQueue = new Queue('processVendorRequest', {
  connection: redisOptions, // Redis connection details from config
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential', // Exponential backoff for retries
      delay: 1000 // 1 second initial delay
    },
    removeOnComplete: true, // Remove job from queue upon successful completion
    removeOnFail: false // Keep failed jobs for inspection
  }
});

logger.info('BullMQ Job Queue initialized.');
