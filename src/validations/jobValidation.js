import Joi from 'joi';

export const createJobSchema = Joi.object({
  vendorType: Joi.string()
    .valid('sync', 'async')
    .default('sync')
    .description('Type of vendor to simulate (sync or async).'),
  vendorPayload: Joi.object()
    .required()
    .unknown(true)
    .description('The actual payload to send to the external vendor.')
});
