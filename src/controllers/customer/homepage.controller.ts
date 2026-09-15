import { Request, Response } from 'express';
import { homepageService } from '../../services/homepage.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export const homepageController = {
  announcements: asyncHandler(async (_req: Request, res: Response) => {
    const items = await homepageService.listAnnouncements(true);
    res.json(ApiResponse.ok({ announcements: items }));
  }),

  trustBadges: asyncHandler(async (_req: Request, res: Response) => {
    const items = await homepageService.listTrustBadges(true);
    res.json(ApiResponse.ok({ trustBadges: items }));
  }),

  testimonials: asyncHandler(async (req: Request, res: Response) => {
    const sportId = typeof req.query.sportId === 'string' ? req.query.sportId : undefined;
    const items = await homepageService.listTestimonials(true, sportId);
    res.json(ApiResponse.ok({ testimonials: items }));
  }),

  collections: asyncHandler(async (req: Request, res: Response) => {
    const sportId = typeof req.query.sportId === 'string' ? req.query.sportId : undefined;
    const items = await homepageService.listCollections(true, sportId);
    res.json(ApiResponse.ok({ collections: items }));
  }),

  collectionBySlug: asyncHandler(async (req: Request, res: Response) => {
    const collection = await homepageService.getCollectionBySlug(req.params.slug);
    res.json(ApiResponse.ok({ collection }));
  }),

  spotlight: asyncHandler(async (req: Request, res: Response) => {
    const spotlight = await homepageService.getSpotlight(req.params.key);
    // Return null (not 404) so the storefront can gracefully hide the section
    res.json(ApiResponse.ok({ spotlight: spotlight ?? null }));
  }),
};
