import { Request, Response } from 'express';
import { contentService } from '../../services/content.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export const contentController = {
  banners: asyncHandler(async (_req: Request, res: Response) => {
    const banners = await contentService.listActiveBanners();
    res.json(ApiResponse.ok({ banners }));
  }),

  announcement: asyncHandler(async (_req: Request, res: Response) => {
    const announcement = await contentService.announcement();
    res.json(ApiResponse.ok({ announcement }));
  }),

  page: asyncHandler(async (req: Request, res: Response) => {
    const page = await contentService.getPage(req.params.slug);
    res.json(ApiResponse.ok({ page }));
  }),

  contact: asyncHandler(async (req: Request, res: Response) => {
    const result = await contentService.submitContactForm(req.body);
    res.status(201).json(ApiResponse.created(result, 'Your message has been sent'));
  }),
};
