import { z } from 'zod';

const uuid = z.string().uuid('Invalid id');

export const createBrandSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(120),
    logoUrl: z.string().url().nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateBrandSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    logoUrl: z.string().url().nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});
