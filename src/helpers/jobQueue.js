import { Queue } from 'bullmq';
import { redisOptions } from '../db/connectRedis.js';
import { logger } from '../utils/logger.js';

export const jobQueue = new Queue('processVendorRequest', {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

logger.info('BullMQ Job Queue initialized.');
