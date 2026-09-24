import { CartWithItems } from '../repositories/cart.repository';
import { settingsService, PlatformSettings } from './settings.service';
import { add, multiply, subtract, percentageOf, toNumber } from '../utils/money';
import { effectiveMrp, effectiveSellingPrice } from '../utils/productPricing';
import { CART } from '../config/constants';
import { ApiError } from '../utils/ApiError';

export interface PricedLine {
  cartItemId: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  subCategorySlug: string;
  sportSlug: string;
  variantLabel: string;
  colorId: string | null;
  colorName: string | null;
  sku: string;
  imageUrl: string | null;
  hsnCode: string | null;
  unitPrice: number;
  /** MRP for this line's colour — lets the cart show "you saved". */
  mrp: number;
  quantity: number;
  lineTotal: number;
  gstRate: number;
  taxAmount: number;
  stock: number;
  inStock: boolean;
  isOversized: boolean;
  perProductShipping: number | null;
  /** false = the whole order cannot be paid by COD. */
  codAvailable: boolean;
  /** Snapshotted onto the order item at checkout. */
  isReturnable: boolean;
  returnWindowDays: number | null;
  /** Max units of this PRODUCT (all its variants together) per order. */
  maxOrderQuantity: number;
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

type CartLine = CartWithItems['items'][number];

/** variant override → colour price → product price (see utils/productPricing). */
function unitPriceFor(item: CartLine): number {
  return effectiveSellingPrice(item.variant, item.variant.colorRef, item.variant.product);
}

/** variant image → colour's first photo → product cover. */
export function lineImageFor(item: CartLine): string | null {
  return (
    item.variant.imageUrl ??
    item.variant.colorRef?.images[0]?.url ??
    item.variant.product.images[0]?.url ??
    null
  );
}

/** A product's own limit, else the platform default. */
export function maxOrderQuantityFor(product: { maxOrderQuantity: number | null }): number {
  return product.maxOrderQuantity ?? CART.MAX_QUANTITY_PER_ITEM;
}

/** Product rate wins over category rate, which wins over the platform default. */
function gstRateFor(item: CartLine, settings: PlatformSettings): number {
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
          colorId: item.variant.colorId,
          colorName: item.variant.colorRef?.name ?? item.variant.color,
          sku: item.variant.sku,
          imageUrl: lineImageFor(item),
          hsnCode: product.hsnCode,
          unitPrice,
          mrp: effectiveMrp(item.variant.colorRef, product),
          quantity: item.quantity,
          lineTotal,
          gstRate,
          taxAmount: this.extractInclusiveTax(lineTotal, gstRate),
          stock: item.variant.stock,
          inStock:
            item.variant.stock >= item.quantity &&
            item.variant.isActive &&
            (item.variant.colorRef?.isActive ?? true) &&
            product.status === 'ACTIVE' &&
            product.deletedAt === null,
          isOversized: product.isOversized,
          perProductShipping:
            product.shippingCharge !== null ? toNumber(product.shippingCharge) : null,
          codAvailable: product.codAvailable,
          isReturnable: product.isReturnable,
          returnWindowDays: product.returnWindowDays,
          maxOrderQuantity: maxOrderQuantityFor(product),
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

  /**
   * Per-product quantity limit, counted across all of the product's variants
   * (2 × size 8 + 1 × size 9 of a "max 2" shoe is 3 → rejected).
   */
  assertQuantityLimits(lines: PricedLine[]): void {
    const perProduct = new Map<string, { name: string; qty: number; max: number }>();
    for (const line of lines) {
      const entry = perProduct.get(line.productId) ?? {
        name: line.productName,
        qty: 0,
        max: line.maxOrderQuantity,
      };
      entry.qty += line.quantity;
      perProduct.set(line.productId, entry);
    }
    for (const { name, qty, max } of perProduct.values()) {
      if (qty > max) {
        throw ApiError.badRequest(`You can order at most ${max} of "${name}" per order`);
      }
    }
  },

  /** Names of products in the cart that cannot be paid by cash on delivery. */
  codBlockedProducts(lines: PricedLine[]): string[] {
    return [...new Set(lines.filter((l) => !l.codAvailable).map((l) => l.productName))];
  },

  percentageOf,
};
