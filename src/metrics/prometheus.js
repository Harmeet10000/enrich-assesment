import client from 'prom-client';

client.collectDefaultMetrics();

// Custom metrics

export const jobCompleted = new client.Counter({
  name: 'bullmq_jobs_completed_total',
  help: 'Total number of completed jobs'
});

export const jobFailed = new client.Counter({
  name: 'bullmq_jobs_failed_total',
  help: 'Total number of failed jobs'
});

export { client };
