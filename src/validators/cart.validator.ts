import { z } from 'zod';
import { CART } from '../config/constants';

const uuid = z.string().uuid('Invalid id');

export const addToCartSchema = z.object({
  body: z.object({
    variantId: uuid,
    quantity: z.coerce
      .number()
      .int()
      .min(1, 'Quantity must be at least 1')
      .max(CART.MAX_QUANTITY_PER_ITEM, `Maximum ${CART.MAX_QUANTITY_PER_ITEM} per item`)
      .default(1),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    quantity: z.coerce.number().int().min(1).max(CART.MAX_QUANTITY_PER_ITEM),
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
