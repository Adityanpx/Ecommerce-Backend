import { AttributeType, CategoryAttribute, Prisma, Product, ProductStatus } from '@prisma/client';
import { prisma } from '../config/database';

type Client = Prisma.TransactionClient | typeof prisma;

export interface AttributeFilter {
  attribute: CategoryAttribute;
  /** Equality values for TEXT / DROPDOWN / MULTI_SELECT, or true/false for BOOLEAN. */
  values?: string[];
  min?: number;
  max?: number;
}

export type StockStatusFilter = 'IN' | 'LOW' | 'OUT';

export interface ProductListFilters {
  subCategoryId?: string;
  sportId?: string;
  brands?: string[];
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  search?: string;
  status?: Prisma.EnumProductStatusFilter | ProductStatus;
  includeDeleted?: boolean;
  attributeFilters?: AttributeFilter[];
  /** Product has ANY of these tags. */
  tags?: string[];
  /** Admin: stock health across the product's active variants. */
  stockStatus?: StockStatusFilter;
  /** Admin: extra where-clauses built by productQuality (missing-info filters). */
  extraWhere?: Prisma.ProductWhereInput[];
}

export type ProductSort =
  'price_asc' | 'price_desc' | 'newest' | 'popularity' | 'name_asc' | 'updated';

/** Photos ordered the same way everywhere: cover first, then by position. */
const imageOrder = [{ isPrimary: 'desc' as const }, { displayOrder: 'asc' as const }];

/** Storefront listing card: cover image, colour swatches, price inputs, stock. */
const listInclude = {
  images: { orderBy: imageOrder, take: 1 },
  variants: {
    where: { isActive: true },
    select: { id: true, stock: true, priceOverride: true, colorId: true },
  },
  colors: {
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' as const },
    select: {
      id: true,
      name: true,
      hex: true,
      secondaryHex: true,
      isDefault: true,
      mrp: true,
      sellingPrice: true,
      images: {
        orderBy: { displayOrder: 'asc' as const },
        take: 1,
        select: { url: true, altText: true },
      },
    },
  },
  subCategory: {
    select: {
      id: true,
      name: true,
      slug: true,
      sport: { select: { id: true, name: true, slug: true } },
    },
  },
} satisfies Prisma.ProductInclude;

/** Admin product list row: everything the table + missing-info badges need. */
const adminListInclude = {
  images: {
    orderBy: imageOrder,
    select: { id: true, url: true, altText: true, width: true, height: true, colorId: true },
  },
  variants: {
    select: {
      id: true,
      stock: true,
      lowStockThreshold: true,
      isActive: true,
      priceOverride: true,
      colorId: true,
    },
  },
  colors: {
    orderBy: { displayOrder: 'asc' as const },
    select: {
      id: true,
      name: true,
      hex: true,
      secondaryHex: true,
      isActive: true,
      isDefault: true,
      mrp: true,
      sellingPrice: true,
      _count: { select: { images: true } },
    },
  },
  brandRef: { select: { id: true, name: true } },
  subCategory: {
    select: {
      id: true,
      name: true,
      slug: true,
      sport: { select: { id: true, name: true, slug: true } },
    },
  },
} satisfies Prisma.ProductInclude;

const relatedCardSelect = {
  id: true,
  name: true,
  slug: true,
  brand: true,
  mrp: true,
  sellingPrice: true,
  status: true,
  deletedAt: true,
  images: { orderBy: imageOrder, take: 1, select: { url: true, altText: true } },
  variants: { where: { isActive: true }, select: { stock: true } },
  subCategory: { select: { slug: true, sport: { select: { slug: true } } } },
} satisfies Prisma.ProductSelect;

/** Storefront product page. Only sellable colours/sizes are returned. */
const detailInclude = {
  images: { orderBy: imageOrder },
  variants: {
    where: { isActive: true },
    orderBy: [{ size: 'asc' as const }, { color: 'asc' as const }],
  },
  colors: {
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' as const },
    include: { images: { orderBy: { displayOrder: 'asc' as const } } },
  },
  attributeValues: { include: { attribute: true } },
  subCategory: {
    include: { sport: { select: { id: true, name: true, slug: true } } },
  },
  relationsFrom: {
    orderBy: { displayOrder: 'asc' as const },
    include: { relatedProduct: { select: relatedCardSelect } },
  },
} satisfies Prisma.ProductInclude;

