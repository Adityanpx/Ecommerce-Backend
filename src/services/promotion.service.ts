import { Prisma } from '@prisma/client';
import { promotionRepository } from '../repositories/promotion.repository';
import { createUniqueSlug } from '../utils/slugify';
import { ApiError } from '../utils/ApiError';

interface PromotionInput {
  name: string;
  description?: string | null;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  scope: 'ALL' | 'CATEGORY' | 'PRODUCT';
  scopeIds?: string[] | null;
  startsAt: string; // ISO date string
  endsAt: string;
  isActive?: boolean;
}

export interface AppliedPromotion {
  promotionId: string;
  promotionName: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  promotionalPrice: number;
}

export const promotionService = {
  list(includeInactive = false) {
    return promotionRepository.findAll(includeInactive);
  },

  async getById(id: string) {
    const promo = await promotionRepository.findById(id);
    if (!promo) throw ApiError.notFound('Promotion not found');
    return promo;
  },

  async create(input: PromotionInput) {
    if (new Date(input.endsAt) <= new Date(input.startsAt)) {
      throw ApiError.badRequest('End date must be after start date');
    }

    const slug = await createUniqueSlug(input.name, (s) => promotionRepository.slugExists(s));

    return promotionRepository.create({
      name: input.name,
      slug,
      description: input.description ?? null,
      discountType: input.discountType,
      discountValue: new Prisma.Decimal(input.discountValue),
      scope: input.scope,
      scopeIds: input.scopeIds ?? undefined,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      isActive: input.isActive ?? true,
    });
  },

  async update(id: string, input: Partial<PromotionInput>) {
    const existing = await promotionRepository.findById(id);
    if (!existing) throw ApiError.notFound('Promotion not found');

    const data: Record<string, unknown> = {};

    if (input.name !== undefined) {
      data.name = input.name;
      if (input.name !== existing.name) {
        data.slug = await createUniqueSlug(input.name, async (s) =>
          s === existing.slug ? false : promotionRepository.slugExists(s),
        );
      }
    }

    if (input.description !== undefined) data.description = input.description;
    if (input.discountType !== undefined) data.discountType = input.discountType;
    if (input.discountValue !== undefined)
      data.discountValue = new Prisma.Decimal(input.discountValue);
    if (input.scope !== undefined) data.scope = input.scope;
    if (input.scopeIds !== undefined) data.scopeIds = input.scopeIds;
    if (input.startsAt !== undefined) data.startsAt = new Date(input.startsAt);
    if (input.endsAt !== undefined) data.endsAt = new Date(input.endsAt);
    if (input.isActive !== undefined) data.isActive = input.isActive;

    return promotionRepository.update(id, data);
  },

  async delete(id: string) {
    const existing = await promotionRepository.findById(id);
    if (!existing) throw ApiError.notFound('Promotion not found');
    return promotionRepository.delete(id);
  },

  /**
   * Given a product, find the best active promotion that applies to it
   * and return the promotional price. Returns null if no promotion applies.
   *
   * Called per-product in list/detail endpoints to show the SALE badge.
   */
  async getBestPromotion(
    productId: string,
    subCategoryId: string,
    sellingPrice: number,
  ): Promise<AppliedPromotion | null> {
    const now = new Date();
    const activePromos = await promotionRepository.findActive(now);

    if (activePromos.length === 0) return null;

    let best: AppliedPromotion | null = null;

    for (const promo of activePromos) {
      // Check scope
      const scopeIds = (promo.scopeIds as string[] | null) ?? [];

      if (promo.scope === 'CATEGORY' && !scopeIds.includes(subCategoryId)) continue;
      if (promo.scope === 'PRODUCT' && !scopeIds.includes(productId)) continue;
      // scope === 'ALL' always matches

      // Calculate promotional price
      let promoPrice: number;
      if (promo.discountType === 'PERCENTAGE') {
        promoPrice = sellingPrice * (1 - Number(promo.discountValue) / 100);
      } else {
        promoPrice = sellingPrice - Number(promo.discountValue);
      }

      // Price floor at 0
      promoPrice = Math.max(0, Math.round(promoPrice * 100) / 100);

      // Keep the best (lowest) price
      if (best === null || promoPrice < best.promotionalPrice) {
        best = {
          promotionId: promo.id,
          promotionName: promo.name,
          discountType: promo.discountType,
          discountValue: Number(promo.discountValue),
          promotionalPrice: promoPrice,
        };
      }
    }

    return best;
  },

  /**
   * Batch version for product lists — avoids N+1 queries.
   * Returns a Map of productId -> AppliedPromotion.
   */
  async getBestPromotionsBatch(
    products: { id: string; subCategoryId: string; sellingPrice: number }[],
  ): Promise<Map<string, AppliedPromotion>> {
    const now = new Date();
    const activePromos = await promotionRepository.findActive(now);
    const result = new Map<string, AppliedPromotion>();

    if (activePromos.length === 0) return result;

    for (const product of products) {
      for (const promo of activePromos) {
        const scopeIds = (promo.scopeIds as string[] | null) ?? [];

        if (promo.scope === 'CATEGORY' && !scopeIds.includes(product.subCategoryId)) continue;
        if (promo.scope === 'PRODUCT' && !scopeIds.includes(product.id)) continue;

        let promoPrice: number;
        if (promo.discountType === 'PERCENTAGE') {
          promoPrice = product.sellingPrice * (1 - Number(promo.discountValue) / 100);
        } else {
          promoPrice = product.sellingPrice - Number(promo.discountValue);
        }
        promoPrice = Math.max(0, Math.round(promoPrice * 100) / 100);

        const existing = result.get(product.id);
        if (!existing || promoPrice < existing.promotionalPrice) {
          result.set(product.id, {
            promotionId: promo.id,
            promotionName: promo.name,
            discountType: promo.discountType,
            discountValue: Number(promo.discountValue),
            promotionalPrice: promoPrice,
          });
        }
      }
    }

    return result;
  },
};
