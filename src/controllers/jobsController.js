import * as jobService from '../services/jobsService.js';
import { logger } from '../utils/logger.js';
import {createJobSchema} from '../validations/jobValidation.js'

/**
 * Handles POST /jobs request to create and queue a new job.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
export const postJob = async (req, res) => {
  try {
    // Validate request body using Joi
    const { error, value } = createJobSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { vendorType, vendorPayload } = value;
    const requestId = await jobService.createAndQueueJob(vendorType, vendorPayload);

    // Respond instantly with the request_id
    res.status(202).json({ request_id: requestId }); // 202 Accepted
  } catch (error) {
    logger.error('Error in postJob controller:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Handles GET /jobs/:requestId request to retrieve job status and result.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
export const getJob = async (req, res) => {
  try {
    const { requestId } = req.params;
    const job = await jobService.getJobStatus(requestId);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Return different responses based on job status
    if (job.status === 'complete') {
      return res.status(200).json({ status: job.status, result: job.result });
    } else if (job.status === 'failed') {
      return res.status(200).json({ status: job.status, error: job.error });
    } else {
      // pending, processing
      return res.status(200).json({ status: job.status });
    }
  } catch (error) {
    logger.error('Error in getJob controller:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};
