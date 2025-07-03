import { Job } from '../models/jobsModel.js';
import { pushToList } from '../helpers/redisFunctions.js';

const REDIS_JOB_LIST_KEY = 'pending:jobs';
const REDIS_JOB_UPDATE_LIST_KEY = 'pending:jobUpdates';

export const findJobById = async (requestId) => {
  const job = await Job.findOne({ requestId });
  return job;
};

export const updateJob = async (requestId, updates) => {
  await pushToList('jobUpdate', REDIS_JOB_UPDATE_LIST_KEY, { requestId, updates });
};

export const createJob = async (requestId, payload) => {
  const jobData = {
    requestId,
    payload,
    status: 'pending',
    createdAt: new Date()
  };
  await pushToList('job', REDIS_JOB_LIST_KEY, jobData);
};
