import { z } from 'zod';

const uuid = z.string().uuid('Invalid id');

export const wishlistItemSchema = z.object({
  body: z.object({
    productId: uuid,
  }),
});

export const wishlistBatchCheckSchema = z.object({
  body: z.object({
    productIds: z.array(uuid).min(1).max(50),
  }),
});
