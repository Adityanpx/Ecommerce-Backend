import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { CATALOG } from '../config/constants';
import { deleteAsset } from '../integrations/r2/deleteAsset';
import { imageRepository } from '../repositories/image.repository';
import {
  assertBarcodesAvailable,
  assertImageDimensions,
  assertPriceConsistency,
  assertSkusAvailable,
  assertUniqueSizeColor,
  ensureDefaultColor,
  planSkus,
  refreshCover,
} from './productRules';

const dec = (v: number | null | undefined) =>
  v === undefined ? undefined : v === null ? null : new Prisma.Decimal(v);

interface SizeRow {
  size: string | null;
  sku?: string;
  barcode?: string | null;
  priceOverride?: number | null;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

interface ImageRow {
  url: string;
  publicId: string;
  altText?: string | null;
  displayOrder?: number;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
}

export interface CreateColorInput {
  name: string;
  hex?: string | null;
  secondaryHex?: string | null;
  swatchId?: string | null;
  mrp?: number | null;
  sellingPrice?: number | null;
  costPrice?: number | null;
  isActive: boolean;
  isDefault: boolean;
  images: ImageRow[];
  sizes: SizeRow[];
  copyFromColorId?: string;
}

export interface UpdateColorInput {
  name?: string;
  hex?: string | null;
  secondaryHex?: string | null;
  swatchId?: string | null;
  mrp?: number | null;
  sellingPrice?: number | null;
  costPrice?: number | null;
  isActive?: boolean;
  isDefault?: true;
}

async function loadProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      colors: { select: { id: true, name: true } },
      variants: { select: { id: true, size: true, colorId: true } },
    },
  });
  if (!product || product.deletedAt) throw ApiError.notFound('Product not found');
  return product;
}

/** Deletes R2 objects no image row references any more (duplicated products share objects). */
async function cleanupObjects(publicIds: string[]): Promise<void> {
  for (const publicId of new Set(publicIds)) {
    if (await imageRepository.isPublicIdUnused(publicId)) void deleteAsset(publicId);
  }
}

