import { config } from '../config/limits.js';
import { cleanVendorResponse } from '../helpers/dataCleaner.js';
import { jobQueue } from '../helpers/jobQueue.js';
import { canCallVendor, getTimeUntilNextCall } from '../helpers/rateLimitVendorCheck.js';
import { logger } from '../utils/logger.js';

export const callSyncVendor = async (requestId, payload) => {
  const vendorName = 'syncVendor';
  if (!canCallVendor(vendorName)) {
    const timeToWait = getTimeUntilNextCall(vendorName);
    logger.warn(
      `Rate limit hit for ${vendorName}. Re-queueing job ${requestId}. Wait for ${timeToWait}ms.`
    );
    await jobQueue.add(
      'processVendorRequest',
      { requestId, vendorType: vendorName, vendorPayload: payload },
      { delay: timeToWait + 100 }
    );
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
    const { updateJobFromWebhook } = await import('./jobsService.js');
    try {
      await updateJobFromWebhook(vendorName, requestId, finalData);
      logger.info(`Simulated webhook for job ${requestId} processed.`);
    } catch (webhookError) {
      logger.error(
        `Error processing simulated webhook for job ${requestId}:`,
        webhookError.message
      );
    }
  }, processingTime);

  logger.info(`Asynchronous vendor initial ack for job ${requestId} completed.`);
  return ackResponse;
};
