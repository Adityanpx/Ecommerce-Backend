import { Prisma, ProductVariant } from '@prisma/client';
import { prisma } from '../config/database';

export const variantRepository = {
  findById(id: string) {
    return prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sellingPrice: true,
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

  create(data: Prisma.ProductVariantUncheckedCreateInput): Promise<ProductVariant> {
    return prisma.productVariant.create({ data });
  },

  update(id: string, data: Prisma.ProductVariantUpdateInput): Promise<ProductVariant> {
    return prisma.productVariant.update({ where: { id }, data });
  },

  delete(id: string): Promise<ProductVariant> {
    return prisma.productVariant.delete({ where: { id } });
  },

  /** Live stock for a product's variants — polled by the product page. */
  stockByProduct(productId: string) {
    return prisma.productVariant.findMany({
      where: { productId, isActive: true },
      select: { id: true, sku: true, size: true, color: true, stock: true },
    });
  },

  countActiveByProduct(productId: string): Promise<number> {
    return prisma.productVariant.count({ where: { productId, isActive: true } });
  },
};
