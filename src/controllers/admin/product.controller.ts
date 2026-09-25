import { Request, Response } from 'express';
import { ProductStatus } from '@prisma/client';
import { productService } from '../../services/product.service';
import { productColorService } from '../../services/productColor.service';
import { productQuality } from '../../services/productQuality';
import { uploadService } from '../../services/upload.service';
import { stockMovementService } from '../../services/stockMovement.service';
import {
  ProductListFilters,
  ProductSort,
  StockStatusFilter,
} from '../../repositories/product.repository';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { CATALOG } from '../../config/constants';

const ADMIN_SORTS: ProductSort[] = [
  'newest',
  'updated',
  'price_asc',
  'price_desc',
  'popularity',
  'name_asc',
];
const STOCK_STATUSES: StockStatusFilter[] = ['IN', 'LOW', 'OUT'];

const str = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);
const num = (v: unknown) => {
  const n = Number(v);
  return str(v) !== undefined && Number.isFinite(n) ? n : undefined;
};

/**
 * GET /admin/products query → filters.
 *   search, sportId, subCategoryId, status, includeDeleted          (existing)
 *   brandId, tag (comma list), stockStatus=IN|LOW|OUT,
 *   minPrice, maxPrice, issue=<ISSUE_CODE>, hasIssues=true, sort     (new)
 */
function parseAdminFilters(query: Record<string, unknown>): ProductListFilters {
  const extraWhere = [];
  const issue = str(query.issue);
  if (issue) {
    const where = productQuality.whereFor(issue);
    if (where) extraWhere.push(where);
  }
  if (query.hasIssues === 'true') extraWhere.push(productQuality.whereHasIssues());

  const stockStatus = str(query.stockStatus) as StockStatusFilter | undefined;

  return {
    subCategoryId: str(query.subCategoryId),
    sportId: str(query.sportId),
    status: str(query.status) as ProductStatus | undefined,
    search: str(query.search),
    includeDeleted: query.includeDeleted === 'true',
    brandId: str(query.brandId),
    tags: str(query.tag)
      ?.split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    stockStatus: stockStatus && STOCK_STATUSES.includes(stockStatus) ? stockStatus : undefined,
    minPrice: num(query.minPrice),
    maxPrice: num(query.maxPrice),
    extraWhere,
  };
}

