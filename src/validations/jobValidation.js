import Joi from 'joi';

export const createJobSchema = Joi.object({
  // 'vendorType' is used by our mock vendor service to simulate sync/async behavior
  vendorType: Joi.string()
    .valid('sync', 'async')
    .default('sync')
    .description('Type of vendor to simulate (sync or async).'),
  // The actual payload to be sent to the external vendor
  vendorPayload: Joi.object()
    .required()
    .unknown(true)
    .description('The actual payload to send to the external vendor.')
});

