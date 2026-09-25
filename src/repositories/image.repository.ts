import { Prisma, ProductImage } from '@prisma/client';
import { prisma } from '../config/database';

export const imageRepository = {
  findById(id: string): Promise<ProductImage | null> {
    return prisma.productImage.findUnique({ where: { id } });
  },

  findByProduct(productId: string): Promise<ProductImage[]> {
    return prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
    });
  },

  createMany(data: Prisma.ProductImageCreateManyInput[]) {
    return prisma.productImage.createMany({ data });
  },

  delete(id: string): Promise<ProductImage> {
    return prisma.productImage.delete({ where: { id } });
  },

  countByProduct(productId: string): Promise<number> {
    return prisma.productImage.count({ where: { productId } });
  },

  /** Photos in one group: a colour's photos, or the shared photos when colorId is null. */
  countInGroup(productId: string, colorId: string | null): Promise<number> {
    return prisma.productImage.count({ where: { productId, colorId } });
  },

  /**
   * Duplicated products reuse the same R2 objects. An object may be deleted from
   * storage only when no image row references it any more.
   */
  async isPublicIdUnused(publicId: string): Promise<boolean> {
    return (await prisma.productImage.count({ where: { publicId } })) === 0;
  },

  /**
   * Reordering runs in a transaction and clears every isPrimary flag first,
   * because the schema allows only one primary image per product.
   */
  reorder(
    productId: string,
    items: { id: string; displayOrder: number; isPrimary?: boolean; colorId?: string | null }[],
  ) {
    return prisma.$transaction([
      prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
      ...items.map((item) =>
        prisma.productImage.update({
          where: { id: item.id },
          data: {
            displayOrder: item.displayOrder,
            isPrimary: item.isPrimary ?? false,
            ...(item.colorId !== undefined ? { colorId: item.colorId } : {}),
          },
        }),
      ),
    ]);
  },
};