export const productColorService = {
  /**
   * "+ Add colour" on the product form.
   *  - Picks name/hex from the colour library when swatchId is given and they are omitted.
   *  - copyFromColorId copies sizes (stock starts at 0) and colour prices.
   *  - The FIRST colour added to a product that so far had no colours adopts the
   *    product's existing sizes, so nothing is orphaned.
   */
  async create(productId: string, input: CreateColorInput, adminId?: string) {
    const product = await loadProduct(productId);

    if (product.colors.length >= CATALOG.MAX_COLORS_PER_PRODUCT) {
      throw ApiError.badRequest(
        `A product can have at most ${CATALOG.MAX_COLORS_PER_PRODUCT} colours`,
      );
    }

    let { name, hex } = input;
    let secondaryHex = input.secondaryHex;
    if (input.swatchId) {
      const swatch = await prisma.colorSwatch.findUnique({ where: { id: input.swatchId } });
      if (!swatch) throw ApiError.badRequest('That colour is no longer in the library');
      name = name || swatch.name;
      hex = hex ?? swatch.hex;
      secondaryHex = secondaryHex ?? swatch.secondaryHex;
    }

    if (product.colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw ApiError.conflict(`This product already has a colour called "${name}"`, [
        { field: 'name', message: 'Already exists' },
      ]);
    }

    // ---- copy from an existing colour ----
    let sizes = input.sizes;
    let prices = { mrp: input.mrp, sellingPrice: input.sellingPrice, costPrice: input.costPrice };
    if (input.copyFromColorId) {
      const source = await prisma.productColor.findFirst({
        where: { id: input.copyFromColorId, productId },
        include: { variants: { orderBy: { size: 'asc' } } },
      });
      if (!source)
        throw ApiError.badRequest('The colour to copy from does not belong to this product');

      if (sizes.length === 0) {
        sizes = source.variants.map((v) => ({
          size: v.size,
          priceOverride: v.priceOverride === null ? null : Number(v.priceOverride),
          stock: 0,
          lowStockThreshold: v.lowStockThreshold,
          isActive: v.isActive,
        }));
      }
      prices = {
        mrp: input.mrp !== undefined ? input.mrp : source.mrp === null ? null : Number(source.mrp),
        sellingPrice:
          input.sellingPrice !== undefined
            ? input.sellingPrice
            : source.sellingPrice === null
              ? null
              : Number(source.sellingPrice),
        costPrice:
          input.costPrice !== undefined
            ? input.costPrice
            : source.costPrice === null
              ? null
              : Number(source.costPrice),
      };
    }

    // ---- first colour on a colour-less product adopts its sizes ----
    const orphanVariants =
      product.colors.length === 0 ? product.variants.filter((v) => v.colorId === null) : [];
    const adoptedSizes = new Set(orphanVariants.map((v) => (v.size ?? '').toLowerCase()));
    const newSizes = sizes.filter((s) => !adoptedSizes.has((s.size ?? '').toLowerCase()));

    if (newSizes.length === 0 && orphanVariants.length === 0) {
      throw ApiError.badRequest('Add at least one size for this colour');
    }

    assertUniqueSizeColor(newSizes.map((s) => ({ size: s.size, colorName: name })));
    assertImageDimensions(input.images);

    const skus = planSkus(
      product.skuPrefix,
      newSizes.map((s) => ({ size: s.size, colorName: name, sku: s.sku })),
    );
    await assertSkusAvailable(prisma, skus);
    await assertBarcodesAvailable(
      prisma,
      newSizes.map((s) => s.barcode),
    );

    const colorId = await prisma.$transaction(async (tx) => {
      const color = await tx.productColor.create({
        data: {
          productId,
          swatchId: input.swatchId ?? null,
          name,
          hex: hex ?? null,
          secondaryHex: secondaryHex ?? null,
          mrp: dec(prices.mrp) ?? null,
          sellingPrice: dec(prices.sellingPrice) ?? null,
          costPrice: dec(prices.costPrice) ?? null,
          isActive: input.isActive,
          isDefault: false,
          displayOrder: product.colors.length,
        },
      });

      if (orphanVariants.length > 0) {
        await tx.productVariant.updateMany({
          where: { id: { in: orphanVariants.map((v) => v.id) } },
          data: { colorId: color.id, color: name, colorHex: hex ?? null },
        });
      }

      for (const [i, s] of newSizes.entries()) {
        const variant = await tx.productVariant.create({
          data: {
            productId,
            colorId: color.id,
            sku: skus[i],
            barcode: s.barcode ?? null,
            size: s.size,
            color: name,
            colorHex: hex ?? null,
            priceOverride: dec(s.priceOverride) ?? null,
            stock: s.stock,
            lowStockThreshold: s.lowStockThreshold,
            isActive: input.isActive && s.isActive,
          },
        });
        if (s.stock > 0) {
          await tx.stockMovement.create({
            data: {
              variantId: variant.id,
              reason: 'INITIAL_STOCK',
              quantityDelta: s.stock,
              stockBefore: 0,
              stockAfter: s.stock,
              note: `Colour "${name}" added`,
              adminId: adminId ?? null,
            },
          });
        }
      }

      if (input.images.length > 0) {
        await tx.productImage.createMany({
          data: input.images.map((img, i) => ({
            productId,
            colorId: color.id,
            url: img.url,
            publicId: img.publicId,
            altText: img.altText ?? `${product.name} – ${name}`,
            displayOrder: img.displayOrder ?? i,
            width: img.width ?? null,
            height: img.height ?? null,
            sizeBytes: img.sizeBytes ?? null,
            isPrimary: false,
          })),
        });
      }

      await ensureDefaultColor(tx, productId, input.isDefault ? color.id : undefined);
      await refreshCover(tx, productId);
      await assertPriceConsistency(tx, productId);
      return color.id;
    });

    return prisma.productColor.findUnique({
      where: { id: colorId },
      include: { variants: true, images: { orderBy: { displayOrder: 'asc' } } },
    });
  },

  /**
   * Rename / recolour / reprice / hide / make default.
   * Renaming keeps SKUs unchanged (they are identifiers printed on labels) and
   * updates the denormalised variant.color used by orders and reports.
   * Hiding a colour hides all its sizes; showing it again re-enables them.
   */
  async update(colorId: string, input: UpdateColorInput) {
    const color = await prisma.productColor.findUnique({
      where: { id: colorId },
      include: { product: { select: { id: true, deletedAt: true } } },
    });
    if (!color || color.product.deletedAt) throw ApiError.notFound('Colour not found');

    const name = input.name?.trim();
    if (name && name.toLowerCase() !== color.name.toLowerCase()) {
      const clash = await prisma.productColor.findFirst({
        where: {
          productId: color.productId,
          id: { not: colorId },
          name: { equals: name, mode: 'insensitive' },
        },
      });
      if (clash) throw ApiError.conflict(`This product already has a colour called "${name}"`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.productColor.update({
        where: { id: colorId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(input.hex !== undefined ? { hex: input.hex } : {}),
          ...(input.secondaryHex !== undefined ? { secondaryHex: input.secondaryHex } : {}),
          ...(input.swatchId !== undefined ? { swatchId: input.swatchId } : {}),
          ...(input.mrp !== undefined ? { mrp: dec(input.mrp) } : {}),
          ...(input.sellingPrice !== undefined ? { sellingPrice: dec(input.sellingPrice) } : {}),
          ...(input.costPrice !== undefined ? { costPrice: dec(input.costPrice) } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });

      // Keep the denormalised copies on the variants in sync.
      const variantData: Prisma.ProductVariantUpdateManyMutationInput = {};
      if (name !== undefined) variantData.color = name;
      if (input.hex !== undefined) variantData.colorHex = input.hex;
      if (input.isActive !== undefined) variantData.isActive = input.isActive;
      if (Object.keys(variantData).length > 0) {
        await tx.productVariant.updateMany({ where: { colorId }, data: variantData });
      }

      await ensureDefaultColor(tx, color.productId, input.isDefault ? colorId : undefined);
      await refreshCover(tx, color.productId);
      await assertPriceConsistency(tx, color.productId);
    });

    return prisma.productColor.findUnique({
      where: { id: colorId },
      include: { variants: true, images: { orderBy: { displayOrder: 'asc' } } },
    });
  },

  /**
   * Deletes a colour with its sizes and photos — only when none of its sizes was
   * ever ordered (order history must keep pointing at real variants). Otherwise
   * the admin is told to hide it instead.
   */
  async remove(colorId: string) {
    const color = await prisma.productColor.findUnique({
      where: { id: colorId },
      include: {
        variants: { select: { id: true } },
        images: { select: { publicId: true } },
        product: { select: { id: true, deletedAt: true } },
      },
    });
    if (!color || color.product.deletedAt) throw ApiError.notFound('Colour not found');

    const otherColors = await prisma.productColor.count({
      where: { productId: color.productId, id: { not: colorId } },
    });
    if (otherColors === 0) {
      throw ApiError.conflict(
        'This is the only colour. Add another colour first, or hide this one instead.',
      );
    }

    const variantIds = color.variants.map((v) => v.id);
    const ordered = await prisma.orderItem.count({ where: { variantId: { in: variantIds } } });
    if (ordered > 0) {
      throw ApiError.conflict(
        'This colour has been ordered before, so it cannot be deleted. Hide it instead.',
      );
    }

    await prisma.$transaction(async (tx) => {
      // Cart items and stock movements cascade with the variants; images cascade with the colour.
      await tx.productVariant.deleteMany({ where: { colorId } });
      await tx.productColor.delete({ where: { id: colorId } });
      await ensureDefaultColor(tx, color.productId);
      await refreshCover(tx, color.productId);
    });

    await cleanupObjects(color.images.map((i) => i.publicId));
  },

  async reorder(productId: string, items: { id: string; displayOrder: number }[]) {
    await loadProduct(productId);
    const owned = await prisma.productColor.count({
      where: { productId, id: { in: items.map((i) => i.id) } },
    });
    if (owned !== items.length) throw ApiError.badRequest('Colours do not belong to this product');

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.productColor.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        });
      }
      await refreshCover(tx, productId);
    });

    return prisma.productColor.findMany({
      where: { productId },
      orderBy: { displayOrder: 'asc' },
    });
  },

  cleanupObjects,
};
