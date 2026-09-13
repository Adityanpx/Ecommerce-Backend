import { z } from 'zod';

const uuid = z.string().uuid('Invalid id');

export const createReturnSchema = z.object({
  body: z.object({
    orderId: uuid,
    reason: z.enum(['WRONG_SIZE', 'DAMAGED', 'DEFECTIVE', 'NOT_AS_DESCRIBED', 'OTHER']),
    reasonNote: z.string().max(1000).optional(),
    // R2 object keys from the private bucket (e.g. "returns/172...-uuid.jpg"),
    // not URLs — the private bucket has no public URL to give out.
    images: z
      .array(z.string().min(1).startsWith('returns/', 'Must be a returns/ upload key'))
      .max(5)
      .default([]),
    items: z
      .array(z.object({ orderItemId: uuid, quantity: z.coerce.number().int().min(1) }))
      .min(1, 'Select at least one item to return'),
  }),
});

export const returnUploadSignatureSchema = z.object({
  body: z.object({
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  }),
});

export const updateReturnStatusSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'RECEIVED']),
    adminNote: z.string().max(1000).optional(),
  }),
});

export const processRefundSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    amount: z.coerce.number().positive().optional(),
  }),
});
