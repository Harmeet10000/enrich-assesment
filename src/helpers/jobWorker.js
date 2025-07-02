import { Worker } from 'bullmq';
import { logger } from '../utils/logger.js';
import { redisOptions } from '../db/connectRedis.js';
import { callSyncVendor, callAsyncVendor } from '../services/vendorService.js';
import * as jobRepository from '../repository/jobRepository.js';

//To DO list
/**
 * 2. Add rate limiting for each vendor type
 * 3. Add retry logic for failed jobs
 * 4. Implement graceful shutdown for the worker
 * 5. Add monitoring and alerting for job processing plus prometheus and grafana
 *    - Use BullMQ's built-in events and metrics for monitoring job processing
 *    - Consider using BullMQ's `QueueEvents` for real-time monitoring
 *    - Integrate with Prometheus and Grafana for visualization
 *    - Use BullMQ's `QueueEvents` to listen for job events and expose metrics
 *     via a custom endpoint or middleware
 * 6. Implement job prioritization if needed
 * 7. Add unit tests for job processing logic
 * 8. implement a mechanism to handle job duplicates
 * 9. tuning of BullMQ worker concurrency and rate limiting based on vendor capabilities
 * 10. Modify readme to include instructions for running the worker
 * 11. add a infra folder to include docker-compose and k8s files
 * 12.caching with redis and use bulk insert for vendor responses
 *
 * **/

export const processQueuedJob = async (requestId, vendorType, vendorPayload) => {
  try {
    jobRepository.updateJob(requestId, { status: 'processing' });
    logger.info(`Job ${requestId} status updated to 'processing'.`);

    let vendorResponse;
    if (vendorType === 'sync') {
      vendorResponse = await callSyncVendor(requestId, vendorPayload);
      jobRepository.updateJob(requestId, {
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
    logger.error(`Error processing job ${requestId}:`, { error: error.message });
    // If the error is due to rate limiting and job was re-queued, don't mark as failed immediately
    if (error.message.includes('Rate limit exceeded') && error.message.includes('Job re-queued')) {
      logger.info(`Job ${requestId} temporarily failed due to rate limit, re-queued.`);
      // No DB status update needed here, as it's a temporary state
    } else {
      jobRepository.updateJob(requestId, {
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
    logger.info(`Worker: Processing job ${job.data.requestId} with data:`, {
      meta: { job: job.data }
    });
    // Call the service function to handle the actual job processing logic
    await processQueuedJob(job.data.requestId, job.data.vendorType, job.data.vendorPayload);
  },
  {
    connection: redisOptions, // Redis connection details
    concurrency: 5 // Process up to 5 jobs concurrently per worker instance
    // Note: Per-vendor rate limiting is handled in vendor.service and rateLimiter.helper,
    // not directly by BullMQ's worker limiter, as it's a cross-job concern.
  }
);

jobWorker.on('completed', (job) => {
  logger.info(`Worker: Job ${job.data.requestId} completed successfully.`, {
    meta: { job: job.data }
  });
});

jobWorker.on('failed', (job, err) => {
  logger.error(`Worker: Job ${job.data.requestId} failed with error:`, {
    meta: { error: err.message, job: job.data }
  });
  // The job.service.processQueuedJob already updates the job status in DB to 'failed'
  // BullMQ will handle retries based on defaultJobOptions
});

jobWorker.on('error', (err) => {
  logger.error('Worker error:', { meta: { error: err.message } });
});

logger.info('BullMQ Job Worker initialized and started listening for jobs.');
