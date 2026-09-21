import { z } from 'zod';
import { isValidChartKey } from '../config/sizeCharts';

export const resolveSizeChartSchema = z.object({
  query: z.object({
    name: z.string().max(255).default(''),
    subCategoryId: z.string().uuid('Invalid id').optional(),
    sizeChartKey: z.string().max(60).refine(isValidChartKey, 'Unknown size chart').optional(),
  }),
});
