import cron from 'node-cron';
import { Job } from '../src/models/jobsModel.js';
import { logger } from '../src/utils/logger.js';
import { processQueuedJob } from '../src/helpers/jobWorker.js';

// Runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  logger.info('Cron: Checking for failed jobs to retry...');
  try {
    // Find failed jobs that haven't been retried more than 3 times
    const failedJobs = await Job.find({
      status: 'failed',
      $or: [{ retryCount: { $lt: 3 } }, { retryCount: { $exists: false } }]
    });
    for (const job of failedJobs) {
      logger.info(`Retrying failed job: ${job.requestId}`);
      try {
        // Update status to 'pending' and increment retryCount
        const retryCount = (job.retryCount || 0) + 1;
        await Job.updateOne({ _id: job._id }, { status: 'pending', retryCount, error: null });
        // Re-process the job
        await processQueuedJob(job.requestId, job.payload.vendorType, job.payload.vendorPayload);
        logger.info(`Job ${job.requestId} retried (attempt ${retryCount}).`);
      } catch (err) {
        logger.error(`Failed to retry job ${job.requestId}:`, { error: err.message });
        await Job.updateOne({ _id: job._id }, { error: err.message });
      }
    }
  } catch (err) {
    logger.error('Error in job retry cron:', { error: err.message });
  }
});
