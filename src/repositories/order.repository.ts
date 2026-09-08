import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

const orderInclude = {
  items: true,
  payments: { orderBy: { createdAt: 'desc' as const } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  returns: { select: { id: true, returnNumber: true, status: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export interface OrderListFilters {
  userId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: 'RAZORPAY' | 'COD';
  search?: string;
  from?: Date;
  to?: Date;
}

function buildWhere(filters: OrderListFilters): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];

  if (filters.userId) and.push({ userId: filters.userId });
  if (filters.status) and.push({ status: filters.status });
  if (filters.paymentStatus) and.push({ paymentStatus: filters.paymentStatus });
  if (filters.paymentMethod) and.push({ paymentMethod: filters.paymentMethod });

  if (filters.from || filters.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.from) createdAt.gte = filters.from;
    if (filters.to) createdAt.lte = filters.to;
    and.push({ createdAt });
  }

  if (filters.search) {
    and.push({
      OR: [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        { guestEmail: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

export const orderRepository = {
  async findMany(filters: OrderListFilters, skip: number, take: number) {
    const where = buildWhere(filters);

    const [items, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: {
          items: {
            select: {
              id: true,
              productName: true,
              variantLabel: true,
              quantity: true,
              imageUrl: true,
            },
          },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.order.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string): Promise<OrderWithDetails | null> {
    return prisma.order.findUnique({ where: { id }, include: orderInclude });
  },

  findByOrderNumber(orderNumber: string): Promise<OrderWithDetails | null> {
    return prisma.order.findUnique({ where: { orderNumber }, include: orderInclude });
  },

  update(id: string, data: Prisma.OrderUpdateInput) {
    return prisma.order.update({ where: { id }, data, include: orderInclude });
  },

  addStatusHistory(data: {
    orderId: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    note?: string;
    changedByAdminId?: string;
  }) {
    return prisma.orderStatusHistory.create({ data });
  },

  /** Orders stuck awaiting payment past the timeout — used by the cleanup job. */
  findStalePendingPayments(cutoff: Date) {
    return prisma.order.findMany({
      where: { status: 'PENDING_PAYMENT', createdAt: { lt: cutoff } },
      include: { items: true },
    });
  },

  // ---------- Payments ----------

  createPayment(data: Prisma.PaymentUncheckedCreateInput) {
    return prisma.payment.create({ data });
  },

  findPaymentByRazorpayOrderId(razorpayOrderId: string) {
    return prisma.payment.findFirst({
      where: { razorpayOrderId },
      include: { order: true },
    });
  },

  findPaymentByRazorpayPaymentId(razorpayPaymentId: string) {
    return prisma.payment.findUnique({ where: { razorpayPaymentId } });
  },

  updatePayment(id: string, data: Prisma.PaymentUpdateInput) {
    return prisma.payment.update({ where: { id }, data });
  },
};
