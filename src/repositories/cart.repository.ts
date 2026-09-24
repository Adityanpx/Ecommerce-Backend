import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

/**
 * Exported so checkout (order.service) re-reads the cart inside its transaction
 * with exactly the same shape pricing.service expects.
 */
export const cartInclude = {
  items: {
    orderBy: { addedAt: 'desc' as const },
    include: {
      variant: {
        include: {
          colorRef: {
            select: {
              id: true,
              name: true,
              sellingPrice: true,
              mrp: true,
              isActive: true,
              images: {
                orderBy: { displayOrder: 'asc' as const },
                take: 1,
                select: { url: true },
              },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              brand: true,
              mrp: true,
              sellingPrice: true,
              maxOrderQuantity: true,
              codAvailable: true,
              isReturnable: true,
              returnWindowDays: true,
              status: true,
              deletedAt: true,
              hsnCode: true,
              gstRate: true,
              isOversized: true,
              shippingCharge: true,
              weightGrams: true,
              subCategoryId: true,
              subCategory: {
                select: {
                  id: true,
                  slug: true,
                  gstRate: true,
                  sport: { select: { slug: true } },
                },
              },
              images: {
                orderBy: [{ isPrimary: 'desc' as const }, { displayOrder: 'asc' as const }],
                take: 1,
              },
            },
          },
        },
      },
    },
  },
  coupon: true,
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export const cartRepository = {
  findByUser(userId: string): Promise<CartWithItems | null> {
    return prisma.cart.findUnique({ where: { userId }, include: cartInclude });
  },

  findByGuestToken(guestToken: string): Promise<CartWithItems | null> {
    return prisma.cart.findUnique({ where: { guestToken }, include: cartInclude });
  },

  findById(id: string): Promise<CartWithItems | null> {
    return prisma.cart.findUnique({ where: { id }, include: cartInclude });
  },

  createForUser(userId: string): Promise<CartWithItems> {
    return prisma.cart.create({ data: { userId }, include: cartInclude });
  },

  createForGuest(guestToken: string, expiresAt: Date): Promise<CartWithItems> {
    return prisma.cart.create({ data: { guestToken, expiresAt }, include: cartInclude });
  },

  upsertItem(cartId: string, variantId: string, quantity: number) {
    return prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      update: { quantity },
      create: { cartId, variantId, quantity },
    });
  },

  findItem(id: string) {
    return prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true, variant: true },
    });
  },

  updateItem(id: string, data: Prisma.CartItemUpdateInput) {
    return prisma.cartItem.update({ where: { id }, data });
  },

  deleteItem(id: string) {
    return prisma.cartItem.delete({ where: { id } });
  },

  clearItems(cartId: string) {
    return prisma.cartItem.deleteMany({ where: { cartId, isSavedForLater: false } });
  },

  setCoupon(cartId: string, couponId: string | null) {
    return prisma.cart.update({ where: { id: cartId }, data: { couponId } });
  },

  transferItems(fromCartId: string, toCartId: string, variantIds: string[]) {
    return prisma.cartItem.updateMany({
      where: { cartId: fromCartId, variantId: { in: variantIds } },
      data: { cartId: toCartId },
    });
  },

  deleteCart(id: string) {
    return prisma.cart.delete({ where: { id } });
  },

  deleteExpiredGuestCarts() {
    return prisma.cart.deleteMany({
      where: { userId: null, expiresAt: { lt: new Date() } },
    });
  },
};
