import { Request, Response } from 'express';
import { sizeChartService } from '../../services/sizeChart.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export const adminSizeChartController = {
  getBySubCategory: asyncHandler(async (req: Request, res: Response) => {
    const chart = await sizeChartService.getBySubCategory(req.params.subCategoryId);
    res.json(ApiResponse.ok({ sizeChart: chart }));
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const chart = await sizeChartService.getById(req.params.id);
    res.json(ApiResponse.ok({ sizeChart: chart }));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const chart = await sizeChartService.create(req.body);
    res.status(201).json(ApiResponse.created({ sizeChart: chart }, 'Size chart created'));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const chart = await sizeChartService.update(req.params.id, req.body);
    res.json(ApiResponse.ok({ sizeChart: chart }, 'Size chart updated'));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await sizeChartService.delete(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Size chart deleted'));
  }),
};
