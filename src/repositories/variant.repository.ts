import { Prisma, ProductVariant } from '@prisma/client';
import { prisma } from '../config/database';

export const variantRepository = {
  findById(id: string) {
    return prisma.productVariant.findUnique({
      where: { id },
      include: {
        colorRef: { select: { id: true, name: true, isActive: true } },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sellingPrice: true,
            maxOrderQuantity: true,
            skuPrefix: true,
            status: true,
            deletedAt: true,
            hsnCode: true,
            gstRate: true,
            isOversized: true,
            shippingCharge: true,
            subCategoryId: true,
          },
        },
      },
    });
  },

  findByProduct(productId: string): Promise<ProductVariant[]> {
    return prisma.productVariant.findMany({
      where: { productId },
      orderBy: [{ size: 'asc' }, { color: 'asc' }],
    });
  },

  skuExists(sku: string): Promise<boolean> {
    return prisma.productVariant.findUnique({ where: { sku } }).then((v) => v !== null);
  },

  /** Which of these SKUs are already taken (optionally ignoring one variant being edited). */
  async takenSkus(skus: string[], exceptVariantId?: string): Promise<Set<string>> {
    if (skus.length === 0) return new Set();
    const rows = await prisma.productVariant.findMany({
      where: { sku: { in: skus }, ...(exceptVariantId ? { id: { not: exceptVariantId } } : {}) },
      select: { sku: true },
    });
    return new Set(rows.map((r) => r.sku));
  },

  async takenBarcodes(barcodes: string[], exceptVariantId?: string): Promise<Set<string>> {
    if (barcodes.length === 0) return new Set();
    const rows = await prisma.productVariant.findMany({
      where: {
        barcode: { in: barcodes },
        ...(exceptVariantId ? { id: { not: exceptVariantId } } : {}),
      },
      select: { barcode: true },
    });
    return new Set(rows.map((r) => r.barcode as string));
  },

  /** True when any order line points at one of these variants (they must then never be deleted). */
  async anyOrdered(variantIds: string[]): Promise<boolean> {
    if (variantIds.length === 0) return false;
    const count = await prisma.orderItem.count({ where: { variantId: { in: variantIds } } });
    return count > 0;
  },

  create(data: Prisma.ProductVariantUncheckedCreateInput): Promise<ProductVariant> {
    return prisma.productVariant.create({ data });
  },

  update(id: string, data: Prisma.ProductVariantUpdateInput): Promise<ProductVariant> {
    return prisma.productVariant.update({ where: { id }, data });
  },

  delete(id: string): Promise<ProductVariant> {
    return prisma.productVariant.delete({ where: { id } });
  },

  /** Live stock for a product's variants — polled by the product page. Hidden colours excluded. */
  stockByProduct(productId: string) {
    return prisma.productVariant.findMany({
      where: {
        productId,
        isActive: true,
        OR: [{ colorId: null }, { colorRef: { isActive: true } }],
      },
      select: { id: true, sku: true, size: true, color: true, colorId: true, stock: true },
    });
  },

  countActiveByProduct(productId: string): Promise<number> {
    return prisma.productVariant.count({ where: { productId, isActive: true } });
  },
};
