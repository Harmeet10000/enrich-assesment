import { config } from '../config/limits.js';
import { cleanVendorResponse } from '../helpers/dataCleaner.js';
import { jobQueue } from '../helpers/jobQueue.js';
import { canCallVendor, getTimeUntilNextCall } from '../helpers/rateLimitVendorCheck.js';
import { logger } from '../utils/logger.js';

/**
 * Simulates a synchronous vendor API call.
 * Applies rate limiting.
 * @param {string} requestId - The ID of the job.
 * @param {object} payload - The payload for the vendor.
 * @returns {Promise<object>} The cleaned vendor response.
 * @throws {Error} If rate limit is exceeded or other mock error occurs.
 */
export const callSyncVendor = async (requestId, payload) => {
  const vendorName = 'syncVendor';
  if (!canCallVendor(vendorName)) {
    const timeToWait = getTimeUntilNextCall(vendorName);
    logger.warn(
      `Rate limit hit for ${vendorName}. Re-queueing job ${requestId}. Wait for ${timeToWait}ms.`
    );
    // Re-add the job to the queue with a delay to respect rate limits
    // This is a common pattern for rate-limited external calls from a worker.
    await jobQueue.add(
      'processVendorRequest',
      { requestId, vendorType: vendorName, vendorPayload: payload },
      { delay: timeToWait + 100 }
    ); // Add a small buffer
    throw new Error(`Rate limit exceeded for ${vendorName}. Job re-queued.`);
  }

  logger.info(`Calling synchronous vendor for job ${requestId}...`);
  const { min, max } = config.vendorProcessingTimes[vendorName];
  const processingTime = Math.random() * (max - min) + min;

  await new Promise((resolve) => setTimeout(resolve, processingTime));

  const rawResponse = {
    status: 'success',
    vendor: vendorName,
    data: `Processed sync data for ${payload.productId || payload.itemId || 'unknown'}`,
    timestamp: new Date().toISOString(),
    customerEmail: 'mock@example.com', // PII to be cleaned
    ssn: '123-45-678', // PII to be cleaned
    originalPayload: payload
  };

  const cleanedResponse = cleanVendorResponse(rawResponse);
  logger.info(`Synchronous vendor call for job ${requestId} completed.`);
  return cleanedResponse;
};

/**
 * Simulates an asynchronous vendor API call.
 * Immediately acknowledges, then "pushes" data via a simulated webhook.
 * Applies rate limiting for the initial acknowledgment.
 * @param {string} requestId - The ID of the job.
 * @param {object} payload - The payload for the vendor.
 * @returns {Promise<object>} An acknowledgment response.
 * @throws {Error} If rate limit is exceeded for initial acknowledgment.
 */
export const callAsyncVendor = async (requestId, payload) => {
  const vendorName = 'asyncVendor';
  if (!canCallVendor(vendorName)) {
    const timeToWait = getTimeUntilNextCall(vendorName);
    logger.warn(
      `Rate limit hit for ${vendorName} (initial ack). Re-queueing job ${requestId}. Wait for ${timeToWait}ms.`
    );
    await jobQueue.add(
      'processVendorRequest',
      { requestId, vendorType: vendorName, vendorPayload: payload },
      { delay: timeToWait + 100 }
    );
    throw new Error(
      `Rate limit exceeded for ${vendorName} (initial acknowledgment). Job re-queued.`
    );
  }

  logger.info(`Calling asynchronous vendor for job ${requestId} (initial ack)...`);
  const { min, max } = config.vendorProcessingTimes[vendorName];
  const processingTime = Math.random() * (max - min) + min;

  // Simulate immediate acknowledgment
  const ackResponse = {
    status: 'acknowledged',
    vendor: vendorName,
    message: 'Request received, final data will be pushed via webhook.',
    vendorRequestId: `vendor-req-${requestId}-${Date.now()}`, // Vendor's internal ID
    timestamp: new Date().toISOString(),
    originalPayload: payload
  };

  // Simulate the async vendor pushing data back to our webhook after some time
  // In a real scenario, this would be an actual HTTP POST from the mock vendor process
  // to our /vendor-webhook/:vendor endpoint. For this example, we'll directly
  // call the webhook controller's logic after a delay.
  setTimeout(async () => {
    const finalData = {
      status: 'final_data_ready',
      vendor: vendorName,
      vendorRequestId: ackResponse.vendorRequestId,
      data: `Final async data for ${payload.userId || 'unknown'}`,
      timestamp: new Date().toISOString(),
      originalPayload: payload
    };
    logger.info(`Simulating async vendor webhook for job ${requestId}.`);
    // Directly call the webhook processing logic (bypassing HTTP for simplicity in mock)
    // In a real system, the mock vendor would make an HTTP POST request to your webhook endpoint.
    const { updateJobFromWebhook } = await import('./jobsService.js');
    try {
      await updateJobFromWebhook(vendorName, requestId, finalData);
      logger.info(`Simulated webhook for job ${requestId} processed.`);
    } catch (webhookError) {
      logger.error(
        `Error processing simulated webhook for job ${requestId}:`,
        webhookError.message
      );
      // In a real system, the webhook handler would log/handle this.
    }
  }, processingTime);

  logger.info(`Asynchronous vendor initial ack for job ${requestId} completed.`);
  return ackResponse;
};
