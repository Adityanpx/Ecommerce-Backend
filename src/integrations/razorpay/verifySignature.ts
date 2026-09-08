import crypto from 'crypto';
import { config } from '../../config/env';

/**
 * Razorpay signs `${razorpay_order_id}|${razorpay_payment_id}` with your
 * key secret. Verifying it proves the payment result came from Razorpay
 * and was not forged by the client.
 *
 * timingSafeEqual is used rather than === so the comparison cannot be
 * attacked by measuring how long it takes to fail.
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  if (!config.razorpay.keySecret) return false;

  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Webhooks are signed over the raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!config.razorpay.webhookSecret) return false;

  const expected = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
