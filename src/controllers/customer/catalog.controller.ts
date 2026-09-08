import { Request, Response } from 'express';
import { catalogService } from '../../services/catalog.service';
import { productService } from '../../services/product.service';
import { subCategoryRepository } from '../../repositories/subCategory.repository';
import { sportRepository } from '../../repositories/sport.repository';
import { ProductSort } from '../../repositories/product.repository';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

const VALID_SORTS: ProductSort[] = ['price_asc', 'price_desc', 'newest', 'popularity', 'name_asc'];

function parseSort(value: unknown): ProductSort | undefined {
  return VALID_SORTS.includes(value as ProductSort) ? (value as ProductSort) : undefined;
}

export const catalogController = {
  listSports: asyncHandler(async (_req: Request, res: Response) => {
    const sports = await catalogService.listSports(true);
    res.json(ApiResponse.ok({ sports }));
  }),

  getSport: asyncHandler(async (req: Request, res: Response) => {
    const sport = await catalogService.getSportBySlug(req.params.slug, true);
    res.json(ApiResponse.ok({ sport }));
  }),

  getSubCategory: asyncHandler(async (req: Request, res: Response) => {
    const subCategory = await catalogService.getSubCategoryBySlug(req.params.slug, true);
    const filters = await productService.getFilterOptions(subCategory.id);
    res.json(ApiResponse.ok({ subCategory, filters }));
  }),

  listProducts: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const query = req.query as Record<string, unknown>;

    // Resolve slugs to ids so attribute definitions can be looked up.
    let subCategoryId: string | undefined;
    let sportId: string | undefined;

    if (typeof query.subCategory === 'string') {
      const sub = await subCategoryRepository.findBySlug(query.subCategory, true);
      if (sub) subCategoryId = sub.id;
    }

    if (typeof query.sport === 'string') {
      const sport = await sportRepository.findBySlug(query.sport, true);
      if (sport) sportId = sport.id;
    }

    const attributeFilters = await productService.parseAttributeFilters(subCategoryId, query);

    const { items, total } = await productService.list(
      {
        subCategoryId,
        sportId,
        status: 'ACTIVE',
        brands:
          typeof query.brand === 'string'
            ? query.brand
                .split(',')
                .map((b) => b.trim())
                .filter(Boolean)
            : undefined,
        minPrice: query.minPrice !== undefined ? Number(query.minPrice) : undefined,
        maxPrice: query.maxPrice !== undefined ? Number(query.maxPrice) : undefined,
        inStockOnly: query.inStock === 'true',
        attributeFilters,
      },
      parseSort(query.sort),
      skip,
      take,
    );

    res.json(
      ApiResponse.ok({ products: items }, 'Success', buildPaginationMeta(total, { page, limit })),
    );
  }),

  getProduct: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getBySlug(req.params.slug);
    res.json(ApiResponse.ok({ product }));
  }),

  getProductStock: asyncHandler(async (req: Request, res: Response) => {
    const variants = await productService.getStock(req.params.id);
    res.json(ApiResponse.ok({ variants }));
  }),

  search: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    if (q.length < 2) {
      res.json(
        ApiResponse.ok(
          { products: [], query: q },
          'Enter at least 2 characters to search',
          buildPaginationMeta(0, { page, limit }),
        ),
      );
      return;
    }

    const { items, total } = await productService.list(
      { search: q, status: 'ACTIVE' },
      parseSort(req.query.sort),
      skip,
      take,
    );

    res.json(
      ApiResponse.ok(
        { products: items, query: q },
        'Success',
        buildPaginationMeta(total, { page, limit }),
      ),
    );
  }),
};
