import { Coupon, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

type Client = Prisma.TransactionClient | typeof prisma;

export const couponRepository = {
  findByCode(code: string): Promise<Coupon | null> {
    return prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  },

  findById(id: string): Promise<Coupon | null> {
    return prisma.coupon.findUnique({ where: { id } });
  },

  async findMany(skip: number, take: number, activeOnly?: boolean) {
    const where: Prisma.CouponWhereInput = activeOnly ? { isActive: true } : {};

    const [items, total] = await prisma.$transaction([
      prisma.coupon.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.coupon.count({ where }),
    ]);

    return { items, total };
  },

  create(data: Prisma.CouponUncheckedCreateInput): Promise<Coupon> {
    return prisma.coupon.create({ data });
  },

  update(id: string, data: Prisma.CouponUpdateInput): Promise<Coupon> {
    return prisma.coupon.update({ where: { id }, data });
  },

  countUsagesByUser(couponId: string, userId: string): Promise<number> {
    return prisma.couponUsage.count({ where: { couponId, userId } });
  },

  recordUsage(
    data: { couponId: string; userId?: string | null; orderId: string; discountApplied: number },
    client: Client = prisma,
  ) {
    return client.couponUsage.create({
      data: {
        couponId: data.couponId,
        userId: data.userId ?? null,
        orderId: data.orderId,
        discountApplied: new Prisma.Decimal(data.discountApplied),
      },
    });
  },

  incrementUsedCount(couponId: string, client: Client = prisma) {
    return client.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  },
};
