import { addDays } from 'date-fns';
import { Prisma, ReturnStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { returnRepository } from '../repositories/return.repository';
import { orderRepository } from '../repositories/order.repository';
import { settingsService } from './settings.service';
import { refundService } from './refund.service';
import { notificationService } from './notification.service';
import { ApiError } from '../utils/ApiError';
import { formatSequentialNumber } from '../utils/generators';
import { add, multiply } from '../utils/money';
import { logger } from '../utils/logger';

/** Legal forward transitions for a return. */
const RETURN_FLOW: Record<string, ReturnStatus[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PICKUP_SCHEDULED', 'REJECTED'],
  PICKUP_SCHEDULED: ['RECEIVED'],
  RECEIVED: ['REFUND_PROCESSED'],
  REJECTED: [],
  REFUND_PROCESSED: [],
};

export const returnService = {
  async create(
    userId: string,
    input: {
      orderId: string;
      reason: 'WRONG_SIZE' | 'DAMAGED' | 'DEFECTIVE' | 'NOT_AS_DESCRIBED' | 'OTHER';
      reasonNote?: string;
      images: string[];
      items: { orderItemId: string; quantity: number }[];
    },
  ) {
    const order = await orderRepository.findById(input.orderId);
    if (!order) throw ApiError.notFound('Order not found');
    if (order.userId !== userId) throw ApiError.forbidden('This order does not belong to you');

    if (order.status !== 'DELIVERED') {
      throw ApiError.badRequest('A return can only be raised for a delivered order');
    }

    const settings = await settingsService.getAll();
    const deadline = addDays(order.deliveredAt ?? order.createdAt, settings.returnWindowDays);

    if (new Date() > deadline) {
      throw ApiError.badRequest(
        `The ${settings.returnWindowDays}-day return window for this order has closed`,
      );
    }

    const existingReturns = await returnRepository.countForOrder(order.id);
    if (existingReturns > 0) {
      throw ApiError.conflict('A return has already been raised for this order');
    }

    // Validate every requested item belongs to the order and the quantity is sane.
    const orderItemsById = new Map(order.items.map((i) => [i.id, i]));
    let refundAmount = 0;

    for (const requested of input.items) {
      const orderItem = orderItemsById.get(requested.orderItemId);
      if (!orderItem) {
        throw ApiError.badRequest('One or more selected items do not belong to this order');
      }
      if (requested.quantity > orderItem.quantity) {
        throw ApiError.badRequest(
          `You ordered ${orderItem.quantity} of "${orderItem.productName}" but requested ${requested.quantity}`,
        );
      }
      refundAmount = add(refundAmount, multiply(Number(orderItem.unitPrice), requested.quantity));
    }

    const sequence = await settingsService.nextOrderSequence();
    const returnNumber = formatSequentialNumber('RET-', sequence);

    const created = await returnRepository.create({
      returnNumber,
      orderId: order.id,
      userId,
      reason: input.reason,
      reasonNote: input.reasonNote ?? null,
      images: input.images as unknown as Prisma.InputJsonValue,
      status: 'REQUESTED',
      refundAmount: new Prisma.Decimal(refundAmount),
      items: {
        create: input.items.map((i) => ({
          orderItemId: i.orderItemId,
          quantity: i.quantity,
        })),
      },
    });

    void notificationService.adminAlert(
      'New return request',
      `<p>Return <strong>${returnNumber}</strong> raised for order <strong>${order.orderNumber}</strong>.<br />
       Reason: ${input.reason}<br />Estimated refund: Rs.${refundAmount.toFixed(2)}</p>`,
    );

    return created;
  },

  list(filters: { userId?: string; status?: ReturnStatus }, skip: number, take: number) {
    return returnRepository.findMany(filters, skip, take);
  },

  async getById(id: string, userId?: string) {
    const record = await returnRepository.findById(id);
    if (!record) throw ApiError.notFound('Return not found');
    if (userId && record.userId !== userId) {
      throw ApiError.forbidden('This return does not belong to you');
    }
    return record;
  },

  async updateStatus(id: string, toStatus: ReturnStatus, adminNote?: string) {
    const record = await returnRepository.findById(id);
    if (!record) throw ApiError.notFound('Return not found');

    const allowed = RETURN_FLOW[record.status] ?? [];
    if (!allowed.includes(toStatus)) {
      throw ApiError.badRequest(
        `Cannot move a return from ${record.status} to ${toStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const data: Prisma.ReturnUpdateInput = { status: toStatus };
    if (adminNote) data.adminNote = adminNote;
    if (['REJECTED', 'REFUND_PROCESSED'].includes(toStatus)) data.resolvedAt = new Date();

    return returnRepository.update(id, data);
  },

  /**
   * Approves the refund, restores stock for the returned units, and calls
   * Razorpay. Stock restoration happens here rather than at approval time
   * because the goods are only genuinely back once RECEIVED.
   */
  async processRefund(id: string, amount?: number) {
    const record = await returnRepository.findById(id);
    if (!record) throw ApiError.notFound('Return not found');

    if (record.status !== 'RECEIVED') {
      throw ApiError.badRequest(
        'The returned items must be marked as received before a refund is processed',
      );
    }

    const refundAmount = amount ?? Number(record.refundAmount ?? 0);
    if (refundAmount <= 0) throw ApiError.badRequest('Refund amount must be greater than 0');

    // Restore stock for the returned quantities.
    await prisma.$transaction(async (tx) => {
      for (const item of record.items) {
        await tx.productVariant.update({
          where: { id: item.orderItem.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    let razorpayRefundId: string | null = null;

    if (record.order.paymentMethod === 'RAZORPAY' && record.order.paymentStatus === 'PAID') {
      try {
        const result = await refundService.refundOrder(record.orderId, refundAmount);
        razorpayRefundId = result.refundId;
      } catch (error) {
        logger.error('Razorpay refund failed during return processing', {
          returnId: id,
          message: error instanceof Error ? error.message : String(error),
        });
        throw ApiError.internal(
          'Stock was restored but the gateway refund failed. Retry the refund from the order.',
        );
      }
    } else {
      await refundService.recordManualRefund(
        record.orderId,
        refundAmount,
        `Return ${record.returnNumber}`,
      );
    }

    return returnRepository.update(id, {
      status: 'REFUND_PROCESSED',
      refundAmount: new Prisma.Decimal(refundAmount),
      razorpayRefundId,
      resolvedAt: new Date(),
    });
  },
};
