import swaggerAutogen from 'swagger-autogen';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputFile = path.join(__dirname, './swagger-output.json');
const endpointsFiles = [
  path.join(__dirname, '../src/routes/jobsRoutes.js'),
  path.join(__dirname, '../src/routes/webhookRoutes.js'),
  path.join(__dirname, '../src/routes/healthRoutes.js')
];

const doc = {
  openapi: '3.0.0',
  info: {
    title: 'API Gateway for External Data Vendors',
    version: '1.0.0',
    description:
      'A unified API for interacting with various external data vendors, handling rate limiting and asynchronous/synchronous responses.'
  },
  servers: [
    {
      url: 'http://localhost:8000',
      description: 'Local Development Server'
    }
  ],
  tags: [
    {
      name: 'Jobs',
      description: 'Operations related to creating and managing vendor jobs.'
    },
    {
      name: 'Webhooks',
      description: 'Endpoints for receiving callbacks from asynchronous vendors.'
    }
  ],
  components: {
    schemas: {
      PostJobRequest: {
        type: 'object',
        properties: {
          vendorType: {
            type: 'string',
            enum: ['sync', 'async'],
            description: 'Specifies which type of mock vendor to use (synchronous or asynchronous).'
          },
          vendorPayload: {
            type: 'object',
            description:
              'The actual payload to be sent to the external vendor. Can be any valid JSON.',
            example: {
              productId: 'PROD-ABC-123',
              action: 'fetch_details'
            }
          }
        },
        required: ['vendorType', 'vendorPayload']
      },
      PostJobResponse: {
        type: 'object',
        properties: {
          request_id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier for the created job.'
          }
        },
        example: {
          request_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
        }
      },
      GetJobResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'complete', 'failed'],
            description: 'The current status of the job.'
          },
          result: {
            type: 'object',
            description:
              "The cleaned result data from the vendor (present only if status is 'complete')."
          },
          error: {
            type: 'string',
            description: "Error message if the job failed (present only if status is 'failed')."
          }
        },
        examples: {
          pending: { value: { status: 'pending' } },
          processing: { value: { status: 'processing' } },
          complete: {
            value: {
              status: 'complete',
              result: {
                vendor: 'syncVendor',
                data: 'Processed sync data for PROD-ABC-123',
                timestamp: '2025-07-02T10:00:00.000Z'
              }
            }
          },
          failed: {
            value: {
              status: 'failed',
              error: 'Vendor API returned 500 error.'
            }
          }
        }
      },
      WebhookRequest: {
        type: 'object',
        properties: {
          request_id: {
            type: 'string',
            format: 'uuid',
            description: 'The unique ID of the original job request.'
          },
          final_data: {
            type: 'object',
            description: 'The final processed data from the vendor.',
            example: {
              status: 'COMPLETED',
              reportId: 'REPORT-ABC-789',
              generatedAt: '2025-07-02T10:30:00Z',
              summary: { totalRecords: 1500 }
            }
          }
        },
        required: ['request_id', 'final_data']
      },
      WebhookResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          job_id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }
};

swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointsFiles, doc);
