import { z } from 'zod';
import { CATALOG } from '../config/constants';

/**
 * Only the absolute ceiling is checked here. The real per-product limit
 * (product.maxOrderQuantity, default CART.MAX_QUANTITY_PER_ITEM = 10) is
 * enforced in cartService, across all sizes of the product.
 */
const MAX = CATALOG.MAX_ORDER_QUANTITY_CEILING;

const uuid = z.string().uuid('Invalid id');

export const addToCartSchema = z.object({
  body: z.object({
    variantId: uuid,
    quantity: z.coerce
      .number()
      .int()
      .min(1, 'Quantity must be at least 1')
      .max(MAX, `Maximum ${MAX} per item`)
      .default(1),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    quantity: z.coerce.number().int().min(1).max(MAX),
  }),
});

export const applyCouponSchema = z.object({
  body: z.object({
    code: z.string().min(1, 'Coupon code is required').max(50).toUpperCase(),
  }),
});

export const mergeCartSchema = z.object({
  body: z.object({
    guestToken: z.string().min(1, 'guestToken is required'),
  }),
});
