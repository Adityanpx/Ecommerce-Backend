import { Router } from 'express';
import { razorpayWebhookController } from '../../controllers/webhooks/razorpay.controller';

const router = Router();

// No auth middleware — authenticity is proven by the HMAC signature.
router.post('/', razorpayWebhookController.handle);

export default router;