/** Admin edit screen: every colour/size (including hidden ones) and all relations. */
const adminDetailInclude = {
  images: { orderBy: imageOrder },
  variants: { orderBy: [{ size: 'asc' as const }, { color: 'asc' as const }] },
  colors: {
    orderBy: { displayOrder: 'asc' as const },
    include: {
      images: { orderBy: { displayOrder: 'asc' as const } },
      swatch: { select: { id: true, name: true, hex: true, secondaryHex: true } },
    },
  },
  attributeValues: { include: { attribute: true } },
  brandRef: { select: { id: true, name: true, slug: true, logoUrl: true } },
  subCategory: {
    include: { sport: { select: { id: true, name: true, slug: true } } },
  },
  relationsFrom: {
    orderBy: { displayOrder: 'asc' as const },
    include: { relatedProduct: { select: relatedCardSelect } },
  },
} satisfies Prisma.ProductInclude;

export type StorefrontListProduct = Prisma.ProductGetPayload<{ include: typeof listInclude }>;
export type AdminListProduct = Prisma.ProductGetPayload<{ include: typeof adminListInclude }>;
export type StorefrontProductDetail = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;
export type AdminProductDetail = Prisma.ProductGetPayload<{ include: typeof adminDetailInclude }>;
export type RelatedCard = Prisma.ProductGetPayload<{ select: typeof relatedCardSelect }>;

/**
 * Each attribute filter becomes its own `attributeValues: { some: {...} }` clause
 * inside an AND array — NOT merged into one `some`. A single `some` would mean
 * "one row satisfies all conditions", which is impossible across two different
 * attributes. Separate `some` clauses mean "a row exists for attribute A AND a
 * row exists for attribute B", which is what a filter panel actually means.
 */
function buildAttributeFilters(filters: AttributeFilter[]): Prisma.ProductWhereInput[] {
  return filters.map(({ attribute, values, min, max }) => {
    const base = { attributeId: attribute.id };

    switch (attribute.type) {
      case AttributeType.NUMBER: {
        const numberFilter: Prisma.DecimalNullableFilter = {};
        if (min !== undefined) numberFilter.gte = min;
        if (max !== undefined) numberFilter.lte = max;
        return {
          attributeValues: { some: { ...base, valueNumber: numberFilter } },
        };
      }

      case AttributeType.BOOLEAN: {
        const wanted = values?.[0] === 'true';
        return {
          attributeValues: { some: { ...base, valueBoolean: wanted } },
        };
      }

      case AttributeType.MULTI_SELECT: {
        // A product matches if its stored array contains ANY selected option.
        return {
          OR: (values ?? []).map((v) => ({
            attributeValues: {
              some: { ...base, valueJson: { array_contains: [v] } },
            },
          })),
        };
      }

      case AttributeType.TEXT:
      case AttributeType.DROPDOWN:
      default: {
        return {
          attributeValues: { some: { ...base, valueText: { in: values ?? [] } } },
        };
      }
    }
  });
}

