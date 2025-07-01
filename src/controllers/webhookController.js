import * as jobService from '../services/jobsService.js';
import { logger } from '../utils/logger.js';

export const postVendorWebhook = async (req, res) => {
  try {
    const { vendor } = req.params;
    // Assuming the webhook payload contains a 'request_id' and 'final_data'
    const { request_id, final_data } = req.body;

    if (!request_id || !final_data) {
      return res
        .status(400)
        .json({ message: 'Invalid webhook payload: missing request_id or final_data' });
    }

    const updatedJob = await jobService.updateJobFromWebhook(vendor, request_id, final_data);

    if (!updatedJob) {
      return res.status(404).json({ message: 'Job not found for webhook update' });
    }

    res.status(200).json({ message: 'Webhook processed successfully', job_id: updatedJob._id });
  } catch (error) {
    logger.error('Error in postVendorWebhook controller:', error.message);
    res.status(500).json({ message: 'Internal server error processing webhook' });
  }
};
