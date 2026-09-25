import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError, FieldError } from '../utils/ApiError';
import { generateSku } from '../utils/generators';
import { UPLOAD } from '../config/constants';

/**
 * Rules shared by productService and productColorService. Kept in one module
 * so the two services never import each other.
 */

type Client = Prisma.TransactionClient | typeof prisma;

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

/** Trim, drop blanks, de-duplicate case-insensitively (first spelling wins). */
export function normalizeTags(tags: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags ?? []) {
    const tag = raw.trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/** Search keywords are stored lower-case so `has` matches case-insensitively. */
export function normalizeKeywords(keywords: string[] | undefined): string[] {
  return [...new Set((keywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean))];
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

/** Rejects photos below the hard minimum. Photos without reported dimensions are allowed. */
export function assertImageDimensions(
  images: { width?: number | null; height?: number | null; url?: string }[],
): void {
  const tooSmall = images.filter(
    (img) =>
      img.width !== null &&
      img.width !== undefined &&
      img.height !== null &&
      img.height !== undefined &&
      Math.min(img.width, img.height) < UPLOAD.MIN_IMAGE_EDGE_PX,
  );
  if (tooSmall.length > 0) {
    throw ApiError.validation('Image too small', [
      {
        field: 'images',
        message: `Photos must be at least ${UPLOAD.MIN_IMAGE_EDGE_PX}px on the shorter side (${UPLOAD.RECOMMENDED_IMAGE_EDGE_PX}px+ recommended for zoom)`,
      },
    ]);
  }
}

/**
 * Keeps exactly one `isPrimary` image per product — the cover used on listing
 * cards, cart, wishlist and order snapshots.
 *
 *  - Product with colours: first photo of the default colour (falls back to the
 *    first active colour, then the first shared photo, then any photo).
 *  - Product without colours: keeps the admin's chosen cover if there is one,
 *    otherwise the first photo.
 */
export async function refreshCover(client: Client, productId: string): Promise<void> {
  const [images, colors] = await Promise.all([
    client.productImage.findMany({
      where: { productId },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, colorId: true, isPrimary: true },
    }),
    client.productColor.findMany({
      where: { productId },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, isActive: true, isDefault: true },
    }),
  ]);

  if (images.length === 0) return;

  let coverId: string | undefined;

  if (colors.length > 0) {
    const coverColor =
      colors.find((c) => c.isDefault && c.isActive) ?? colors.find((c) => c.isActive) ?? colors[0];
    coverId =
      images.find((i) => i.colorId === coverColor.id)?.id ??
      images.find((i) => i.colorId === null)?.id ??
      images[0].id;
  } else {
    coverId = images.find((i) => i.isPrimary)?.id ?? images[0].id;
  }

  await client.productImage.updateMany({
    where: { productId, id: { not: coverId }, isPrimary: true },
    data: { isPrimary: false },
  });
  await client.productImage.update({ where: { id: coverId }, data: { isPrimary: true } });
}

// ---------------------------------------------------------------------------
// Default colour
// ---------------------------------------------------------------------------

/**
 * Guarantees exactly one default colour when the product has colours.
 * `preferredId` wins if given (must be active); otherwise the current default
 * is kept if still active, else the first active colour is promoted.
 */
