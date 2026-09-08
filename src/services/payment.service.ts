import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { orderRepository } from '../repositories/order.repository';
import { createRazorpayOrder } from '../integrations/razorpay/createOrder';
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../integrations/razorpay/verifySignature';
import { orderService } from './order.service';
import { notificationService } from './notification.service';
import { settingsService } from './settings.service';
import { formatSequentialNumber } from '../utils/generators';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export const paymentService = {
  /** Called right after order creation for RAZORPAY orders. */
  async initiate(orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw ApiError.notFound('Order not found');

    if (order.paymentStatus === 'PAID') {
      throw ApiError.conflict('This order has already been paid');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw ApiError.badRequest('This order is not awaiting payment');
    }

    const razorpayOrder = await createRazorpayOrder(Number(order.totalAmount), order.orderNumber, {
      orderId: order.id,
      orderNumber: order.orderNumber,
    });

    await orderRepository.createPayment({
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amount: order.totalAmount,
      currency: 'INR',
      status: 'CREATED',
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: config.razorpay.keyId,
    };
  },

  /**
   * Client-side confirmation. Verifies the HMAC signature, then marks the
   * order paid. The webhook independently confirms the same thing — both
   * paths are idempotent, so whichever arrives first wins and the second
   * is a no-op.
   */
  async verify(input: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const valid = verifyPaymentSignature(
      input.razorpay_order_id,
      input.razorpay_payment_id,
      input.razorpay_signature,
    );

    if (!valid) {
      logger.error('Razorpay signature verification failed', {
        razorpayOrderId: input.razorpay_order_id,
      });
      throw ApiError.badRequest('Payment verification failed');
    }

    const payment = await orderRepository.findPaymentByRazorpayOrderId(input.razorpay_order_id);
    if (!payment) throw ApiError.notFound('Payment record not found');

    // Already processed — return success rather than erroring.
    if (payment.order.paymentStatus === 'PAID') {
      return orderRepository.findById(payment.orderId);
    }

    await this.markPaid(payment.orderId, {
      paymentRecordId: payment.id,
      razorpayPaymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
    });

    void orderService.sendConfirmation(payment.orderId);

    const order = await orderRepository.findById(payment.orderId);

    void notificationService.adminAlert(
      'New paid order',
      `<p>Order <strong>${order?.orderNumber}</strong> for Rs.${Number(order?.totalAmount ?? 0).toFixed(2)}</p>`,
    );

    return order;
  },

  /**
   * Idempotent. Safe to call from both the verify endpoint and the webhook.
   * The status guard inside the transaction prevents double processing.
   */
  async markPaid(
    orderId: string,
    data: {
      paymentRecordId?: string;
      razorpayPaymentId: string;
      signature?: string;
      method?: string;
      rawPayload?: Prisma.InputJsonValue;
    },
  ): Promise<boolean> {
    const settings = await settingsService.getAll();

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) return false;

      // Guard: already paid, nothing to do.
      if (order.paymentStatus === 'PAID') return false;

      const invoiceNumber =
        order.invoiceNumber ??
        formatSequentialNumber(
          settings.invoicePrefix,
          await settingsService.nextInvoiceSequence(tx),
        );

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PLACED',
          paymentStatus: 'PAID',
          placedAt: order.placedAt ?? new Date(),
          invoiceNumber,
        },
      });

      if (data.paymentRecordId) {
        await tx.payment.update({
          where: { id: data.paymentRecordId },
          data: {
            razorpayPaymentId: data.razorpayPaymentId,
            razorpaySignature: data.signature ?? null,
            status: 'CAPTURED',
            method: data.method ?? null,
            rawPayload: data.rawPayload,
          },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: 'PLACED',
          note: 'Payment received',
        },
      });

      return true;
    });
  },

  async markFailed(razorpayOrderId: string, reason: string, rawPayload?: Prisma.InputJsonValue) {
    const payment = await orderRepository.findPaymentByRazorpayOrderId(razorpayOrderId);
    if (!payment) return;

    await orderRepository.updatePayment(payment.id, {
      status: 'FAILED',
      failureReason: reason,
      rawPayload,
    });

    // The order itself stays PENDING_PAYMENT so the customer can retry.
    // The scheduled job cancels it and restores stock after the timeout.
  },

  /**
   * Webhook handler. Razorpay retries on non-2xx, so every path must be
   * idempotent and must return 200 even for events we ignore.
   */
  async handleWebhook(rawBody: Buffer, signature: string, payload: Record<string, unknown>) {
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.error('Razorpay webhook signature invalid');
      throw ApiError.badRequest('Invalid webhook signature');
    }

    const event = payload.event as string;
    const entity =
      (payload.payload as Record<string, Record<string, Record<string, unknown>>>) ?? {};

    logger.info('Razorpay webhook received', { event });

    switch (event) {
      case 'payment.captured': {
        const paymentEntity = entity.payment?.entity;
        if (!paymentEntity) break;

        const razorpayOrderId = paymentEntity.order_id as string;
        const razorpayPaymentId = paymentEntity.id as string;

        const existingPayment =
          await orderRepository.findPaymentByRazorpayPaymentId(razorpayPaymentId);
        if (existingPayment?.status === 'CAPTURED') break; // Already handled.

        const payment = await orderRepository.findPaymentByRazorpayOrderId(razorpayOrderId);
        if (!payment) break;

        const changed = await this.markPaid(payment.orderId, {
          paymentRecordId: payment.id,
          razorpayPaymentId,
          method: paymentEntity.method as string | undefined,
          rawPayload: payload as Prisma.InputJsonValue,
        });

        if (changed) void orderService.sendConfirmation(payment.orderId);
        break;
      }

      case 'payment.failed': {
        const paymentEntity = entity.payment?.entity;
        if (!paymentEntity) break;

        await this.markFailed(
          paymentEntity.order_id as string,
          (paymentEntity.error_description as string) ?? 'Payment failed',
          payload as Prisma.InputJsonValue,
        );
        break;
      }

      case 'refund.processed': {
        const refundEntity = entity.refund?.entity;
        if (!refundEntity) break;

        logger.info('Refund confirmed by Razorpay', { refundId: refundEntity.id });
        break;
      }

      default:
        // Unhandled events are acknowledged so Razorpay stops retrying.
        break;
    }

    return { received: true };
  },
};