function buildWhere(filters: ProductListFilters): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];

  if (!filters.includeDeleted) and.push({ deletedAt: null });
  if (filters.status !== undefined) and.push({ status: filters.status });
  if (filters.subCategoryId) and.push({ subCategoryId: filters.subCategoryId });
  if (filters.sportId) and.push({ subCategory: { sportId: filters.sportId } });
  if (filters.brands?.length) and.push({ brand: { in: filters.brands } });
  if (filters.brandId) and.push({ brandId: filters.brandId });
  if (filters.tags?.length) and.push({ tags: { hasSome: filters.tags } });

  if (filters.stockStatus === 'OUT') {
    and.push({ variants: { none: { isActive: true, stock: { gt: 0 } } } });
  } else if (filters.stockStatus === 'LOW') {
    // stock <= that variant's own threshold — a column-to-column comparison.
    and.push({
      variants: {
        some: {
          isActive: true,
          stock: { gt: 0, lte: prisma.productVariant.fields.lowStockThreshold },
        },
      },
    });
  } else if (filters.stockStatus === 'IN') {
    and.push({ variants: { some: { isActive: true, stock: { gt: 0 } } } });
  }

  if (filters.extraWhere?.length) and.push(...filters.extraWhere);

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const price: Prisma.DecimalFilter = {};
    if (filters.minPrice !== undefined) price.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) price.lte = filters.maxPrice;
    and.push({ sellingPrice: price });
  }

  if (filters.inStockOnly) {
    and.push({ variants: { some: { stock: { gt: 0 }, isActive: true } } });
  }

  if (filters.search) {
    const lower = filters.search.toLowerCase();
    and.push({
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        // Admin-entered synonyms / model codes, stored lower-case (see productService).
        { searchKeywords: { has: lower } },
        { variants: { some: { sku: { equals: filters.search, mode: 'insensitive' } } } },
        { variants: { some: { barcode: filters.search } } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { shortDescription: { contains: filters.search, mode: 'insensitive' } },
        { subCategory: { name: { contains: filters.search, mode: 'insensitive' } } },
        { subCategory: { sport: { name: { contains: filters.search, mode: 'insensitive' } } } },
      ],
    });
  }

  if (filters.attributeFilters?.length) {
    and.push(...buildAttributeFilters(filters.attributeFilters));
  }

  return and.length > 0 ? { AND: and } : {};
}

function buildOrderBy(sort?: ProductSort): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case 'price_asc':
      return { sellingPrice: 'asc' };
    case 'price_desc':
      return { sellingPrice: 'desc' };
    case 'popularity':
      return { orderCount: 'desc' };
    case 'name_asc':
      return { name: 'asc' };
    case 'updated':
      return { updatedAt: 'desc' };
    case 'newest':
    default:
      return { createdAt: 'desc' };
  }
}

export const productRepository = {
  async findMany(
    filters: ProductListFilters,
    sort: ProductSort | undefined,
    skip: number,
    take: number,
  ) {
    const where = buildWhere(filters);

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: listInclude,
        orderBy: buildOrderBy(sort),
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  },

  async findManyForAdmin(
    filters: ProductListFilters,
    sort: ProductSort | undefined,
    skip: number,
    take: number,
  ) {
    const where = buildWhere(filters);

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: adminListInclude,
        orderBy: buildOrderBy(sort),
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  },

  count(where: Prisma.ProductWhereInput) {
    return prisma.product.count({ where: { deletedAt: null, ...where } });
  },

  findBySlug(slug: string, onlyActive: boolean) {
    return prisma.product.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(onlyActive ? { status: { in: ['ACTIVE', 'OUT_OF_STOCK'] } } : {}),
      },
      include: detailInclude,
    });
  },

  findById(id: string, includeDeleted = false) {
    return prisma.product.findFirst({
      where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
      include: adminDetailInclude,
    });
  },

  findByIdBasic(id: string, client: Client = prisma): Promise<Product | null> {
    return client.product.findUnique({ where: { id } });
  },

  slugExists(slug: string): Promise<boolean> {
    return prisma.product.findUnique({ where: { slug } }).then((p) => p !== null);
  },

  /** Distinct brand list for the filter sidebar, scoped to the current sub-category. */
  async distinctBrands(subCategoryId?: string): Promise<string[]> {
    const rows = await prisma.product.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        brand: { not: null },
        ...(subCategoryId ? { subCategoryId } : {}),
      },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return rows.map((r) => r.brand).filter((b): b is string => Boolean(b));
  },

  async priceRange(subCategoryId?: string): Promise<{ min: number; max: number }> {
    const result = await prisma.product.aggregate({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        ...(subCategoryId ? { subCategoryId } : {}),
      },
      _min: { sellingPrice: true },
      _max: { sellingPrice: true },
    });
    return {
      min: Number(result._min.sellingPrice ?? 0),
      max: Number(result._max.sellingPrice ?? 0),
    };
  },

  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return prisma.product.update({ where: { id }, data });
  },

  softDelete(id: string): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DRAFT' },
    });
  },

  bulkUpdateStatus(ids: string[], status: ProductStatus) {
    return prisma.product.updateMany({ where: { id: { in: ids } }, data: { status } });
  },

  bulkSoftDelete(ids: string[]) {
    return prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date(), status: 'DRAFT' },
    });
  },
};

export { buildWhere as buildProductWhere };
