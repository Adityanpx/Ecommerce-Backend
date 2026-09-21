import { Request, Response } from 'express';
import { sizeChartService } from '../../services/sizeChart.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export const adminSizeChartController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(ApiResponse.ok({ charts: sizeChartService.list() }));
  }),

  resolve: asyncHandler(async (req: Request, res: Response) => {
    const { name, subCategoryId, sizeChartKey } = req.query as {
      name: string;
      subCategoryId?: string;
      sizeChartKey?: string;
    };
    const resolution = await sizeChartService.resolve({ name, subCategoryId, sizeChartKey });
    res.json(ApiResponse.ok({ resolution }));
  }),
};
