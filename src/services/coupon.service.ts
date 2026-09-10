import { Coupon, Prisma } from '@prisma/client';
import { couponRepository } from '../repositories/coupon.repository';
import { productRepository } from '../repositories/product.repository';
import { PricedLine, pricingService } from './pricing.service';
import { ApiError } from '../utils/ApiError';
import { add, percentageOf } from '../utils/money';
import { prisma } from '../config/database';

type Client = Prisma.TransactionClient | typeof prisma;

export interface CouponEvaluation {
  coupon: Coupon;
  discountAmount: number;
}

export const couponService = {
  /**
   * Validates a coupon against the current cart and returns the discount.
   * Called at cart time (for display) and again inside the order transaction
   * (authoritative) — a coupon can expire between the two.
   */
  async evaluate(
    code: string,
    lines: PricedLine[],
    userId: string | null,
    client: Client = prisma,
  ): Promise<CouponEvaluation> {
    const coupon = await couponRepository.findByCode(code, client);

    if (!coupon || !coupon.isActive) {
      throw ApiError.badRequest('This coupon code is not valid');
    }

    const now = new Date();
    if (coupon.validFrom > now) throw ApiError.badRequest('This coupon is not active yet');
    if (coupon.validTo < now) throw ApiError.badRequest('This coupon has expired');

    if (coupon.usageLimitTotal !== null && coupon.usedCount >= coupon.usageLimitTotal) {
      throw ApiError.badRequest('This coupon has reached its usage limit');
    }

    if (userId) {
      const used = await couponRepository.countUsagesByUser(coupon.id, userId, client);
      if (used >= coupon.usageLimitPerUser) {
        throw ApiError.badRequest('You have already used this coupon');
      }
    }

    const subtotal = lines.reduce<number>((sum, line) => add(sum, line.lineTotal), 0);
    const minCart = Number(coupon.minCartValue);

    if (subtotal < minCart) {
      throw ApiError.badRequest(
        `Add items worth Rs.${(minCart - subtotal).toFixed(2)} more to use this coupon`,
      );
    }

    // Scope determines which lines the discount applies to.
    let eligibleLines = lines;

    if (coupon.scope !== 'ALL') {
      const scopeIds = new Set((coupon.scopeIds as string[] | null) ?? []);

      if (coupon.scope === 'PRODUCT') {
        eligibleLines = lines.filter((line) => scopeIds.has(line.productId));
      } else {
        // CATEGORY — resolve each product's sub-category.
        const products = await Promise.all(
          [...new Set(lines.map((l) => l.productId))].map((id) =>
            productRepository.findByIdBasic(id, client),
          ),
        );
        const inScope = new Set(
          products.filter((p) => p !== null && scopeIds.has(p.subCategoryId)).map((p) => p!.id),
        );
        eligibleLines = lines.filter((line) => inScope.has(line.productId));
      }

      if (eligibleLines.length === 0) {
        throw ApiError.badRequest('This coupon does not apply to any item in your cart');
      }
    }

    const eligibleSubtotal = pricingService.eligibleSubtotal(eligibleLines, () => true);

    let discount =
      coupon.discountType === 'PERCENTAGE'
        ? percentageOf(eligibleSubtotal, Number(coupon.discountValue))
        : Number(coupon.discountValue);

    if (coupon.maxDiscountAmount !== null) {
      discount = Math.min(discount, Number(coupon.maxDiscountAmount));
    }

    // Never discount more than the eligible items are worth.
    discount = Math.min(discount, eligibleSubtotal);

    return { coupon, discountAmount: discount };
  },

  /** Called inside the order transaction after a successful evaluation. */
  async recordUsage(
    couponId: string,
    userId: string | null,
    orderId: string,
    discountApplied: number,
    client: Client,
  ) {
    await couponRepository.recordUsage({ couponId, userId, orderId, discountApplied }, client);
    await couponRepository.incrementUsedCount(couponId, client);
  },

  // ---------- Admin ----------

  list(skip: number, take: number, activeOnly?: boolean) {
    return couponRepository.findMany(skip, take, activeOnly);
  },

  async getById(id: string) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) throw ApiError.notFound('Coupon not found');
    return coupon;
  },

  async create(input: {
    code: string;
    description?: string | null;
    discountType: 'PERCENTAGE' | 'FLAT';
    discountValue: number;
    minCartValue: number;
    maxDiscountAmount?: number | null;
    scope: 'ALL' | 'CATEGORY' | 'PRODUCT';
    scopeIds: string[];
    usageLimitTotal?: number | null;
    usageLimitPerUser: number;
    validFrom: Date;
    validTo: Date;
    isActive: boolean;
  }) {
    const existing = await couponRepository.findByCode(input.code);
    if (existing) {
      throw ApiError.conflict('A coupon with this code already exists', [
        { field: 'code', message: 'Already in use' },
      ]);
    }

    return couponRepository.create({
      code: input.code.toUpperCase(),
      description: input.description ?? null,
      discountType: input.discountType,
      discountValue: new Prisma.Decimal(input.discountValue),
      minCartValue: new Prisma.Decimal(input.minCartValue),
      maxDiscountAmount:
        input.maxDiscountAmount !== undefined && input.maxDiscountAmount !== null
          ? new Prisma.Decimal(input.maxDiscountAmount)
          : null,
      scope: input.scope,
      scopeIds: input.scopeIds as unknown as Prisma.InputJsonValue,
      usageLimitTotal: input.usageLimitTotal ?? null,
      usageLimitPerUser: input.usageLimitPerUser,
      validFrom: input.validFrom,
      validTo: input.validTo,
      isActive: input.isActive,
    });
  },

  async update(id: string, input: Record<string, unknown>) {
    const existing = await couponRepository.findById(id);
    if (!existing) throw ApiError.notFound('Coupon not found');

    const data: Prisma.CouponUpdateInput = { ...input };

    if (input.code) {
      const code = String(input.code).toUpperCase();
      const clash = await couponRepository.findByCode(code);
      if (clash && clash.id !== id) {
        throw ApiError.conflict('A coupon with this code already exists');
      }
      data.code = code;
    }

    if (input.discountValue !== undefined)
      data.discountValue = new Prisma.Decimal(Number(input.discountValue));
    if (input.minCartValue !== undefined)
      data.minCartValue = new Prisma.Decimal(Number(input.minCartValue));
    if (input.maxDiscountAmount !== undefined)
      data.maxDiscountAmount =
        input.maxDiscountAmount === null
          ? null
          : new Prisma.Decimal(Number(input.maxDiscountAmount));
    if (input.scopeIds !== undefined)
      data.scopeIds = input.scopeIds as unknown as Prisma.InputJsonValue;

    return couponRepository.update(id, data);
  },
};
