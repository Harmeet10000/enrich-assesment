// filepath: /home/harmeet/Desktop/Projects/Production-grade-Auth-template/backend/src/routes/rabbitmqRoutes.js
import express from 'express';
import { postVendorWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/:vendor', postVendorWebhook);

export default router;
