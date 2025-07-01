import { Job } from '../models/jobsModel.js';

export const findJobById = async (requestId) => {
  Job.findById(requestId);
};

export const updateJob = async (requestId, updates) => {
  Job.findByIdAndUpdate(requestId, { ...updates, updatedAt: new Date() }, { new: true });
};

export const createJob = async (requestId, payload) => {
  const newJob = new Job({
    _id: requestId,
    payload,
    status: 'pending'
  });
  return newJob.save();
};
