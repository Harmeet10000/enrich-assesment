import test from 'node:test';
import assert from 'node:assert/strict';
import * as jobsService from '../src/services/jobsService.js';
import * as jobRepository from '../src/repository/jobRepository.js';
import { jobQueue } from '../src/helpers/jobQueue.js';

test('createAndQueueJob should create and queue a sync job', async (t) => {
  let createdJob = null;
  let queuedJob = null;

  // Mock repository and queue
  jobRepository.createJob = async (requestId, data) => {
    createdJob = { requestId, ...data };
    return createdJob;
  };
  jobQueue.add = async (queueName, data) => {
    queuedJob = { queueName, ...data };
    return queuedJob;
  };

  const vendorType = 'sync';
  const vendorPayload = { foo: 'bar' };
  const requestId = await jobsService.createAndQueueJob(vendorType, vendorPayload);

  assert.ok(requestId, 'Should return a requestId');
  assert.deepEqual(createdJob.vendorType, vendorType);
  assert.deepEqual(createdJob.vendorPayload, vendorPayload);
  assert.deepEqual(queuedJob.vendorType, vendorType);
  assert.deepEqual(queuedJob.vendorPayload, vendorPayload);
});

test('createAndQueueJob should create and queue an async job', async (t) => {
  let createdJob = null;
  let queuedJob = null;

  jobRepository.createJob = async (requestId, data) => {
    createdJob = { requestId, ...data };
    return createdJob;
  };
  jobQueue.add = async (queueName, data) => {
    queuedJob = { queueName, ...data };
    return queuedJob;
  };

  const vendorType = 'async';
  const vendorPayload = { foo: 'baz' };
  const requestId = await jobsService.createAndQueueJob(vendorType, vendorPayload);

  assert.ok(requestId, 'Should return a requestId');
  assert.deepEqual(createdJob.vendorType, vendorType);
  assert.deepEqual(createdJob.vendorPayload, vendorPayload);
  assert.deepEqual(queuedJob.vendorType, vendorType);
  assert.deepEqual(queuedJob.vendorPayload, vendorPayload);
});

test('getJobStatus should return job if found', async (t) => {
  const fakeJob = { requestId: 'abc', status: 'pending' };
  jobRepository.findJobById = async (id) => (id === 'abc' ? fakeJob : null);

  const result = await jobsService.getJobStatus('abc');
  assert.deepEqual(result, fakeJob);
});

test('getJobStatus should return null if not found', async (t) => {
  jobRepository.findJobById = async () => null;
  const result = await jobsService.getJobStatus('notfound');
  assert.equal(result, null);
});

test('updateJobFromWebhook should update job and clean data', async (t) => {
  let updatedJob = null;
  jobRepository.updateJob = async (requestId, data) => {
    updatedJob = { requestId, ...data };
    return updatedJob;
  };

  const vendorName = 'asyncVendor';
  const requestId = 'abc123';
  const finalData = { foo: 'bar', ssn: 'shouldBeRemoved' };

  const result = await jobsService.updateJobFromWebhook(vendorName, requestId, finalData);

  assert.ok(updatedJob);
  assert.equal(updatedJob.status, 'complete');
  assert.ok(updatedJob.result);
  assert.equal(result.status, 'complete');
});
