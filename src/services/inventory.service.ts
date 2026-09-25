import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export type InventoryStatus = 'ALL' | 'LOW' | 'OUT';

/**
 * Variant-level stock screen (#8): "what do I need to restock?".
 * LOW = in stock but at/below that size's own low-stock threshold.
 */
export const inventoryService = {
  async list(
    filters: {
      status: InventoryStatus;
      search?: string;
      sportId?: string;
      subCategoryId?: string;
    },
    skip: number,
    take: number,
  ) {
    const where: Prisma.ProductVariantWhereInput = {
      isActive: true,
      product: {
        deletedAt: null,
        ...(filters.subCategoryId ? { subCategoryId: filters.subCategoryId } : {}),
        ...(filters.sportId ? { subCategory: { sportId: filters.sportId } } : {}),
      },
      ...(filters.status === 'OUT' ? { stock: 0 } : {}),
      ...(filters.status === 'LOW'
        ? { stock: { gt: 0, lte: prisma.productVariant.fields.lowStockThreshold } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { sku: { contains: filters.search, mode: 'insensitive' } },
              { barcode: filters.search },
              { product: { name: { contains: filters.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.productVariant.findMany({
        where,
        orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          sku: true,
          barcode: true,
          size: true,
          color: true,
          colorHex: true,
          stock: true,
          lowStockThreshold: true,
          updatedAt: true,
          colorRef: {
            select: {
              id: true,
              name: true,
              images: { orderBy: { displayOrder: 'asc' }, take: 1, select: { url: true } },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              images: {
                orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      }),
      prisma.productVariant.count({ where }),
    ]);

    return {
      items: items.map((v) => ({
        ...v,
        imageUrl: v.colorRef?.images[0]?.url ?? v.product.images[0]?.url ?? null,
      })),
      total,
    };
  },

  /** Badge counts for the inventory tabs and the dashboard. */
  async summary() {
    const base: Prisma.ProductVariantWhereInput = { isActive: true, product: { deletedAt: null } };
    const [out, low] = await Promise.all([
      prisma.productVariant.count({ where: { ...base, stock: 0 } }),
      prisma.productVariant.count({
        where: { ...base, stock: { gt: 0, lte: prisma.productVariant.fields.lowStockThreshold } },
      }),
    ]);
    return { outOfStock: out, lowStock: low };
  },
};
