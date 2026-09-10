import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { orderRepository, OrderListFilters } from '../repositories/order.repository';
import { addressRepository } from '../repositories/address.repository';
import { couponService } from './coupon.service';
import { pricingService, PricedLine } from './pricing.service';
import { settingsService } from './settings.service';
import { notificationService } from './notification.service';
import { cartService, CartOwner } from './cart.service';
import { ApiError } from '../utils/ApiError';
import { formatSequentialNumber } from '../utils/generators';
import { AddressSnapshot } from '../types/common.types';
import { ORDER } from '../config/constants';
import { logger } from '../utils/logger';

interface CheckoutInput {
  addressId?: string;
  address?: AddressSnapshot;
  paymentMethod: PaymentMethod;
  guestEmail?: string;
  guestPhone?: string;
}

/** Statuses a customer may still cancel from. */
const CUSTOMER_CANCELLABLE: OrderStatus[] = ['PLACED', 'CONFIRMED'];

/** Legal forward transitions. Prevents an order jumping from PLACED to DELIVERED. */
const STATUS_FLOW: Record<string, OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  PENDING_PAYMENT: ['PLACED', 'CANCELLED'],
};

async function resolveAddress(
  userId: string | undefined,
  input: CheckoutInput,
): Promise<AddressSnapshot> {
  if (input.addressId) {
    if (!userId) throw ApiError.badRequest('Guests must supply a full address');

    const address = await addressRepository.findById(input.addressId);
    if (!address || address.userId !== userId) throw ApiError.notFound('Address not found');

    return {
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
    };
  }

  if (input.address) return input.address;

  throw ApiError.badRequest('Provide either addressId or a full address');
}

