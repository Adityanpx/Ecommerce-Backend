import { z } from 'zod';

const uuid = z.string().uuid('Invalid id');

const couponBody = z
  .object({
    code: z
      .string()
      .min(3, 'Code must be at least 3 characters')
      .max(50)
      .regex(/^[A-Za-z0-9_-]+$/, 'Code may contain only letters, numbers, hyphens and underscores')
      .toUpperCase(),
    description: z.string().max(255).nullable().optional(),
    discountType: z.enum(['PERCENTAGE', 'FLAT']),
    discountValue: z.coerce.number().positive('Discount value must be greater than 0'),
    minCartValue: z.coerce.number().min(0).default(0),
    maxDiscountAmount: z.coerce.number().positive().nullable().optional(),
    scope: z.enum(['ALL', 'CATEGORY', 'PRODUCT']).default('ALL'),
    scopeIds: z.array(uuid).default([]),
    usageLimitTotal: z.coerce.number().int().positive().nullable().optional(),
    usageLimitPerUser: z.coerce.number().int().positive().default(1),
    validFrom: z.coerce.date(),
    validTo: z.coerce.date(),
    isActive: z.boolean().default(true),
  })
  .refine((d) => d.validTo > d.validFrom, {
    message: 'validTo must be after validFrom',
    path: ['validTo'],
  })
  .refine((d) => d.discountType !== 'PERCENTAGE' || d.discountValue <= 100, {
    message: 'A percentage discount cannot exceed 100',
    path: ['discountValue'],
  })
  .refine((d) => d.scope === 'ALL' || d.scopeIds.length > 0, {
    message: 'scopeIds is required when scope is CATEGORY or PRODUCT',
    path: ['scopeIds'],
  });

export const createCouponSchema = z.object({ body: couponBody });

export const updateCouponSchema = z.object({
  params: z.object({ id: uuid }),
  body: couponBody.innerType().innerType().innerType().partial(),
});
