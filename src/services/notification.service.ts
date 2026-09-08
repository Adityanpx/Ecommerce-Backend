import { config } from '../config/env';
import { sendEmail } from '../integrations/resend/sendEmail';
import { sendSms } from '../integrations/msg91/sendOtp';
import {
  orderConfirmedEmail,
  orderShippedEmail,
  orderDeliveredEmail,
  orderCancelledEmail,
  refundProcessedEmail,
  adminAlertEmail,
} from '../integrations/resend/templates/order.templates';
import { logger } from '../utils/logger';

interface Recipient {
  email: string | null;
  phone: string | null;
  firstName: string;
}

async function safely(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    logger.warn(`Notification failed: ${label}`, {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export const notificationService = {
  async orderConfirmed(
    to: Recipient,
    data: {
      orderNumber: string;
      items: { productName: string; variantLabel: string; quantity: number; lineTotal: number }[];
      subtotal: number;
      discount: number;
      shipping: number;
      total: number;
    },
  ): Promise<void> {
    if (to.email) {
      const template = orderConfirmedEmail({ firstName: to.firstName, ...data });
      await safely('orderConfirmed email', () =>
        sendEmail({ to: to.email as string, subject: template.subject, html: template.html }),
      );
    }

    if (to.phone && config.msg91.templates.order) {
      await safely('orderConfirmed sms', () =>
        sendSms(to.phone as string, config.msg91.templates.order as string, {
          order_number: data.orderNumber,
          amount: data.total.toFixed(2),
        }),
      );
    }
  },

  async orderShipped(
    to: Recipient,
    data: {
      orderNumber: string;
      courierName: string;
      trackingNumber: string;
      trackingUrl?: string | null;
    },
  ): Promise<void> {
    if (to.email) {
      const template = orderShippedEmail({ firstName: to.firstName, ...data });
      await safely('orderShipped email', () =>
        sendEmail({ to: to.email as string, subject: template.subject, html: template.html }),
      );
    }

    if (to.phone && config.msg91.templates.shipped) {
      await safely('orderShipped sms', () =>
        sendSms(to.phone as string, config.msg91.templates.shipped as string, {
          order_number: data.orderNumber,
          courier: data.courierName,
          tracking: data.trackingNumber,
        }),
      );
    }
  },

  async orderDelivered(
    to: Recipient,
    data: { orderNumber: string; returnWindowDays: number },
  ): Promise<void> {
    if (to.email) {
      const template = orderDeliveredEmail({ firstName: to.firstName, ...data });
      await safely('orderDelivered email', () =>
        sendEmail({ to: to.email as string, subject: template.subject, html: template.html }),
      );
    }

    if (to.phone && config.msg91.templates.delivered) {
      await safely('orderDelivered sms', () =>
        sendSms(to.phone as string, config.msg91.templates.delivered as string, {
          order_number: data.orderNumber,
        }),
      );
    }
  },

  async orderCancelled(
    to: Recipient,
    data: { orderNumber: string; reason?: string | null; refundAmount?: number },
  ): Promise<void> {
    if (!to.email) return;
    const template = orderCancelledEmail({ firstName: to.firstName, ...data });
    await safely('orderCancelled email', () =>
      sendEmail({ to: to.email as string, subject: template.subject, html: template.html }),
    );
  },

  async refundProcessed(
    to: Recipient,
    data: { orderNumber: string; amount: number },
  ): Promise<void> {
    if (!to.email) return;
    const template = refundProcessedEmail({ firstName: to.firstName, ...data });
    await safely('refundProcessed email', () =>
      sendEmail({ to: to.email as string, subject: template.subject, html: template.html }),
    );
  },

  async adminAlert(title: string, bodyHtml: string): Promise<void> {
    const to = config.email.adminAlertEmail;
    if (!to) return;
    const template = adminAlertEmail(title, bodyHtml);
    await safely('admin alert', () =>
      sendEmail({ to, subject: template.subject, html: template.html }),
    );
  },
};
