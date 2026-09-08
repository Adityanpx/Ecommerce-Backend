import { Resend } from 'resend';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!config.email.isConfigured) return null;
  if (!client) client = new Resend(config.email.apiKey as string);
  return client;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/** Never throws. Email failure must not break the request that triggered it. */
export async function sendEmail({ to, subject, html }: EmailPayload): Promise<boolean> {
  const resend = getClient();

  if (!resend) {
    logger.warn('Resend not configured — email skipped', { to, subject });
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.from}>`,
      to,
      subject,
      html,
    });

    if (error) {
      logger.error('Resend returned an error', { to, subject, error: error.message });
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Email send failed', {
      to,
      subject,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
