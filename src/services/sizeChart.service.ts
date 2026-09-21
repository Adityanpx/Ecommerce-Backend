import { listChartDTOs } from '../config/sizeCharts';
import { resolveForProduct } from '../config/sizeCharts/resolver';
import { toDTO } from '../config/sizeCharts/types';
import { subCategoryRepository } from '../repositories/subCategory.repository';

/**
 * Size charts are a built-in library (src/config/sizeCharts), not database rows.
 * This service exposes the library and the "which chart fits this product?" answer.
 */
export const sizeChartService = {
  /** Every built-in chart, in library order. */
  list() {
    return listChartDTOs();
  },

  /**
   * Live preview for the product form: what would this product show right now?
   * Works on unsaved input, so the admin sees the chart change as they type a name
   * or pick a category.
   */
  async resolve(input: { name: string; subCategoryId?: string; sizeChartKey?: string | null }) {
    const subCategory = input.subCategoryId
      ? await subCategoryRepository.findByIdWithSport(input.subCategoryId)
      : null;

    const resolution = resolveForProduct({
      name: input.name,
      subCategoryName: subCategory?.name ?? null,
      sportName: subCategory?.sport.name ?? null,
      sizeChartKey: input.sizeChartKey,
    });

    return {
      chart: resolution.chart ? toDTO(resolution.chart) : null,
      source: resolution.source,
      reason: resolution.reason,
    };
  },
};
