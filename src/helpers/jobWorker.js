import { Worker } from 'bullmq';
import { logger } from '../utils/logger.js';
import { redisOptions } from '../db/connectRedis.js';
import { callSyncVendor, callAsyncVendor } from '../services/vendorService.js';
import * as jobRepository from '../repository/jobRepository.js';

//To DO list
/**
 * 5. Add monitoring and alerting for job processing plus prometheus and grafana
 *    - Use BullMQ's built-in events and metrics for monitoring job processing
 *    - Consider using BullMQ's `QueueEvents` for real-time monitoring
 *    - Integrate with Prometheus and Grafana for visualization
 *    - Use BullMQ's `QueueEvents` to listen for job events and expose metrics
 *     via a custom endpoint or middleware
 * 6. Implement job prioritization if needed
 * 8. implement a mechanism to handle job duplicates
 * 9. tuning of BullMQ worker concurrency and rate limiting based on vendor capabilities
 * 10. Modify readme to include instructions for running the worker
 * 12.caching with redis and use bulk insert for vendor responses
 *
 * **/

export const processQueuedJob = async (requestId, vendorType, vendorPayload) => {
  try {
    jobRepository.updateJob(requestId, { status: 'processing' });
    logger.info(`Job ${requestId} status updated to 'processing'.`);

    let vendorResponse;
    switch (vendorType) {
      case 'sync':
        vendorResponse = await callSyncVendor(requestId, vendorPayload);
        jobRepository.updateJob(requestId, {
          status: 'complete',
          result: vendorResponse,
          completedAt: new Date()
        });
        logger.info(`Job ${requestId} completed via synchronous vendor.`);
        break;
      case 'async':
        vendorResponse = await callAsyncVendor(requestId, vendorPayload);
        logger.info(`Job ${requestId} sent to asynchronous vendor, awaiting webhook.`);
        break;
      default:
        throw new Error(`Unsupported vendor type: ${vendorType}`);
    }
  } catch (error) {
    logger.error(`Error processing job ${requestId}:`, { error: error.message });
    if (error.message.includes('Rate limit exceeded') && error.message.includes('Job re-queued')) {
      logger.info(`Job ${requestId} temporarily failed due to rate limit, re-queued.`);
    } else {
      jobRepository.updateJob(requestId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
      logger.info(`Job ${requestId} marked as 'failed'.`);
      throw error;
    }
  }
};

const jobWorker = new Worker(
  'processVendorRequest',
  async (job) => {
    logger.info(`Worker: Processing job ${job.data.requestId} with data:`, {
      meta: { job: job.data }
    });
    await processQueuedJob(job.data.requestId, job.data.vendorType, job.data.vendorPayload);
  },
  {
    connection: redisOptions,
    concurrency: 5
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
