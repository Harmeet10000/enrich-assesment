import { Job } from '../models/jobsModel.js';

export const findJobById = async (requestId) => {
  const job = await Job.findOne({ requestId });
  return job;
};

export const updateJob = async (requestId, updates) => {
  const job = await Job.findOneAndUpdate(
    { requestId },
    { ...updates, updatedAt: new Date() },
    { new: true }
  );
  return job;
};

export const createJob = async (requestId, payload) => {
  await Job.create({
    requestId,
    payload,
    status: 'pending'
  });
};
