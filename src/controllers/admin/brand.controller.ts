import { Request, Response } from 'express';
import { brandService } from '../../services/brand.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export const adminBrandController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const brands = await brandService.list();
    res.json(ApiResponse.ok({ brands }));
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const brand = await brandService.getById(req.params.id);
    res.json(ApiResponse.ok({ brand }));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const brand = await brandService.create(req.body);
    res.status(201).json(ApiResponse.created({ brand }, 'Brand created'));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const brand = await brandService.update(req.params.id, req.body);
    res.json(ApiResponse.ok({ brand }, 'Brand updated'));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await brandService.delete(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Brand deleted'));
  }),
};
