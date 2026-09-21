import { Request, Response } from 'express';
import { promotionService } from '../../services/promotion.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

export const adminPromotionController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const { items, total } = await promotionService.listPaginated(skip, take, search || undefined);
    res.json(
      ApiResponse.ok({ promotions: items }, 'Success', buildPaginationMeta(total, { page, limit })),
    );
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const promotion = await promotionService.getById(req.params.id);
    res.json(ApiResponse.ok({ promotion }));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const promotion = await promotionService.create(req.body);
    res.status(201).json(ApiResponse.created({ promotion }, 'Promotion created'));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const promotion = await promotionService.update(req.params.id, req.body);
    res.json(ApiResponse.ok({ promotion }, 'Promotion updated'));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await promotionService.delete(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Promotion deleted'));
  }),
};
