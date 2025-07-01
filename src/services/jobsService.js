import { cleanVendorResponse } from '../helpers/dataCleaner.js';
import { jobQueue } from '../helpers/jobQueue.js'; // Used to re-add job if rate-limited
import * as jobRepository from '../repository/jobRepository.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export const createAndQueueJob = async (vendorType, vendorPayload) => {
  const requestId = uuidv4();
  await jobRepository.createJob(requestId, { vendorType, vendorPayload });

  await jobQueue.add('processVendorRequest', { requestId, vendorType, vendorPayload });

  logger.info(`Job ${requestId} created and queued for vendorType: ${vendorType}`);
  return requestId;
};

export const getJobStatus = async (requestId) => {
  jobRepository.findJobById(requestId);
};

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
