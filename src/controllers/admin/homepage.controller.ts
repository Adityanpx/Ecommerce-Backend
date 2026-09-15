import { Request, Response } from 'express';
import { homepageService } from '../../services/homepage.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export const adminHomepageController = {
  // ---------- Announcements ----------

  listAnnouncements: asyncHandler(async (_req: Request, res: Response) => {
    const items = await homepageService.listAnnouncements(false);
    res.json(ApiResponse.ok({ announcements: items }));
  }),

  createAnnouncement: asyncHandler(async (req: Request, res: Response) => {
    const item = await homepageService.createAnnouncement(req.body);
    res.status(201).json(ApiResponse.created({ announcement: item }, 'Announcement created'));
  }),

  updateAnnouncement: asyncHandler(async (req: Request, res: Response) => {
    const item = await homepageService.updateAnnouncement(req.params.id, req.body);
    res.json(ApiResponse.ok({ announcement: item }, 'Announcement updated'));
  }),

  deleteAnnouncement: asyncHandler(async (req: Request, res: Response) => {
    await homepageService.deleteAnnouncement(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Announcement deleted'));
  }),

  // ---------- Trust Badges ----------

  listTrustBadges: asyncHandler(async (_req: Request, res: Response) => {
    const items = await homepageService.listTrustBadges(false);
    res.json(ApiResponse.ok({ trustBadges: items }));
  }),

  createTrustBadge: asyncHandler(async (req: Request, res: Response) => {
    const item = await homepageService.createTrustBadge(req.body);
    res.status(201).json(ApiResponse.created({ trustBadge: item }, 'Trust badge created'));
  }),

  updateTrustBadge: asyncHandler(async (req: Request, res: Response) => {
    const item = await homepageService.updateTrustBadge(req.params.id, req.body);
    res.json(ApiResponse.ok({ trustBadge: item }, 'Trust badge updated'));
  }),

  deleteTrustBadge: asyncHandler(async (req: Request, res: Response) => {
    await homepageService.deleteTrustBadge(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Trust badge deleted'));
  }),

  // ---------- Testimonials ----------

  listTestimonials: asyncHandler(async (req: Request, res: Response) => {
    const sportId = typeof req.query.sportId === 'string' ? req.query.sportId : undefined;
    const items = await homepageService.listTestimonials(false, sportId);
    res.json(ApiResponse.ok({ testimonials: items }));
  }),

  createTestimonial: asyncHandler(async (req: Request, res: Response) => {
    const item = await homepageService.createTestimonial(req.body);
    res.status(201).json(ApiResponse.created({ testimonial: item }, 'Testimonial created'));
  }),

  updateTestimonial: asyncHandler(async (req: Request, res: Response) => {
    const item = await homepageService.updateTestimonial(req.params.id, req.body);
    res.json(ApiResponse.ok({ testimonial: item }, 'Testimonial updated'));
  }),

  deleteTestimonial: asyncHandler(async (req: Request, res: Response) => {
    await homepageService.deleteTestimonial(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Testimonial deleted'));
  }),

  // ---------- Collections ----------

  listCollections: asyncHandler(async (req: Request, res: Response) => {
    const sportId = typeof req.query.sportId === 'string' ? req.query.sportId : undefined;
    const items = await homepageService.listCollections(false, sportId);
    res.json(ApiResponse.ok({ collections: items }));
  }),

  getCollection: asyncHandler(async (req: Request, res: Response) => {
    const collection = await homepageService.getCollection(req.params.id);
    res.json(ApiResponse.ok({ collection }));
  }),

  createCollection: asyncHandler(async (req: Request, res: Response) => {
    const collection = await homepageService.createCollection(req.body);
    res.status(201).json(ApiResponse.created({ collection }, 'Collection created'));
  }),

  updateCollection: asyncHandler(async (req: Request, res: Response) => {
    const collection = await homepageService.updateCollection(req.params.id, req.body);
    res.json(ApiResponse.ok({ collection }, 'Collection updated'));
  }),

  deleteCollection: asyncHandler(async (req: Request, res: Response) => {
    await homepageService.deleteCollection(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Collection deleted'));
  }),

  setCollectionProducts: asyncHandler(async (req: Request, res: Response) => {
    const collection = await homepageService.setCollectionProducts(
      req.params.id,
      req.body.productIds,
    );
    res.json(ApiResponse.ok({ collection }, 'Products updated'));
  }),

  // ---------- Featured Spotlights ----------

  listSpotlights: asyncHandler(async (_req: Request, res: Response) => {
    const items = await homepageService.listSpotlights(false);
    res.json(ApiResponse.ok({ spotlights: items }));
  }),

  upsertSpotlight: asyncHandler(async (req: Request, res: Response) => {
    const spotlight = await homepageService.upsertSpotlight(req.body);
    res.json(ApiResponse.ok({ spotlight }, 'Spotlight saved'));
  }),

  deleteSpotlight: asyncHandler(async (req: Request, res: Response) => {
    // key is passed as :id param but it's actually the unique key
    await homepageService.deleteSpotlight(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Spotlight deleted'));
  }),
};
