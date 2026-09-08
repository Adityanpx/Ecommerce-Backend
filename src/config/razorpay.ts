import Razorpay from 'razorpay';
import { config } from './env';

let instance: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!config.razorpay.isConfigured) {
    throw new Error(
      'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
    );
  }
  if (!instance) {
    instance = new Razorpay({
      key_id: config.razorpay.keyId as string,
      key_secret: config.razorpay.keySecret as string,
    });
  }
  return instance;
}
