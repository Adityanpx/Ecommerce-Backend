import { StockMovementReason, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

type Client = Prisma.TransactionClient | typeof prisma;

export const stockMovementRepository = {
  create(
    data: {
      variantId: string;
      reason: StockMovementReason;
      quantityDelta: number;
      stockBefore: number;
      stockAfter: number;
      note?: string | null;
      adminId?: string | null;
    },
    client: Client = prisma,
  ) {
    return client.stockMovement.create({
      data: {
        variantId: data.variantId,
        reason: data.reason,
        quantityDelta: data.quantityDelta,
        stockBefore: data.stockBefore,
        stockAfter: data.stockAfter,
        note: data.note ?? null,
        adminId: data.adminId ?? null,
      },
    });
  },

  findByVariant(variantId: string, limit = 50) {
    return prisma.stockMovement.findMany({
      where: { variantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  findByProduct(productId: string, limit = 100) {
    return prisma.stockMovement.findMany({
      where: { variant: { productId } },
      include: {
        variant: { select: { id: true, sku: true, size: true, color: true, colorId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
