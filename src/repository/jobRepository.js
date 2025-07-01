import { Job } from '../models/jobsModel.js';

export const findJobById = async (requestId) => {
  Job.findOne({ jobId: requestId });
};

export const updateJob = async (requestId, updates) => {
  Job.findOneAndUpdate({ jobId: requestId }, { ...updates, updatedAt: new Date() }, { new: true });
};

export const createJob = async (requestId, payload) => {
  Job.create({
    jobId: requestId,
    payload,
    status: 'pending'
  });
};
