import { cleanVendorResponse } from '../helpers/dataCleaner.js';
import { jobQueue } from '../helpers/jobQueue.js'; // Used to re-add job if rate-limited
import * as jobRepository from '../repository/jobRepository.js';
import { callSyncVendor, callAsyncVendor } from './vendorService.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a new job and adds it to the BullMQ queue for processing.
 * @param {string} vendorType - The type of vendor to call ('sync' or 'async').
 * @param {object} vendorPayload - The payload for the vendor API.
 * @returns {Promise<string>} The generated request ID.
 */
export const createAndQueueJob = async (vendorType, vendorPayload) => {
  const requestId = uuidv4();
  await jobRepository.createJob(requestId, { vendorType, vendorPayload });

  // Add job to BullMQ queue
  await jobQueue.add('processVendorRequest', { requestId, vendorType, vendorPayload });

  logger.info(`Job ${requestId} created and queued for vendorType: ${vendorType}`);
  return requestId;
};

/**
 * Processes a job picked up by the BullMQ worker.
 * Calls the appropriate vendor service and updates job status in DB.
 * @param {string} requestId - The ID of the job to process.
 * @param {string} vendorType - The type of vendor to call.
 * @param {object} vendorPayload - The payload for the vendor.
 * @returns {Promise<void>}
 */
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
    console.error(`Error processing job ${requestId}:`, error.message);
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

/**
 * Retrieves the status and result of a job.
 * @param {string} requestId - The ID of the job to retrieve.
 * @returns {Promise<object|null>} The job object or null if not found.
 */
export const getJobStatus = async (requestId) => {
  jobRepository.findJobById(requestId);
};

/**
 * Updates a job's status and result based on an incoming webhook.
 * @param {string} vendorName - The name of the vendor sending the webhook.
 * @param {string} requestId - The ID of the job to update.
 * @param {object} finalData - The final data from the vendor.
 * @returns {Promise<object|null>} The updated job document or null if not found.
 */
export const updateJobFromWebhook = async (vendorName, requestId, finalData) => {
  const cleanedData = cleanVendorResponse(finalData);
  const updatedJob = await jobRepository.updateJob(requestId, {
    status: 'complete',
    result: cleanedData,
    completedAt: new Date()
  });
  logger.info(`Job ${requestId} updated to 'complete' via webhook from ${vendorName}.`);
  return updatedJob;
};
