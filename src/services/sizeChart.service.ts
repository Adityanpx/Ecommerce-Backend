import { sizeChartRepository } from '../repositories/sizeChart.repository';
import { subCategoryRepository } from '../repositories/subCategory.repository';
import { ApiError } from '../utils/ApiError';

export const sizeChartService = {
  async getBySubCategory(subCategoryId: string) {
    return sizeChartRepository.findBySubCategory(subCategoryId);
  },

  async getById(id: string) {
    const chart = await sizeChartRepository.findById(id);
    if (!chart) throw ApiError.notFound('Size chart not found');
    return chart;
  },

  async create(input: {
    subCategoryId: string;
    title: string;
    columns: string[];
    entries: { sizeLabel: string; values: (string | number)[]; sortOrder: number }[];
  }) {
    const subCategory = await subCategoryRepository.findById(input.subCategoryId);
    if (!subCategory) throw ApiError.badRequest('Sub-category does not exist');

    // Check if a chart already exists for this subcategory
    const existing = await sizeChartRepository.findBySubCategory(input.subCategoryId);
    if (existing) {
      throw ApiError.conflict(
        `A size chart already exists for "${subCategory.name}". Update it instead.`,
      );
    }

    // Validate: each entry's values array length must match columns length
    for (const entry of input.entries) {
      if (entry.values.length !== input.columns.length) {
        throw ApiError.validation('Size chart validation failed', [
          {
            field: `entries.${entry.sizeLabel}`,
            message: `Values count (${entry.values.length}) must match columns count (${input.columns.length})`,
          },
        ]);
      }
    }

    return sizeChartRepository.create(input);
  },

  async update(
    id: string,
    input: {
      title?: string;
      columns?: string[];
      entries?: { sizeLabel: string; values: (string | number)[]; sortOrder: number }[];
    },
  ) {
    const existing = await sizeChartRepository.findById(id);
    if (!existing) throw ApiError.notFound('Size chart not found');

    // Validate columns/values alignment if both are provided
    const columns = input.columns ?? (existing.columns as string[]);
    if (input.entries) {
      for (const entry of input.entries) {
        if (entry.values.length !== columns.length) {
          throw ApiError.validation('Size chart validation failed', [
            {
              field: `entries.${entry.sizeLabel}`,
              message: `Values count (${entry.values.length}) must match columns count (${columns.length})`,
            },
          ]);
        }
      }
    }

    return sizeChartRepository.update(id, input);
  },

  async delete(id: string) {
    const existing = await sizeChartRepository.findById(id);
    if (!existing) throw ApiError.notFound('Size chart not found');
    return sizeChartRepository.delete(id);
  },
};
