import { CartWithItems } from '../repositories/cart.repository';
import { settingsService, PlatformSettings } from './settings.service';
import { add, multiply, subtract, percentageOf, toNumber } from '../utils/money';

export interface PricedLine {
  cartItemId: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  subCategorySlug: string;
  sportSlug: string;
  variantLabel: string;
  sku: string;
  imageUrl: string | null;
  hsnCode: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  gstRate: number;
  taxAmount: number;
  stock: number;
  inStock: boolean;
  isOversized: boolean;
  perProductShipping: number | null;
}

export interface PriceBreakdown {
  lines: PricedLine[];
  subtotal: number;
  discountAmount: number;
  shippingCharge: number;
  taxAmount: number;
  total: number;
  hasOutOfStock: boolean;
}

/** Variant override wins over product base price. */
function unitPriceFor(item: CartWithItems['items'][number]): number {
  const override = item.variant.priceOverride;
  return toNumber(override ?? item.variant.product.sellingPrice);
}

/** Product rate wins over category rate, which wins over the platform default. */
function gstRateFor(item: CartWithItems['items'][number], settings: PlatformSettings): number {
  const product = item.variant.product;
  if (product.gstRate !== null) return Number(product.gstRate);
  if (product.subCategory && product.subCategory.gstRate !== null) {
    return Number(product.subCategory.gstRate);
  }
  return settings.gstDefaultRate;
}

/** Size and colour are both optional; a variant with neither is labelled "Standard". */
export function variantLabel(size: string | null, color: string | null): string {
  return [size, color].filter(Boolean).join(' / ') || 'Standard';
}

export const pricingService = {
  /**
   * Tax is INCLUSIVE. A line of Rs.1180 at 18% GST contains Rs.180 of tax:
   *   base = 1180 / 1.18 = 1000
   *   tax  = 1180 - 1000 = 180
   * The customer pays Rs.1180 either way — this only determines what the
   * invoice discloses.
   */
  extractInclusiveTax(lineTotal: number, gstRate: number): number {
    if (gstRate <= 0) return 0;
    const base = lineTotal / (1 + gstRate / 100);
    return subtract(lineTotal, base);
  },

  buildLines(cart: CartWithItems, settings: PlatformSettings): PricedLine[] {
    return cart.items
      .filter((item) => !item.isSavedForLater)
      .map((item) => {
        const product = item.variant.product;
        const unitPrice = unitPriceFor(item);
        const lineTotal = multiply(unitPrice, item.quantity);
        const gstRate = gstRateFor(item, settings);

        return {
          cartItemId: item.id,
          variantId: item.variantId,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          subCategorySlug: product.subCategory.slug,
          sportSlug: product.subCategory.sport.slug,
          variantLabel: variantLabel(item.variant.size, item.variant.color),
          sku: item.variant.sku,
          imageUrl: item.variant.imageUrl ?? product.images[0]?.url ?? null,
          hsnCode: product.hsnCode,
          unitPrice,
          quantity: item.quantity,
          lineTotal,
          gstRate,
          taxAmount: this.extractInclusiveTax(lineTotal, gstRate),
          stock: item.variant.stock,
          inStock:
            item.variant.stock >= item.quantity &&
            item.variant.isActive &&
            product.status === 'ACTIVE' &&
            product.deletedAt === null,
          isOversized: product.isOversized,
          perProductShipping:
            product.shippingCharge !== null ? toNumber(product.shippingCharge) : null,
        };
      });
  },

  calculateShipping(
    lines: PricedLine[],
    subtotalAfterDiscount: number,
    settings: PlatformSettings,
  ): number {
    if (lines.length === 0) return 0;

    let base = 0;

    switch (settings.shippingMode) {
      case 'FLAT':
        base = settings.shippingFlatRate;
        break;

      case 'FREE_ABOVE':
        base = subtotalAfterDiscount >= settings.shippingFreeAbove ? 0 : settings.shippingFlatRate;
        break;

      case 'PER_PRODUCT':
        // Sum of per-product charges; products without one contribute nothing.
        base = lines.reduce<number>((sum, line) => add(sum, line.perProductShipping ?? 0), 0);
        break;
    }

    // Oversized surcharge applies once per order, not per item — a customer
    // ordering two snowboards is charged one freight surcharge.
    const hasOversized = lines.some((line) => line.isOversized);
    if (hasOversized) {
      base = add(base, settings.shippingOversizedSurcharge);
    }

    return base;
  },

  /**
   * discountAmount is computed by couponService and passed in, because
   * coupon eligibility depends on scope and usage rules this service
   * has no business knowing about.
   */
  compose(lines: PricedLine[], discountAmount: number, settings: PlatformSettings): PriceBreakdown {
    const subtotal = lines.reduce<number>((sum, line) => add(sum, line.lineTotal), 0);

    // A discount can never exceed the subtotal.
    const safeDiscount = Math.min(discountAmount, subtotal);
    const afterDiscount = subtract(subtotal, safeDiscount);

    const shippingCharge = this.calculateShipping(lines, afterDiscount, settings);

    // Tax recomputed against the discounted amount, proportionally.
    const discountRatio = subtotal > 0 ? afterDiscount / subtotal : 0;
    const taxAmount = lines.reduce<number>(
      (sum, line) => add(sum, multiply(line.taxAmount, discountRatio)),
      0,
    );

    return {
      lines,
      subtotal,
      discountAmount: safeDiscount,
      shippingCharge,
      taxAmount,
      // Tax is already inside subtotal — it is NOT added here.
      total: add(afterDiscount, shippingCharge),
      hasOutOfStock: lines.some((line) => !line.inStock),
    };
  },

  async priceCart(cart: CartWithItems, discountAmount = 0): Promise<PriceBreakdown> {
    const settings = await settingsService.getAll();
    const lines = this.buildLines(cart, settings);
    return this.compose(lines, discountAmount, settings);
  },

  /** Exposed for the coupon service so scope-limited discounts price correctly. */
  eligibleSubtotal(lines: PricedLine[], predicate: (line: PricedLine) => boolean): number {
    return lines.filter(predicate).reduce<number>((sum, line) => add(sum, line.lineTotal), 0);
  },

  percentageOf,
};
