import { Worker } from 'bullmq';
import connectDB from '../db/mongo.db.js';
import { logger } from '../utils/logger.js';
import { redisOptions } from '../db/connectRedis.js';
import { processQueuedJob } from '../services/jobsService.js';

// Connect to MongoDB for the worker process
connectDB();

// Create a new Worker instance
const jobWorker = new Worker(
  'vendorJobs',
  async (job) => {
    logger.info(`Worker: Processing job ${job.id} with data:`, job.data);
    // Call the service function to handle the actual job processing logic
    await processQueuedJob(job.id, job.data.vendorType, job.data.vendorPayload);
  },
  {
    connection: redisOptions, // Redis connection details
    concurrency: 5 // Process up to 5 jobs concurrently per worker instance
    // Note: Per-vendor rate limiting is handled in vendor.service and rateLimiter.helper,
    // not directly by BullMQ's worker limiter, as it's a cross-job concern.
  }
);

jobWorker.on('completed', (job) => {
  logger.info(`Worker: Job ${job.id} completed successfully.`);
});

jobWorker.on('failed', (job, err) => {
  logger.error(`Worker: Job ${job.id} failed with error: ${err.message}`);
  // The job.service.processQueuedJob already updates the job status in DB to 'failed'
  // BullMQ will handle retries based on defaultJobOptions
});

jobWorker.on('error', (err) => {
  // Log any errors from the worker itself
  logger.error(`Worker error: ${err.message}`);
});
