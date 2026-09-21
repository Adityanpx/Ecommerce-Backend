import { z } from 'zod';

const uuid = z.string().uuid('Invalid id');

const promotionBody = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  description: z.string().max(2000).nullable().optional(),
  discountType: z.enum(['PERCENTAGE', 'FLAT']),
  discountValue: z.coerce.number().positive('Discount value must be greater than 0'),
  scope: z.enum(['ALL', 'CATEGORY', 'PRODUCT']).default('ALL'),
  scopeIds: z.array(uuid).default([]),
  startsAt: z.string().datetime({ offset: true, message: 'startsAt must be an ISO date-time' }),
  endsAt: z.string().datetime({ offset: true, message: 'endsAt must be an ISO date-time' }),
  isActive: z.boolean().default(true),
});

export const createPromotionSchema = z.object({
  body: promotionBody
    .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
      message: 'endsAt must be after startsAt',
      path: ['endsAt'],
    })
    .refine((d) => d.discountType !== 'PERCENTAGE' || d.discountValue <= 100, {
      message: 'A percentage discount cannot exceed 100',
      path: ['discountValue'],
    })
    .refine((d) => d.scope === 'ALL' || d.scopeIds.length > 0, {
      message: 'scopeIds is required when scope is CATEGORY or PRODUCT',
      path: ['scopeIds'],
    }),
});

/**
 * Partial body with no defaults applied — an omitted field must stay omitted
 * so it is not overwritten. Cross-field rules run in the service against the
 * merged stored + incoming values.
 */
export const updatePromotionSchema = z.object({
  params: z.object({ id: uuid }),
  body: promotionBody.partial(),
});
