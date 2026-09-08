import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { orderRepository } from '../repositories/order.repository';
import { createRefund } from '../integrations/razorpay/refund';
import { notificationService } from './notification.service';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export const refundService = {
  /**
   * Refunds a Razorpay payment. `amount` omitted means a full refund.
   * COD orders have nothing to refund through the gateway — the caller
   * handles those manually.
   */
  async refundOrder(orderId: string, amount?: number) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw ApiError.notFound('Order not found');

    if (order.paymentMethod === 'COD') {
      throw ApiError.badRequest('COD orders must be refunded manually');
    }

    if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIALLY_REFUNDED') {
      throw ApiError.badRequest('This order has no captured payment to refund');
    }

    const capturedPayment = order.payments.find(
      (p) => p.status === 'CAPTURED' && p.razorpayPaymentId,
    );

    if (!capturedPayment?.razorpayPaymentId) {
      throw ApiError.badRequest('No captured Razorpay payment found for this order');
    }

    const orderTotal = Number(order.totalAmount);
    const refundAmount = amount ?? orderTotal;

    if (refundAmount > orderTotal) {
      throw ApiError.badRequest('Refund amount cannot exceed the order total');
    }

    const result = await createRefund(capturedPayment.razorpayPaymentId, amount);

    const isFullRefund = refundAmount >= orderTotal;

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
      }),
      prisma.payment.update({
        where: { id: capturedPayment.id },
        data: { status: isFullRefund ? 'REFUNDED' : 'CAPTURED' },
      }),
    ]);

    logger.info('Refund created', {
      orderId,
      refundId: result.id,
      amount: result.amount,
    });

    void notificationService.refundProcessed(
      {
        email: order.user?.email ?? order.guestEmail,
        phone: order.user?.phone ?? order.guestPhone,
        firstName: order.user?.firstName ?? 'there',
      },
      { orderNumber: order.orderNumber, amount: result.amount },
    );

    return { refundId: result.id, amount: result.amount, status: result.status };
  },

  /** Records a manual (COD / bank transfer) refund without calling Razorpay. */
  async recordManualRefund(orderId: string, amount: number, note: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw ApiError.notFound('Order not found');

    const isFull = amount >= Number(order.totalAmount);

    await orderRepository.update(orderId, {
      paymentStatus: isFull ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
    });

    await orderRepository.addStatusHistory({
      orderId,
      fromStatus: order.status,
      toStatus: order.status,
      note: `Manual refund of Rs.${amount.toFixed(2)}: ${note}`,
    });

    return { amount, manual: true };
  },

  toDecimal(value: number): Prisma.Decimal {
    return new Prisma.Decimal(value.toFixed(2));
  },
};
