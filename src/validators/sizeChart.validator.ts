import { z } from 'zod';

const uuid = z.string().uuid('Invalid id');

const entryInput = z.object({
  sizeLabel: z.string().min(1).max(50),
  values: z.array(z.union([z.string(), z.number()])).min(1),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const createSizeChartSchema = z.object({
  body: z.object({
    subCategoryId: uuid,
    title: z.string().min(1, 'Title is required').max(150),
    columns: z.array(z.string().min(1)).min(1, 'At least one column is required'),
    entries: z.array(entryInput).min(1, 'At least one size entry is required'),
  }),
});

export const updateSizeChartSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    title: z.string().min(1).max(150).optional(),
    columns: z.array(z.string().min(1)).min(1).optional(),
    entries: z.array(entryInput).min(1).optional(),
  }),
});
