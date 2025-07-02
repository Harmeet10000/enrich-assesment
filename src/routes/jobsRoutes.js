import express from 'express';
import { getJob, postJob } from '../controllers/jobsController.js';

const router = express.Router();

router.post('/post', postJob);

router.get('/:requestId', getJob);

export default router;
// vendorId, vendorType: sync", "async", operation:"getProductDetails", "getCustomerProfile", "fetchLatestQuotes", "verifyAddress"
