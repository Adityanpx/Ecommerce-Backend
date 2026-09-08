import axios from 'axios';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

const BASE_URL = 'https://control.msg91.com/api/v5';

/**
 * SMS is fire-and-forget everywhere except OTP. A failed order-confirmation
 * SMS must not fail the order, so this returns a boolean instead of throwing.
 * The OTP flow checks the return value; notification flows ignore it.
 */
export async function sendSms(
  phone: string,
  templateId: string,
  variables: Record<string, string>,
): Promise<boolean> {
  if (!config.msg91.isConfigured) {
    logger.warn('MSG91 not configured — SMS skipped', { phone, templateId });
    return false;
  }

  try {
    await axios.post(
      `${BASE_URL}/flow/`,
      {
        template_id: templateId,
        sender: config.msg91.senderId,
        short_url: '0',
        recipients: [{ mobiles: `91${phone}`, ...variables }],
      },
      {
        headers: {
          authkey: config.msg91.authKey as string,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      },
    );
    return true;
  } catch (error) {
    logger.error('MSG91 send failed', {
      phone,
      templateId,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
  const templateId = config.msg91.templates.otp;
  if (!templateId) {
    logger.warn('MSG91 OTP template not configured');
    return false;
  }
  return sendSms(phone, templateId, { otp });
}
