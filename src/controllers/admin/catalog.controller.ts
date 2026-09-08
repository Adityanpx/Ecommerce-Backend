import { Request, Response } from 'express';
import { catalogService } from '../../services/catalog.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export const adminCatalogController = {
  // ---------- Sports ----------

  listSports: asyncHandler(async (_req: Request, res: Response) => {
    const sports = await catalogService.listSports(false);
    res.json(ApiResponse.ok({ sports }));
  }),

  createSport: asyncHandler(async (req: Request, res: Response) => {
    const sport = await catalogService.createSport(req.body);
    res.status(201).json(ApiResponse.created({ sport }, 'Sport created'));
  }),

  updateSport: asyncHandler(async (req: Request, res: Response) => {
    const sport = await catalogService.updateSport(req.params.id, req.body);
    res.json(ApiResponse.ok({ sport }, 'Sport updated'));
  }),

  deleteSport: asyncHandler(async (req: Request, res: Response) => {
    await catalogService.deleteSport(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Sport deleted'));
  }),

  // ---------- Sub-categories ----------

  listSubCategories: asyncHandler(async (req: Request, res: Response) => {
    const sportId = typeof req.query.sportId === 'string' ? req.query.sportId : undefined;
    const subCategories = await catalogService.listSubCategories(sportId);
    res.json(ApiResponse.ok({ subCategories }));
  }),

  createSubCategory: asyncHandler(async (req: Request, res: Response) => {
    const subCategory = await catalogService.createSubCategory(req.body);
    res.status(201).json(ApiResponse.created({ subCategory }, 'Category created'));
  }),

  updateSubCategory: asyncHandler(async (req: Request, res: Response) => {
    const subCategory = await catalogService.updateSubCategory(req.params.id, req.body);
    res.json(ApiResponse.ok({ subCategory }, 'Category updated'));
  }),

  deleteSubCategory: asyncHandler(async (req: Request, res: Response) => {
    await catalogService.deleteSubCategory(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Category deleted'));
  }),

  // ---------- Attributes ----------

  listAttributes: asyncHandler(async (req: Request, res: Response) => {
    const subCategoryId = req.query.subCategoryId as string;
    const attributes = await catalogService.listAttributes(subCategoryId);
    res.json(ApiResponse.ok({ attributes }));
  }),

  createAttribute: asyncHandler(async (req: Request, res: Response) => {
    const attribute = await catalogService.createAttribute(req.body);
    res.status(201).json(ApiResponse.created({ attribute }, 'Attribute created'));
  }),

  updateAttribute: asyncHandler(async (req: Request, res: Response) => {
    const attribute = await catalogService.updateAttribute(req.params.id, req.body);
    res.json(ApiResponse.ok({ attribute }, 'Attribute updated'));
  }),

  deleteAttribute: asyncHandler(async (req: Request, res: Response) => {
    await catalogService.deleteAttribute(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Attribute deleted'));
  }),

  reorderAttributes: asyncHandler(async (req: Request, res: Response) => {
    await catalogService.reorderAttributes(req.body.items);
    res.json(ApiResponse.ok({ reordered: true }, 'Order updated'));
  }),
};
