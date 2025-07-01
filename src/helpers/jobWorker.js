import { Worker } from 'bullmq';
import { logger } from '../utils/logger.js';
import { redisOptions } from '../db/connectRedis.js';
import { callSyncVendor, callAsyncVendor } from './vendorService.js';
import * as jobRepository from '../repository/jobRepository.js';

export const processQueuedJob = async (requestId, vendorType, vendorPayload) => {
  try {
    await jobRepository.updateJob(requestId, { status: 'processing' });
    logger.info(`Job ${requestId} status updated to 'processing'.`);

    let vendorResponse;
    if (vendorType === 'sync') {
      vendorResponse = await callSyncVendor(requestId, vendorPayload);
      await jobRepository.updateJob(requestId, {
        status: 'complete',
        result: vendorResponse,
        completedAt: new Date()
      });
      logger.info(`Job ${requestId} completed via synchronous vendor.`);
    } else if (vendorType === 'async') {
      // For async, initial call acknowledges, actual completion is via webhook
      vendorResponse = await callAsyncVendor(requestId, vendorPayload);
      // Status remains 'processing' here, will be 'complete' when webhook arrives
      logger.info(`Job ${requestId} sent to asynchronous vendor, awaiting webhook.`);
    } else {
      throw new Error(`Unsupported vendor type: ${vendorType}`);
    }
  } catch (error) {
    logger.error(`Error processing job ${requestId}:`, error.message);
    // If the error is due to rate limiting and job was re-queued, don't mark as failed immediately
    if (error.message.includes('Rate limit exceeded') && error.message.includes('Job re-queued')) {
      logger.info(`Job ${requestId} temporarily failed due to rate limit, re-queued.`);
      // No DB status update needed here, as it's a temporary state
    } else {
      await jobRepository.updateJob(requestId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
      logger.info(`Job ${requestId} marked as 'failed'.`);
      throw error; // Re-throw to allow BullMQ to handle retries if configured
    }
  }
};
// Create a new Worker instance
const jobWorker = new Worker(
  'processVendorRequest',
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
