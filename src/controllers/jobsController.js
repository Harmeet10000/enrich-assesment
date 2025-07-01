import * as jobService from '../services/jobsService.js';
import { createJobSchema } from '../validations/jobValidation.js';
import { httpResponse } from '../utils/httpResponse.js';
import { httpError } from '../utils/httpError.js';
import { catchAsync } from '../utils/catchAsync.js';

export const postJob = catchAsync(async (req, res, next) => {
  const { error, value } = createJobSchema.validate(req.body);
  if (error) {
    return httpError(next, error, req, 400);
  }

  const { vendorType, vendorPayload } = value;
  const requestId = await jobService.createAndQueueJob(vendorType, vendorPayload);

  return httpResponse(req, res, 202, 'Job accepted', { request_id: requestId });
});

export const getJob = catchAsync(async (req, res) => {
  const { requestId } = req.params;
  const job = await jobService.getJobStatus(requestId);

  if (!job) {
    return httpResponse(req, res, 404, 'Job not found');
  }

  if (job.status === 'complete') {
    return httpResponse(req, res, 200, 'Job complete', { status: job.status, result: job.result });
  } else if (job.status === 'failed') {
    return httpResponse(req, res, 200, 'Job failed', { status: job.status, error: job.error });
  } else {
    return httpResponse(req, res, 200, 'Job status', { status: job.status });
  }
});
