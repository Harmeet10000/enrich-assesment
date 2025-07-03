import cron from 'node-cron';
import { Job } from '../src/models/jobsModel.js';
import { redisClient } from '../src/db/connectRedis.js';
import { logger } from '../src/utils/logger.js';

const REDIS_JOB_LIST_KEY = 'pending:jobs';
const REDIS_JOB_UPDATE_LIST_KEY = 'pending:jobUpdates';
const BATCH_SIZE = 100;

// Bulk insert new jobs from Redis to MongoDB
const processNewJobs = async () => {
  const jobs = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    const jobStr = await redisClient.lpop(REDIS_JOB_LIST_KEY);
    if (!jobStr) {
      break;
    }
    jobs.push(JSON.parse(jobStr));
  }
  if (jobs.length > 0) {
    await Job.insertMany(jobs, { ordered: false }).catch(() => {});
    logger.info(`Bulk inserted ${jobs.length} jobs from Redis to MongoDB.`);
  }
};

// Bulk update jobs from Redis to MongoDB
const processJobUpdates = async () => {
  const updates = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    const updateStr = await redisClient.lpop(REDIS_JOB_UPDATE_LIST_KEY);
    if (!updateStr) {
      break;
    }
    updates.push(JSON.parse(updateStr));
  }
  if (updates.length > 0) {
    for (const { requestId, updates: updateFields } of updates) {
      await Job.findOneAndUpdate(
        { requestId },
        { ...updateFields, updatedAt: new Date() },
        { new: true }
      ).catch(() => {});
    }
    logger.info(`Bulk updated ${updates.length} jobs from Redis to MongoDB.`);
  }
};

// Run every minute
cron.schedule('* * * * *', async () => {
  await processNewJobs();
  await processJobUpdates();
});
