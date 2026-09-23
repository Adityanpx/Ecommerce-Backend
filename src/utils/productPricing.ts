import { Prisma } from '@prisma/client';

type Money = Prisma.Decimal | number | string | null | undefined;

function num(value: Money): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/**
 * Price resolution, most specific wins:
 *   variant.priceOverride  →  colour.sellingPrice  →  product.sellingPrice
 * This is the ONLY place the rule lives — cart, checkout, the product page
 * and the admin all call it.
 */
export function effectiveSellingPrice(
  variant: { priceOverride: Money },
  color: { sellingPrice: Money } | null | undefined,
  product: { sellingPrice: Money },
): number {
  return num(variant.priceOverride) ?? num(color?.sellingPrice) ?? num(product.sellingPrice) ?? 0;
}

/** MRP: colour.mrp → product.mrp. Variants have no MRP of their own. */
export function effectiveMrp(
  color: { mrp: Money } | null | undefined,
  product: { mrp: Money },
): number {
  return num(color?.mrp) ?? num(product.mrp) ?? 0;
}

/** Cost: colour.costPrice → product.costPrice. null when unknown. */
export function effectiveCostPrice(
  color: { costPrice: Money } | null | undefined,
  product: { costPrice: Money },
): number | null {
  return num(color?.costPrice) ?? num(product.costPrice);
}

/** Whole-number "Save 18%" figure. 0 when there is no discount. */
export function discountPercent(mrp: number, sellingPrice: number): number {
  if (mrp <= 0 || sellingPrice >= mrp) return 0;
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

/** Margin on the selling price, e.g. 32.5 (%). null when cost is unknown or price is 0. */
export function marginPercent(sellingPrice: number, costPrice: number | null): number | null {
  if (costPrice === null || sellingPrice <= 0) return null;
  return Math.round(((sellingPrice - costPrice) / sellingPrice) * 1000) / 10;
}