export async function ensureDefaultColor(
  client: Client,
  productId: string,
  preferredId?: string,
): Promise<void> {
  const colors = await client.productColor.findMany({
    where: { productId },
    orderBy: { displayOrder: 'asc' },
    select: { id: true, isActive: true, isDefault: true },
  });
  if (colors.length === 0) return;

  let chosen: string | undefined;
  if (preferredId) {
    const preferred = colors.find((c) => c.id === preferredId);
    if (!preferred) throw ApiError.notFound('Colour not found');
    if (!preferred.isActive) throw ApiError.badRequest('A hidden colour cannot be the default');
    chosen = preferred.id;
  } else {
    chosen =
      colors.find((c) => c.isDefault && c.isActive)?.id ??
      colors.find((c) => c.isActive)?.id ??
      colors[0].id;
  }

  await client.productColor.updateMany({
    where: { productId, id: { not: chosen }, isDefault: true },
    data: { isDefault: false },
  });
  await client.productColor.update({ where: { id: chosen }, data: { isDefault: true } });
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

type Money = Prisma.Decimal | number | null | undefined;
const n = (v: Money): number | null => (v === null || v === undefined ? null : Number(v));

export interface PriceCheckInput {
  product: { mrp: Money; sellingPrice: Money };
  colors: { key: string; name: string; mrp?: Money; sellingPrice?: Money }[];
  variants: { label: string; colorKey?: string | null; priceOverride?: Money }[];
}

/**
 * The one pricing rule, checked in memory:
 *   product selling ≤ product MRP
 *   colour selling (or inherited) ≤ colour MRP (or inherited)
 *   size override ≤ its colour's MRP
 */
export function checkPrices(input: PriceCheckInput): FieldError[] {
  const errors: FieldError[] = [];
  const productMrp = n(input.product.mrp) ?? 0;
  const productSelling = n(input.product.sellingPrice) ?? 0;

  if (productSelling > productMrp) {
    errors.push({ field: 'sellingPrice', message: 'Selling price cannot exceed MRP' });
  }

  const mrpByColor = new Map<string, number>();
  for (const c of input.colors) {
    const mrp = n(c.mrp) ?? productMrp;
    const selling = n(c.sellingPrice) ?? productSelling;
    mrpByColor.set(c.key, mrp);
    if (selling > mrp) {
      errors.push({
        field: `colors.${c.key}.sellingPrice`,
        message: `"${c.name}": selling price ₹${selling} is above its MRP ₹${mrp}`,
      });
    }
  }

  for (const v of input.variants) {
    const override = n(v.priceOverride);
    if (override === null) continue;
    const mrp = (v.colorKey ? mrpByColor.get(v.colorKey) : undefined) ?? productMrp;
    if (override > mrp) {
      errors.push({
        field: `variants.${v.label}.priceOverride`,
        message: `${v.label}: price ₹${override} is above MRP ₹${mrp}`,
      });
    }
  }

  return errors;
}

/** Same rule, loaded from the database. Call inside the write transaction — a throw rolls it back. */
export async function assertPriceConsistency(client: Client, productId: string): Promise<void> {
  const product = await client.product.findUnique({
    where: { id: productId },
    select: {
      mrp: true,
      sellingPrice: true,
      colors: { select: { id: true, name: true, mrp: true, sellingPrice: true } },
      variants: { select: { sku: true, colorId: true, priceOverride: true } },
    },
  });
  if (!product) throw ApiError.notFound('Product not found');

  const errors = checkPrices({
    product,
    colors: product.colors.map((c) => ({ ...c, key: c.id })),
    variants: product.variants.map((v) => ({ ...v, label: v.sku, colorKey: v.colorId })),
  });

  if (errors.length > 0) throw ApiError.validation('Pricing error', errors);
}

// ---------------------------------------------------------------------------
// SKUs & barcodes
// ---------------------------------------------------------------------------

export interface SkuRow {
  size: string | null | undefined;
  colorName: string | null | undefined;
  /** Admin-typed SKU; generated when absent. */
  sku?: string;
}

/** Resolves every row's SKU and rejects duplicates inside the same request. */
export function planSkus(prefix: string, rows: SkuRow[]): string[] {
  const skus = rows.map((r) => r.sku || generateSku(prefix, r.size, r.colorName));
  const seen = new Set<string>();
  for (const sku of skus) {
    if (seen.has(sku)) {
      throw ApiError.conflict(
        `SKU "${sku}" appears twice. Give one of the sizes its own SKU or change the SKU prefix.`,
      );
    }
    seen.add(sku);
  }
  return skus;
}

export async function assertSkusAvailable(
  client: Client,
  skus: string[],
  exceptVariantId?: string,
): Promise<void> {
  if (skus.length === 0) return;
  const taken = await client.productVariant.findMany({
    where: { sku: { in: skus }, ...(exceptVariantId ? { id: { not: exceptVariantId } } : {}) },
    select: { sku: true },
  });
  if (taken.length > 0) {
    throw ApiError.conflict(
      `SKU already in use: ${taken.map((t) => t.sku).join(', ')}. Use a different SKU prefix or custom SKU.`,
      taken.map((t) => ({ field: 'sku', message: `${t.sku} already exists` })),
    );
  }
}

export async function assertBarcodesAvailable(
  client: Client,
  barcodes: (string | null | undefined)[],
  exceptVariantId?: string,
): Promise<void> {
  const list = barcodes.filter((b): b is string => Boolean(b));
  const dupes = list.filter((b, i) => list.indexOf(b) !== i);
  if (dupes.length > 0) {
    throw ApiError.conflict(`Barcode entered twice: ${[...new Set(dupes)].join(', ')}`);
  }
  if (list.length === 0) return;

  const taken = await client.productVariant.findMany({
    where: {
      barcode: { in: list },
      ...(exceptVariantId ? { id: { not: exceptVariantId } } : {}),
    },
    select: { barcode: true, sku: true },
  });
  if (taken.length > 0) {
    throw ApiError.conflict(
      `Barcode already used by another product: ${taken.map((t) => `${t.barcode} (${t.sku})`).join(', ')}`,
    );
  }
}

/** Two rows with the same size in the same colour are the same variant. */
export function assertUniqueSizeColor(rows: { size?: string | null; colorName?: string | null }[]) {
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${(r.size ?? '').toLowerCase()}|${(r.colorName ?? '').toLowerCase()}`;
    if (seen.has(key)) {
      const parts = [r.size && `size "${r.size}"`, r.colorName && `colour "${r.colorName}"`].filter(
        Boolean,
      );
      throw ApiError.conflict(
        `Duplicate variant: ${parts.length > 0 ? parts.join(' / ') : 'a one-size variant already exists'}`,
      );
    }
    seen.add(key);
  }
}

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

/** Validates related-product ids (exist, not deleted, not the product itself). */
export async function assertRelatableProducts(
  client: Client,
  productId: string | null,
  ids: string[],
): Promise<void> {
  const unique = [...new Set(ids)];
  if (productId && unique.includes(productId)) {
    throw ApiError.badRequest('A product cannot be related to itself');
  }
  if (unique.length === 0) return;
  const found = await client.product.count({ where: { id: { in: unique }, deletedAt: null } });
  if (found !== unique.length) {
    throw ApiError.badRequest('One or more related products do not exist');
  }
}

export async function replaceRelations(
  client: Prisma.TransactionClient,
  productId: string,
  related: string[],
  boughtTogether: string[],
): Promise<void> {
  await client.productRelation.deleteMany({ where: { productId } });
  const rows = [
    ...[...new Set(related)].map((id, i) => ({
      productId,
      relatedProductId: id,
      type: 'RELATED' as const,
      displayOrder: i,
    })),
    ...[...new Set(boughtTogether)].map((id, i) => ({
      productId,
      relatedProductId: id,
      type: 'BOUGHT_TOGETHER' as const,
      displayOrder: i,
    })),
  ];
  if (rows.length > 0) await client.productRelation.createMany({ data: rows });
}