export const adminProductController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const query = req.query as Record<string, unknown>;
    const sort = ADMIN_SORTS.includes(query.sort as ProductSort)
      ? (query.sort as ProductSort)
      : 'newest';

    const { items, total } = await productService.listForAdmin(
      parseAdminFilters(query),
      sort,
      skip,
      take,
    );

    res.json(
      ApiResponse.ok({ products: items }, 'Success', buildPaginationMeta(total, { page, limit })),
    );
  }),

  /** Everything the product form needs besides the product itself. */
  meta: asyncHandler(async (_req: Request, res: Response) => {
    const { tagsInUse } = await productService.formMeta();
    res.json(
      ApiResponse.ok({
        tagSuggestions: CATALOG.TAG_SUGGESTIONS,
        tagsInUse,
        issues: productQuality.catalog(),
        stockReasons: ['RESTOCK', 'DAMAGED', 'CORRECTION', 'MANUAL_ADJUSTMENT'],
        limits: {
          maxColors: CATALOG.MAX_COLORS_PER_PRODUCT,
          maxTags: CATALOG.MAX_TAGS,
          maxOrderQuantityCeiling: CATALOG.MAX_ORDER_QUANTITY_CEILING,
        },
      }),
    );
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getByIdForAdmin(req.params.id);
    res.json(ApiResponse.ok({ product }));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.create(req.body, req.admin?.id);
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

  bulkEdit: asyncHandler(async (req: Request, res: Response) => {
    const result = await productService.bulkEdit(req.body.ids, req.body.changes);
    const message =
      result.skipped.length > 0
        ? `${result.updated} updated, ${result.skipped.length} skipped`
        : `${result.updated} updated`;
    res.json(ApiResponse.ok(result, message));
  }),

  duplicate: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.duplicate(req.params.id, req.body, req.admin?.id);
    res.status(201).json(ApiResponse.created({ product }, 'Product duplicated as a draft'));
  }),

  setRelations: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.setRelations(
      req.params.id,
      req.body.related,
      req.body.boughtTogether,
    );
    res.json(ApiResponse.ok({ product }, 'Related products saved'));
  }),

  // ---------- Colours ----------

  addColor: asyncHandler(async (req: Request, res: Response) => {
    const color = await productColorService.create(req.params.id, req.body, req.admin?.id);
    res.status(201).json(ApiResponse.created({ color }, 'Colour added'));
  }),

  updateColor: asyncHandler(async (req: Request, res: Response) => {
    const color = await productColorService.update(req.params.id, req.body);
    res.json(ApiResponse.ok({ color }, 'Colour updated'));
  }),

  deleteColor: asyncHandler(async (req: Request, res: Response) => {
    await productColorService.remove(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Colour deleted'));
  }),

  reorderColors: asyncHandler(async (req: Request, res: Response) => {
    const colors = await productColorService.reorder(req.params.id, req.body.items);
    res.json(ApiResponse.ok({ colors }, 'Colours reordered'));
  }),

  // ---------- Variants ----------

  addVariant: asyncHandler(async (req: Request, res: Response) => {
    const variant = await productService.addVariant(req.params.id, req.body, req.admin?.id);
    res.status(201).json(ApiResponse.created({ variant }, 'Variant added'));
  }),

  addVariants: asyncHandler(async (req: Request, res: Response) => {
    const variants = await productService.addVariants(
      req.params.id,
      req.body.colorId ?? null,
      req.body.sizes,
      req.admin?.id,
    );
    res.status(201).json(ApiResponse.created({ variants }, `${variants.length} size(s) added`));
  }),

  updateVariant: asyncHandler(async (req: Request, res: Response) => {
    const variant = await productService.updateVariant(req.params.id, req.body, req.admin?.id);
    res.json(ApiResponse.ok({ variant }, 'Variant updated'));
  }),

  deleteVariant: asyncHandler(async (req: Request, res: Response) => {
    await productService.deleteVariant(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Variant deleted'));
  }),

  // ---------- Stock ----------

  adjustStock: asyncHandler(async (req: Request, res: Response) => {
    const variant = await productService.adjustStock(req.params.id, req.body, req.admin?.id);
    res.json(ApiResponse.ok({ variant }, 'Stock updated'));
  }),

  updateStockGrid: asyncHandler(async (req: Request, res: Response) => {
    const variants = await productService.updateStockGrid(
      req.params.id,
      req.body.items,
      req.body.reason,
      req.body.note,
      req.admin?.id,
    );
    res.json(ApiResponse.ok({ variants }, 'Stock saved'));
  }),

  stockHistory: asyncHandler(async (req: Request, res: Response) => {
    const movements = await stockMovementService.getProductHistory(req.params.id);
    res.json(ApiResponse.ok({ movements }));
  }),

  variantStockHistory: asyncHandler(async (req: Request, res: Response) => {
    const movements = await stockMovementService.getHistory(req.params.id);
    res.json(ApiResponse.ok({ movements }));
  }),

  // ---------- Images ----------

  attachImages: asyncHandler(async (req: Request, res: Response) => {
    const images = await productService.attachImages(req.params.id, req.body.images);
    res.status(201).json(ApiResponse.created({ images }, 'Images attached'));
  }),

  updateImage: asyncHandler(async (req: Request, res: Response) => {
    const image = await productService.updateImage(req.params.id, req.body);
    res.json(ApiResponse.ok({ image }, 'Image updated'));
  }),

  deleteImage: asyncHandler(async (req: Request, res: Response) => {
    await productService.deleteImage(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Image deleted'));
  }),

  reorderImages: asyncHandler(async (req: Request, res: Response) => {
    const images = await productService.reorderImages(req.body.items);
    res.json(ApiResponse.ok({ images }, 'Images reordered'));
  }),

  uploadSignature: asyncHandler(async (req: Request, res: Response) => {
    const signature = await uploadService.getSignature(
      req.body.folder,
      req.body.contentType,
      req.body.contentLength,
    );
    res.json(ApiResponse.ok(signature));
  }),
};
