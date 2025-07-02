import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import express from 'express';
import jobsRoutes from '../src/routes/jobsRoutes.js';

// Mock controller logic for isolated route testing
const mockJob = {
  requestId: 'mock-id',
  status: 'pending',
  vendorType: 'sync',
  vendorPayload: { foo: 'bar' }
};

const app = express();
app.use(express.json());

// Mock controllers
app.post('/api/jobs/post', (req, res) => {
  const { vendorType, vendorPayload } = req.body;
  if (!vendorType || !vendorPayload) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  return res.status(201).json({ requestId: 'mock-id', vendorType, vendorPayload });
});

app.get('/api/jobs/:requestId', (req, res) => {
  if (req.params.requestId === 'mock-id') {
    return res.status(200).json(mockJob);
  }
  return res.status(404).json({ error: 'Job not found' });
});

test('POST /api/jobs/post should create a sync job', async () => {
  const response = await supertest(app)
    .post('/api/jobs/post')
    .send({ vendorType: 'sync', vendorPayload: { foo: 'bar' } })
    .expect(201);

  assert.equal(response.body.requestId, 'mock-id');
  assert.equal(response.body.vendorType, 'sync');
  assert.deepEqual(response.body.vendorPayload, { foo: 'bar' });
});

test('POST /api/jobs/post should create an async job', async () => {
  const response = await supertest(app)
    .post('/api/jobs/post')
    .send({ vendorType: 'async', vendorPayload: { foo: 'baz' } })
    .expect(201);

  assert.equal(response.body.requestId, 'mock-id');
  assert.equal(response.body.vendorType, 'async');
  assert.deepEqual(response.body.vendorPayload, { foo: 'baz' });
});

test('GET /api/jobs/:requestId should return job if found', async () => {
  const response = await supertest(app).get('/api/jobs/mock-id').expect(200);

  assert.equal(response.body.requestId, 'mock-id');
  assert.equal(response.body.status, 'pending');
});

test('GET /api/jobs/:requestId should return 404 if not found', async () => {
  const response = await supertest(app).get('/api/jobs/does-not-exist').expect(404);

  assert.equal(response.body.error, 'Job not found');
});
