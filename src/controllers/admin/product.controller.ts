import { Request, Response } from 'express';
import { productService } from '../../services/product.service';
import { uploadService } from '../../services/upload.service';
import { stockMovementService } from '../../services/stockMovement.service';
import { ProductSort } from '../../repositories/product.repository';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { ProductStatus } from '@prisma/client';

export const adminProductController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const query = req.query as Record<string, unknown>;

    const { items, total } = await productService.list(
      {
        subCategoryId: typeof query.subCategoryId === 'string' ? query.subCategoryId : undefined,
        sportId: typeof query.sportId === 'string' ? query.sportId : undefined,
        status: typeof query.status === 'string' ? (query.status as ProductStatus) : undefined,
        search: typeof query.search === 'string' ? query.search : undefined,
        includeDeleted: query.includeDeleted === 'true',
      },
      (query.sort as ProductSort) ?? 'newest',
      skip,
      take,
    );

    res.json(
      ApiResponse.ok({ products: items }, 'Success', buildPaginationMeta(total, { page, limit })),
    );
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getByIdForAdmin(req.params.id);
    res.json(ApiResponse.ok({ product }));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.create(req.body);
    res.status(201).json(ApiResponse.created({ product }, 'Product created'));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.update(req.params.id, req.body);
    res.json(ApiResponse.ok({ product }, 'Product updated'));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await productService.softDelete(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Product deleted'));
  }),

  bulkAction: asyncHandler(async (req: Request, res: Response) => {
    const result = await productService.bulkAction(req.body.ids, req.body.action);
    res.json(ApiResponse.ok({ affected: result.count }, 'Bulk action completed'));
  }),

  addVariant: asyncHandler(async (req: Request, res: Response) => {
    const variant = await productService.addVariant(req.params.id, req.body);
    res.status(201).json(ApiResponse.created({ variant }, 'Variant added'));
  }),

  updateVariant: asyncHandler(async (req: Request, res: Response) => {
    const variant = await productService.updateVariant(req.params.id, req.body);
    res.json(ApiResponse.ok({ variant }, 'Variant updated'));
  }),

  deleteVariant: asyncHandler(async (req: Request, res: Response) => {
    await productService.deleteVariant(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Variant deleted'));
  }),

  attachImages: asyncHandler(async (req: Request, res: Response) => {
    const images = await productService.attachImages(req.params.id, req.body.images);
    res.status(201).json(ApiResponse.created({ images }, 'Images attached'));
  }),

  deleteImage: asyncHandler(async (req: Request, res: Response) => {
    await productService.deleteImage(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Image deleted'));
  }),

  reorderImages: asyncHandler(async (req: Request, res: Response) => {
    const images = await productService.reorderImages(req.body.items);
    res.json(ApiResponse.ok({ images }, 'Images reordered'));
  }),

  stockHistory: asyncHandler(async (req: Request, res: Response) => {
    const movements = await stockMovementService.getProductHistory(req.params.id);
    res.json(ApiResponse.ok({ movements }));
  }),

  uploadSignature: asyncHandler(async (req: Request, res: Response) => {
    const signature = await uploadService.getSignature(req.body.folder, req.body.contentType);
    res.json(ApiResponse.ok(signature));
  }),
};
