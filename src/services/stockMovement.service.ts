import { StockMovementReason, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { stockMovementRepository } from '../repositories/stockMovement.repository';
import { ApiError } from '../utils/ApiError';

type Client = Prisma.TransactionClient | typeof prisma;

export const stockMovementService = {
  /**
   * Adjusts stock on a variant and logs the movement atomically.
   * Returns the updated variant.
   *
   * @param variantId - The variant to adjust
   * @param delta - Positive to add stock, negative to remove
   * @param reason - Why the stock changed
   * @param note - Optional human-readable note
   * @param client - Prisma client or transaction client
   */
  async adjustStock(
    variantId: string,
    delta: number,
    reason: StockMovementReason,
    note?: string | null,
    client: Client = prisma,
  ) {
    const variant = await client.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, stock: true },
    });

    if (!variant) throw ApiError.notFound('Variant not found');

    const stockBefore = variant.stock;
    const stockAfter = stockBefore + delta;

    if (stockAfter < 0) {
      throw ApiError.badRequest(
        `Insufficient stock. Current: ${stockBefore}, requested change: ${delta}`,
      );
    }

    const [updatedVariant] = await Promise.all([
      client.productVariant.update({
        where: { id: variantId },
        data: { stock: stockAfter },
      }),
      stockMovementRepository.create(
        {
          variantId,
          reason,
          quantityDelta: delta,
          stockBefore,
          stockAfter,
          note,
        },
        client,
      ),
    ]);

    return updatedVariant;
  },

  /**
   * Set stock to an absolute value (admin manual adjustment).
   * Internally calculates the delta and logs it.
   */
  async setStock(
    variantId: string,
    newStock: number,
    note?: string | null,
    client: Client = prisma,
  ) {
    const variant = await client.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, stock: true },
    });

    if (!variant) throw ApiError.notFound('Variant not found');

    const delta = newStock - variant.stock;
    if (delta === 0) return variant; // No change

    return this.adjustStock(variantId, delta, 'MANUAL_ADJUSTMENT', note, client);
  },

  getHistory(variantId: string, limit = 50) {
    return stockMovementRepository.findByVariant(variantId, limit);
  },

  getProductHistory(productId: string, limit = 100) {
    return stockMovementRepository.findByProduct(productId, limit);
  },
};
