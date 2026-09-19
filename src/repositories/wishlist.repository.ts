import { prisma } from '../config/database';

const itemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      mrp: true,
      sellingPrice: true,
      status: true,
      deletedAt: true,
      images: {
        orderBy: [{ isPrimary: 'desc' as const }, { displayOrder: 'asc' as const }],
        take: 1,
        select: { url: true, altText: true },
      },
      variants: {
        where: { isActive: true },
        select: { id: true, stock: true },
      },
      subCategory: {
        select: {
          slug: true,
          sport: { select: { slug: true } },
        },
      },
    },
  },
};

export const wishlistRepository = {
  findOrCreate(userId: string) {
    return prisma.wishlist.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  },

  findByUser(userId: string) {
    return prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: itemInclude,
          orderBy: { addedAt: 'desc' },
        },
      },
    });
  },

  async addItem(userId: string, productId: string) {
    const wishlist = await this.findOrCreate(userId);

    return prisma.wishlistItem.upsert({
      where: {
        wishlistId_productId: { wishlistId: wishlist.id, productId },
      },
      create: { wishlistId: wishlist.id, productId },
      update: {}, // Already exists — no-op
      include: itemInclude,
    });
  },

  async removeItem(userId: string, productId: string) {
    const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) return null;

    return prisma.wishlistItem
      .delete({
        where: {
          wishlistId_productId: { wishlistId: wishlist.id, productId },
        },
      })
      .catch(() => null); // Not found = already removed
  },

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) return false;

    const item = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: { wishlistId: wishlist.id, productId },
      },
    });
    return item !== null;
  },

  /** Batch check — returns set of productIds that are in the user's wishlist. */
  async inWishlistBatch(userId: string, productIds: string[]): Promise<Set<string>> {
    const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) return new Set();

    const items = await prisma.wishlistItem.findMany({
      where: {
        wishlistId: wishlist.id,
        productId: { in: productIds },
      },
      select: { productId: true },
    });
    return new Set(items.map((i) => i.productId));
  },
};