export const orderService = {
  /** Read-only preview of what checkout will charge. No side effects. */
  async summary(owner: CartOwner, input: CheckoutInput) {
    const { cart } = await cartService.resolveCart(owner);
    const settings = await settingsService.getAll();
    const lines = pricingService.buildLines(cart, settings);

    if (lines.length === 0) throw ApiError.badRequest('Your cart is empty');

    let discountAmount = 0;
    if (cart.coupon) {
      try {
        const evaluation = await couponService.evaluate(
          cart.coupon.code,
          lines,
          cart.userId ?? null,
        );
        discountAmount = evaluation.discountAmount;
      } catch {
        discountAmount = 0;
      }
    }

    const pricing = pricingService.compose(lines, discountAmount, settings);
    const address = await resolveAddress(owner.userId, input);

    if (input.paymentMethod === 'COD') {
      if (!settings.codEnabled) {
        throw ApiError.badRequest('Cash on delivery is currently unavailable');
      }
      if (pricing.total > settings.codMaxOrderValue) {
        throw ApiError.badRequest(
          `Cash on delivery is available only for orders up to Rs.${settings.codMaxOrderValue}`,
        );
      }
    }

    return { pricing, address, paymentMethod: input.paymentMethod };
  },

  /**
   * Creates the order and deducts stock atomically.
   * For RAZORPAY the order is left PENDING_PAYMENT until the signature is verified.
   * For COD the order goes straight to PLACED.
   */
  async create(owner: CartOwner, input: CheckoutInput) {
    const { cart } = await cartService.resolveCart(owner);
    if (cart.items.filter((i) => !i.isSavedForLater).length === 0) {
      throw ApiError.badRequest('Your cart is empty');
    }

    if (!owner.userId) {
      if (!input.guestEmail) {
        throw ApiError.badRequest('Email is required for guest checkout', [
          { field: 'guestEmail', message: 'Required' },
        ]);
      }
    }

    const settings = await settingsService.getAll();
    const address = await resolveAddress(owner.userId, input);

    const order = await prisma.$transaction(
      async (tx) => {
        const variantIds = cart.items.filter((i) => !i.isSavedForLater).map((i) => i.variantId);

        // Lock every variant row for the duration of the transaction.
        // Prisma has no locking API, so this is raw SQL. The result is
        // discarded — the lock is the point.
        await tx.$queryRaw`
          SELECT id FROM product_variants
          WHERE id = ANY(${variantIds}::uuid[])
          FOR UPDATE
        `;

        // Re-read the cart INSIDE the lock so stock and prices are current.
        const freshCart = await tx.cart.findUnique({
          where: { id: cart.id },
          include: {
            coupon: true,
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                        brand: true,
                        sellingPrice: true,
                        status: true,
                        deletedAt: true,
                        hsnCode: true,
                        gstRate: true,
                        isOversized: true,
                        shippingCharge: true,
                        weightGrams: true,
                        subCategoryId: true,
                        subCategory: { select: { id: true, gstRate: true } },
                        images: {
                          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!freshCart) throw ApiError.notFound('Cart not found');

        const lines = pricingService.buildLines(freshCart as never, settings);

        // Stock re-validated under the lock. This is the authoritative check.
        const unavailable = lines.filter((line) => !line.inStock);
        if (unavailable.length > 0) {
          throw ApiError.conflict(
            `No longer available: ${unavailable.map((l) => `${l.productName} (${l.variantLabel})`).join(', ')}`,
          );
        }

        // Coupon re-validated — it may have expired or hit its limit meanwhile.
        let discountAmount = 0;
        let couponId: string | null = null;
        let couponCode: string | null = null;

        if (freshCart.coupon) {
          try {
            const evaluation = await couponService.evaluate(
              freshCart.coupon.code,
              lines,
              freshCart.userId ?? null,
              tx,
            );
            discountAmount = evaluation.discountAmount;
            couponId = evaluation.coupon.id;
            couponCode = evaluation.coupon.code;
          } catch {
            // Silently drop an invalid coupon rather than failing checkout.
            discountAmount = 0;
          }
        }

        const pricing = pricingService.compose(lines, discountAmount, settings);

        if (input.paymentMethod === 'COD') {
          if (!settings.codEnabled) throw ApiError.badRequest('Cash on delivery is unavailable');
          if (pricing.total > settings.codMaxOrderValue) {
            throw ApiError.badRequest(
              `Cash on delivery is available only up to Rs.${settings.codMaxOrderValue}`,
            );
          }
        }

        const sequence = await settingsService.nextOrderSequence(tx);
        const orderNumber = formatSequentialNumber(settings.orderPrefix, sequence);

        const initialStatus: OrderStatus =
          input.paymentMethod === 'COD' ? 'PLACED' : 'PENDING_PAYMENT';

        const created = await tx.order.create({
          data: {
            orderNumber,
            userId: owner.userId ?? null,
            guestEmail: input.guestEmail ?? null,
            guestPhone: input.guestPhone ?? null,
            status: initialStatus,
            subtotal: new Prisma.Decimal(pricing.subtotal),
            discountAmount: new Prisma.Decimal(pricing.discountAmount),
            couponId,
            couponCode,
            shippingCharge: new Prisma.Decimal(pricing.shippingCharge),
            taxAmount: new Prisma.Decimal(pricing.taxAmount),
            totalAmount: new Prisma.Decimal(pricing.total),
            paymentMethod: input.paymentMethod,
            paymentStatus: 'PENDING',
            shippingAddress: address as unknown as Prisma.InputJsonValue,
            placedAt: initialStatus === 'PLACED' ? new Date() : null,
            items: {
              create: pricing.lines.map((line: PricedLine) => ({
                variantId: line.variantId,
                productName: line.productName,
                variantLabel: line.variantLabel,
                sku: line.sku,
                imageUrl: line.imageUrl,
                hsnCode: line.hsnCode,
                unitPrice: new Prisma.Decimal(line.unitPrice),
                quantity: line.quantity,
                gstRate: new Prisma.Decimal(line.gstRate),
                taxAmount: new Prisma.Decimal(line.taxAmount),
                lineTotal: new Prisma.Decimal(line.lineTotal),
              })),
            },
          },
          include: { items: true },
        });

        // Deduct stock and bump the popularity counter.
        for (const line of pricing.lines) {
          await tx.productVariant.update({
            where: { id: line.variantId },
            data: { stock: { decrement: line.quantity } },
          });
          await tx.product.update({
            where: { id: line.productId },
            data: { orderCount: { increment: line.quantity } },
          });
        }

        if (couponId) {
          await couponService.recordUsage(
            couponId,
            owner.userId ?? null,
            created.id,
            pricing.discountAmount,
            tx,
          );
        }

        await tx.orderStatusHistory.create({
          data: { orderId: created.id, fromStatus: null, toStatus: initialStatus },
        });

        // Cart is emptied only on success — a failed transaction leaves it intact.
        await tx.cartItem.deleteMany({ where: { cartId: cart.id, isSavedForLater: false } });
        await tx.cart.update({ where: { id: cart.id }, data: { couponId: null } });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 },
    );

    // Side effects happen AFTER commit, never inside the transaction.
    if (input.paymentMethod === 'COD') {
      void this.sendConfirmation(order.id);
      void notificationService.adminAlert(
        'New COD order',
        `<p>Order <strong>${order.orderNumber}</strong> for Rs.${Number(order.totalAmount).toFixed(2)}</p>`,
      );
    }

    return orderRepository.findById(order.id);
  },

  async sendConfirmation(orderId: string): Promise<void> {
    const order = await orderRepository.findById(orderId);
    if (!order) return;

    const settings = await settingsService.getAll();

    await notificationService.orderConfirmed(
      {
        email: order.user?.email ?? order.guestEmail,
        phone: order.user?.phone ?? order.guestPhone,
        firstName: order.user?.firstName ?? 'there',
      },
      {
        orderNumber: order.orderNumber,
        items: order.items.map((i) => ({
          productName: i.productName,
          variantLabel: i.variantLabel,
          quantity: i.quantity,
          lineTotal: Number(i.lineTotal),
        })),
        subtotal: Number(order.subtotal),
        discount: Number(order.discountAmount),
        shipping: Number(order.shippingCharge),
        total: Number(order.totalAmount),
      },
    );

    void settings; // settings reserved for future template use
  },

  list(filters: OrderListFilters, skip: number, take: number) {
    return orderRepository.findMany(filters, skip, take);
  },

  async getForCustomer(orderNumber: string, userId?: string, guestEmail?: string) {
    const order = await orderRepository.findByOrderNumber(orderNumber);
    if (!order) throw ApiError.notFound('Order not found');

    if (order.userId) {
      if (order.userId !== userId) throw ApiError.forbidden('This order does not belong to you');
    } else {
      // Guest orders require the email used at checkout.
      if (!guestEmail || order.guestEmail !== guestEmail.toLowerCase()) {
        throw ApiError.forbidden('Provide the email used to place this order');
      }
    }

    return order;
  },

  async getForAdmin(id: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw ApiError.notFound('Order not found');
    return order;
  },

  async updateStatus(id: string, toStatus: OrderStatus, adminId: string, note?: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw ApiError.notFound('Order not found');

    const allowed = STATUS_FLOW[order.status] ?? [];
    if (!allowed.includes(toStatus)) {
      throw ApiError.badRequest(
        `Cannot move an order from ${order.status} to ${toStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    if (toStatus === 'SHIPPED' && !order.trackingNumber) {
      throw ApiError.badRequest('Enter courier and tracking details before marking as shipped');
    }

    const data: Prisma.OrderUpdateInput = { status: toStatus };
    if (toStatus === 'SHIPPED') data.shippedAt = new Date();
    if (toStatus === 'DELIVERED') data.deliveredAt = new Date();

    // Confirming a paid order generates its invoice number.
    if (toStatus === 'CONFIRMED' && !order.invoiceNumber) {
      const settings = await settingsService.getAll();
      const sequence = await settingsService.nextInvoiceSequence();
      data.invoiceNumber = formatSequentialNumber(settings.invoicePrefix, sequence);
    }

    const updated = await orderRepository.update(id, data);

    await orderRepository.addStatusHistory({
      orderId: id,
      fromStatus: order.status,
      toStatus,
      note,
      changedByAdminId: adminId,
    });

    const recipient = {
      email: updated.user?.email ?? updated.guestEmail,
      phone: updated.user?.phone ?? updated.guestPhone,
      firstName: updated.user?.firstName ?? 'there',
    };

    if (toStatus === 'SHIPPED') {
      void notificationService.orderShipped(recipient, {
        orderNumber: updated.orderNumber,
        courierName: updated.courierName as string,
        trackingNumber: updated.trackingNumber as string,
        trackingUrl: updated.trackingUrl,
      });
    }

    if (toStatus === 'DELIVERED') {
      const settings = await settingsService.getAll();
      void notificationService.orderDelivered(recipient, {
        orderNumber: updated.orderNumber,
        returnWindowDays: settings.returnWindowDays,
      });
    }

    return updated;
  },

  async setShipping(
    id: string,
    input: { courierName: string; trackingNumber: string; trackingUrl?: string | null },
  ) {
    const order = await orderRepository.findById(id);
    if (!order) throw ApiError.notFound('Order not found');

    if (!['CONFIRMED', 'PACKED', 'SHIPPED'].includes(order.status)) {
      throw ApiError.badRequest('Shipping details can only be set on a confirmed or packed order');
    }

    return orderRepository.update(id, {
      courierName: input.courierName,
      trackingNumber: input.trackingNumber,
      trackingUrl: input.trackingUrl ?? null,
    });
  },

  /**
   * Cancels an order and restores stock atomically.
   * Refund is triggered afterwards, outside the transaction.
   */
  async cancel(
    id: string,
    reason: string | undefined,
    actor: { userId?: string; adminId?: string },
  ) {
    const order = await orderRepository.findById(id);
    if (!order) throw ApiError.notFound('Order not found');

    if (actor.userId) {
      if (order.userId !== actor.userId)
        throw ApiError.forbidden('This order does not belong to you');
      if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
        throw ApiError.badRequest(
          `An order that is already ${order.status.toLowerCase()} cannot be cancelled. Raise a return instead.`,
        );
      }
    } else if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw ApiError.badRequest(`This order is already ${order.status.toLowerCase()}`);
    }

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason ?? null,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: 'CANCELLED',
          note: reason,
          changedByAdminId: actor.adminId ?? null,
        },
      });
    });

    let refundAmount: number | undefined;

    if (order.paymentStatus === 'PAID' && order.paymentMethod === 'RAZORPAY') {
      const { refundService } = await import('./refund.service');
      try {
        const result = await refundService.refundOrder(order.id);
        refundAmount = result.amount;
      } catch (error) {
        // The order stays cancelled; the refund can be retried by an admin.
        logger.error('Auto-refund on cancellation failed', {
          orderId: order.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    void notificationService.orderCancelled(
      {
        email: order.user?.email ?? order.guestEmail,
        phone: order.user?.phone ?? order.guestPhone,
        firstName: order.user?.firstName ?? 'there',
      },
      { orderNumber: order.orderNumber, reason, refundAmount },
    );

    return orderRepository.findById(id);
  },

  /** Used by the scheduled job to release stock from abandoned checkouts. */
  async expireStalePayments(): Promise<number> {
    const settings = await settingsService.getAll();
    const cutoff = new Date(Date.now() - settings.paymentPendingTimeoutMin * 60 * 1000);

    const stale = await orderRepository.findStalePendingPayments(cutoff);
    let cancelled = 0;

    for (const order of stale) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const item of order.items) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancellationReason: 'Payment not completed within the allowed time',
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: 'PENDING_PAYMENT',
              toStatus: 'CANCELLED',
              note: 'Auto-cancelled by system',
            },
          });
        });
        cancelled += 1;
      } catch (error) {
        logger.error('Failed to expire stale order', {
          orderId: order.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return cancelled;
  },

  ORDER_TIMEOUT_MINUTES: ORDER.PENDING_PAYMENT_TIMEOUT_MINUTES,
};
