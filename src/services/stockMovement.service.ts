import { StockMovementReason, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { stockMovementRepository } from '../repositories/stockMovement.repository';
import { ApiError } from '../utils/ApiError';

export interface StockChangeOptions {
  note?: string | null;
  /** Admin who made the change. Omit for system movements (orders, returns, jobs). */
  adminId?: string | null;
  /** Pass the surrounding transaction; when omitted a transaction is opened here. */
  client?: Prisma.TransactionClient;
}

/**
 * Every stock change in the system goes through this service so the
 * stock_movements table is a complete audit trail.
 *
 * The update is a relative `increment`, so two concurrent changes can never
 * overwrite each other. stockBefore is derived from the row the UPDATE returns,
 * which makes before/after exact even under concurrency. If the result would go
 * negative, the error rolls the surrounding transaction back.
 */
export const stockMovementService = {
  async adjustStock(
    variantId: string,
    delta: number,
    reason: StockMovementReason,
    options: StockChangeOptions = {},
  ) {
    if (!Number.isInteger(delta)) throw ApiError.badRequest('Stock change must be a whole number');

    const run = async (tx: Prisma.TransactionClient) => {
      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: delta } },
      });

      if (updated.stock < 0) {
        throw ApiError.badRequest(
          `Insufficient stock for ${updated.sku}. Current: ${updated.stock - delta}, requested change: ${delta}`,
        );
      }

      if (delta !== 0) {
        await stockMovementRepository.create(
          {
            variantId,
            reason,
            quantityDelta: delta,
            stockBefore: updated.stock - delta,
            stockAfter: updated.stock,
            note: options.note ?? null,
            adminId: options.adminId ?? null,
          },
          tx,
        );
      }

      return updated;
    };

    return options.client ? run(options.client) : prisma.$transaction(run);
  },

  /**
   * Set stock to an absolute value. The delta is computed inside the same
   * transaction under a row lock, so it cannot race with an order.
   */
  async setStock(
    variantId: string,
    newStock: number,
    reason: StockMovementReason = 'MANUAL_ADJUSTMENT',
    options: StockChangeOptions = {},
  ) {
    if (!Number.isInteger(newStock) || newStock < 0) {
      throw ApiError.badRequest('Stock must be a whole number of 0 or more');
    }

    const run = async (tx: Prisma.TransactionClient) => {
      const rows = await tx.$queryRaw<{ stock: number }[]>`
        SELECT stock FROM product_variants WHERE id = ${variantId}::uuid FOR UPDATE
      `;
      if (rows.length === 0) throw ApiError.notFound('Variant not found');

      const delta = newStock - rows[0].stock;
      return this.adjustStock(variantId, delta, reason, { ...options, client: tx });
    };

    return options.client ? run(options.client) : prisma.$transaction(run);
  },

  getHistory(variantId: string, limit = 50) {
    return stockMovementRepository.findByVariant(variantId, limit);
  },

  getProductHistory(productId: string, limit = 100) {
    return stockMovementRepository.findByProduct(productId, limit);
  },
};
