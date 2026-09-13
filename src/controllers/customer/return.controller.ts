import { Request, Response } from 'express';
import { returnService } from '../../services/return.service';
import { uploadService } from '../../services/upload.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

export const returnController = {
  // Locked to the 'returns' folder — customers cannot obtain a signature for
  // any other folder, and 'returns' always resolves to the private bucket.
  uploadSignature: asyncHandler(async (req: Request, res: Response) => {
    const signature = await uploadService.getSignature('returns', req.body.contentType);
    res.json(ApiResponse.ok(signature));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const record = await returnService.create(req.user!.id, req.body);
    res.status(201).json(ApiResponse.created({ return: record }, 'Return request submitted'));
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const { items, total } = await returnService.list({ userId: req.user!.id }, skip, take);
    res.json(
      ApiResponse.ok({ returns: items }, 'Success', buildPaginationMeta(total, { page, limit })),
    );
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const record = await returnService.getById(req.params.id, req.user!.id);
    res.json(ApiResponse.ok({ return: record }));
  }),
};
