import { Request, Response } from 'express';
import { paymentService } from '../../services/payment.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';

export const razorpayWebhookController = {
  handle: asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'];

    if (typeof signature !== 'string') {
      throw ApiError.badRequest('Missing signature header');
    }

    if (!req.rawBody) {
      logger.error('Webhook raw body missing — check middleware order in app.ts');
      throw ApiError.internal('Raw body unavailable');
    }

    const result = await paymentService.handleWebhook(
      req.rawBody,
      signature,
      req.body as Record<string, unknown>,
    );

    // Always 200 on success so Razorpay stops retrying.
    res.status(200).json(result);
  }),
};
