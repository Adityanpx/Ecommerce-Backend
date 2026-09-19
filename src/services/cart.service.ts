import { addDays } from 'date-fns';
import { cartRepository, CartWithItems } from '../repositories/cart.repository';
import { variantRepository } from '../repositories/variant.repository';
import { pricingService, variantLabel, PriceBreakdown } from './pricing.service';
import { couponService } from './coupon.service';
import { ApiError } from '../utils/ApiError';
import { generateGuestToken } from '../utils/generators';
import { CART } from '../config/constants';
import { logger } from '../utils/logger';

export interface CartOwner {
  userId?: string;
  guestToken?: string;
}

export interface CartResponse {
  cartId: string;
  guestToken?: string;
  couponCode: string | null;
  savedItems: {
    id: string;
    variantId: string;
    productName: string;
    productSlug: string;
    subCategorySlug: string;
    sportSlug: string;
    variantLabel: string;
    imageUrl: string | null;
    unitPrice: number;
    inStock: boolean;
  }[];
  pricing: PriceBreakdown;
}

export const cartService = {
  /** Finds the caller's cart, creating one if needed. */
  async resolveCart(owner: CartOwner): Promise<{ cart: CartWithItems; guestToken?: string }> {
    if (owner.userId) {
      const existing = await cartRepository.findByUser(owner.userId);
      if (existing) return { cart: existing };
      return { cart: await cartRepository.createForUser(owner.userId) };
    }

    if (owner.guestToken) {
      const existing = await cartRepository.findByGuestToken(owner.guestToken);
      if (existing) return { cart: existing, guestToken: owner.guestToken };
    }

    const token = generateGuestToken();
    const cart = await cartRepository.createForGuest(
      token,
      addDays(new Date(), CART.GUEST_CART_EXPIRY_DAYS),
    );
    return { cart, guestToken: token };
  },

  async buildResponse(cart: CartWithItems, guestToken?: string): Promise<CartResponse> {
    const settings = await import('./settings.service').then((m) => m.settingsService.getAll());
    const lines = pricingService.buildLines(cart, settings);

    let discountAmount = 0;
    let couponCode: string | null = null;

    if (cart.coupon) {
      try {
        const evaluation = await couponService.evaluate(
          cart.coupon.code,
          lines,
          cart.userId ?? null,
        );
        discountAmount = evaluation.discountAmount;
        couponCode = cart.coupon.code;
      } catch {
        // Coupon became invalid since it was applied (expired, limit reached,
        // cart changed). Silently drop it rather than blocking the cart.
        await cartRepository.setCoupon(cart.id, null);
      }
    }

    const savedItems = cart.items
      .filter((item) => item.isSavedForLater)
      .map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        productSlug: item.variant.product.slug,
        subCategorySlug: item.variant.product.subCategory.slug,
        sportSlug: item.variant.product.subCategory.sport.slug,
        variantLabel: variantLabel(item.variant.size, item.variant.color),
        imageUrl: item.variant.imageUrl ?? item.variant.product.images[0]?.url ?? null,
        unitPrice: Number(item.variant.priceOverride ?? item.variant.product.sellingPrice),
        inStock: item.variant.stock > 0 && item.variant.isActive,
      }));

    return {
      cartId: cart.id,
      guestToken,
      couponCode,
      savedItems,
      pricing: pricingService.compose(lines, discountAmount, settings),
    };
  },

  async get(owner: CartOwner): Promise<CartResponse> {
    const { cart, guestToken } = await this.resolveCart(owner);
    return this.buildResponse(cart, guestToken);
  },

  async addItem(owner: CartOwner, variantId: string, quantity: number): Promise<CartResponse> {
    const variant = await variantRepository.findById(variantId);

    if (!variant || !variant.isActive) throw ApiError.notFound('This item is not available');
    if (variant.product.deletedAt || variant.product.status !== 'ACTIVE') {
      throw ApiError.badRequest('This product is not available for purchase');
    }

    const { cart, guestToken } = await this.resolveCart(owner);

    const existingItem = cart.items.find((i) => i.variantId === variantId && !i.isSavedForLater);
    const requested = (existingItem?.quantity ?? 0) + quantity;

    if (requested > CART.MAX_QUANTITY_PER_ITEM) {
      throw ApiError.badRequest(`You can order at most ${CART.MAX_QUANTITY_PER_ITEM} of this item`);
    }

    if (variant.stock < requested) {
      throw ApiError.conflict(
        variant.stock === 0 ? 'This item is out of stock' : `Only ${variant.stock} left in stock`,
      );
    }

    await cartRepository.upsertItem(cart.id, variantId, requested);

    const updated = await cartRepository.findById(cart.id);
    return this.buildResponse(updated!, guestToken);
  },

  async updateItemQuantity(
    owner: CartOwner,
    itemId: string,
    quantity: number,
  ): Promise<CartResponse> {
    const item = await cartRepository.findItem(itemId);
    if (!item) throw ApiError.notFound('Cart item not found');

    await this.assertOwnership(item.cart, owner);

    if (item.variant.stock < quantity) {
      throw ApiError.conflict(`Only ${item.variant.stock} left in stock`);
    }

    await cartRepository.updateItem(itemId, { quantity });

    const updated = await cartRepository.findById(item.cartId);
    return this.buildResponse(updated!, owner.guestToken);
  },

  async removeItem(owner: CartOwner, itemId: string): Promise<CartResponse> {
    const item = await cartRepository.findItem(itemId);
    if (!item) throw ApiError.notFound('Cart item not found');

    await this.assertOwnership(item.cart, owner);
    await cartRepository.deleteItem(itemId);

    const updated = await cartRepository.findById(item.cartId);
    return this.buildResponse(updated!, owner.guestToken);
  },

  async toggleSaveForLater(
    owner: CartOwner,
    itemId: string,
    saved: boolean,
  ): Promise<CartResponse> {
    const item = await cartRepository.findItem(itemId);
    if (!item) throw ApiError.notFound('Cart item not found');

    await this.assertOwnership(item.cart, owner);

    if (!saved && item.variant.stock < item.quantity) {
      throw ApiError.conflict('This item is no longer available in that quantity');
    }

    await cartRepository.updateItem(itemId, { isSavedForLater: saved });

    const updated = await cartRepository.findById(item.cartId);
    return this.buildResponse(updated!, owner.guestToken);
  },

  async applyCoupon(owner: CartOwner, code: string): Promise<CartResponse> {
    const { cart, guestToken } = await this.resolveCart(owner);

    const settings = await import('./settings.service').then((m) => m.settingsService.getAll());
    const lines = pricingService.buildLines(cart, settings);

    if (lines.length === 0) throw ApiError.badRequest('Your cart is empty');

    // Throws with a specific reason if the coupon is not usable.
    const { coupon } = await couponService.evaluate(code, lines, cart.userId ?? null);

    await cartRepository.setCoupon(cart.id, coupon.id);

    const updated = await cartRepository.findById(cart.id);
    return this.buildResponse(updated!, guestToken);
  },

  async removeCoupon(owner: CartOwner): Promise<CartResponse> {
    const { cart, guestToken } = await this.resolveCart(owner);
    await cartRepository.setCoupon(cart.id, null);

    const updated = await cartRepository.findById(cart.id);
    return this.buildResponse(updated!, guestToken);
  },

  async clear(owner: CartOwner): Promise<CartResponse> {
    const { cart, guestToken } = await this.resolveCart(owner);
    await cartRepository.clearItems(cart.id);
    await cartRepository.setCoupon(cart.id, null);

    const updated = await cartRepository.findById(cart.id);
    return this.buildResponse(updated!, guestToken);
  },

  /**
   * Called immediately after login. Guest quantities are ADDED to server
   * quantities, capped at available stock. Items already in the server cart
   * are never lost.
   */
  async merge(userId: string, guestToken: string): Promise<CartResponse> {
    const guestCart = await cartRepository.findByGuestToken(guestToken);

    if (!guestCart || guestCart.items.length === 0) {
      const { cart } = await this.resolveCart({ userId });
      return this.buildResponse(cart);
    }

    const { cart: userCart } = await this.resolveCart({ userId });
    const userItemsByVariant = new Map(userCart.items.map((i) => [i.variantId, i]));

    const skipped: string[] = [];

    for (const guestItem of guestCart.items) {
      const variant = await variantRepository.findById(guestItem.variantId);

      if (!variant || !variant.isActive || variant.stock === 0) {
        skipped.push(guestItem.variantId);
        continue;
      }

      const existing = userItemsByVariant.get(guestItem.variantId);
      const combined = (existing?.quantity ?? 0) + guestItem.quantity;
      const capped = Math.min(combined, variant.stock, CART.MAX_QUANTITY_PER_ITEM);

      await cartRepository.upsertItem(userCart.id, guestItem.variantId, capped);
    }

    // Carry the coupon over only if the user's cart has none.
    if (guestCart.couponId && !userCart.couponId) {
      await cartRepository.setCoupon(userCart.id, guestCart.couponId);
    }

    await cartRepository.deleteCart(guestCart.id);

    if (skipped.length > 0) {
      logger.info('Cart merge skipped unavailable items', { userId, count: skipped.length });
    }

    const updated = await cartRepository.findById(userCart.id);
    return this.buildResponse(updated!);
  },

  /** Prevents one guest from mutating another guest's cart by guessing an item id. */
  async assertOwnership(
    cart: { userId: string | null; guestToken: string | null },
    owner: CartOwner,
  ): Promise<void> {
    if (owner.userId && cart.userId === owner.userId) return;
    if (owner.guestToken && cart.guestToken === owner.guestToken) return;
    throw ApiError.forbidden('This cart does not belong to you');
  },
};
