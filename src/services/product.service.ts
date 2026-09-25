import { AttributeType, CategoryAttribute, Prisma, ProductStatus } from '@prisma/client';
import { prisma } from '../config/database';
import {
  productRepository,
  ProductListFilters,
  ProductSort,
  AttributeFilter,
} from '../repositories/product.repository';
import { variantRepository } from '../repositories/variant.repository';
import { brandRepository } from '../repositories/brand.repository';
import { resolveBrandChoice } from './brandResolution';
import { imageRepository } from '../repositories/image.repository';
import { subCategoryRepository } from '../repositories/subCategory.repository';
import { attributeRepository } from '../repositories/attribute.repository';
import { createUniqueSlug } from '../utils/slugify';
import { generateSkuPrefix } from '../utils/generators';
import { ApiError, FieldError } from '../utils/ApiError';
import { UPLOAD } from '../config/constants';
import { productPresenter } from './productPresenter';
import { productColorService } from './productColor.service';
import { stockMovementService } from './stockMovement.service';
import {
  assertBarcodesAvailable,
  assertImageDimensions,
  assertPriceConsistency,
  assertRelatableProducts,
  assertSkusAvailable,
  assertUniqueSizeColor,
  checkPrices,
  normalizeKeywords,
  normalizeTags,
  planSkus,
  refreshCover,
  replaceRelations,
} from './productRules';

type AttributeInputValue = string | number | boolean | string[] | null;

const dec = (v: number | null | undefined) =>
  v === undefined || v === null ? null : new Prisma.Decimal(v);

interface VariantInput {
  size?: string | null;
  color?: string | null;
  colorHex?: string | null;
  colorKey?: string | null;
  sku?: string;
  barcode?: string | null;
  priceOverride?: number | null;
  stock?: number;
  lowStockThreshold?: number;
  imageUrl?: string | null;
  isActive?: boolean;
}

interface ImageInput {
  url: string;
  publicId: string;
  altText?: string | null;
  displayOrder?: number;
  isPrimary?: boolean;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
}

interface ColorInput {
  key: string;
  name: string;
  hex?: string | null;
  secondaryHex?: string | null;
  swatchId?: string | null;
  mrp?: number | null;
  sellingPrice?: number | null;
  costPrice?: number | null;
  isActive?: boolean;
  isDefault?: boolean;
  images?: ImageInput[];
}

export interface CreateProductInput {
  subCategoryId: string;
  name: string;
  brand?: string | null;
  brandId?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  mrp: number;
  sellingPrice: number;
  costPrice?: number | null;
  skuPrefix?: string | null;
  hsnCode?: string | null;
  gstRate?: number | null;
  weightGrams?: number | null;
  isOversized?: boolean;
  shippingCharge?: number | null;
  highlights?: string[];
  packageContents?: string[];
  sizeChartKey?: string | null;
  sizeSystem?: string | null;
  videoUrl?: string | null;
  tags?: string[];
  searchKeywords?: string[];
  maxOrderQuantity?: number | null;
  isReturnable?: boolean;
  returnWindowDays?: number | null;
  codAvailable?: boolean;
  countryOfOrigin?: string | null;
  manufacturerDetails?: string | null;
  packerDetails?: string | null;
  importerDetails?: string | null;
  netQuantity?: string | null;
  warrantyInfo?: string | null;
  status?: ProductStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
  attributes?: Record<string, AttributeInputValue>;
  colors?: ColorInput[];
  variants: VariantInput[];
  images?: ImageInput[];
  relatedProductIds?: string[];
  boughtTogetherIds?: string[];
  draftId?: string;
}

export type BulkPriceMode =
  'SET_SELLING' | 'SET_MRP' | 'PERCENT_OFF_MRP' | 'PERCENT_CHANGE' | 'AMOUNT_CHANGE';

export interface BulkEditChanges {
  status?: ProductStatus;
  subCategoryId?: string;
  brandId?: string | null;
  addTags?: string[];
  removeTags?: string[];
  isReturnable?: boolean;
  returnWindowDays?: number | null;
  codAvailable?: boolean;
  maxOrderQuantity?: number | null;
  price?: {
    mode: BulkPriceMode;
    value: number;
    includeColorAndSizePrices: boolean;
    roundToRupee: boolean;
  };
}

/**
 * Validates one submitted value against its attribute definition and returns
 * the correct typed column to write. See the mapping table at the top of Phase 2.
 */
function mapAttributeValue(
  attribute: CategoryAttribute,
  raw: AttributeInputValue,
): Prisma.ProductAttributeValueCreateWithoutProductInput {
  const base = { attribute: { connect: { id: attribute.id } } };

  const fail = (message: string): never => {
    throw ApiError.validation('Invalid attribute value', [
      { field: `attributes.${attribute.code}`, message },
    ]);
  };

  switch (attribute.type) {
    case AttributeType.NUMBER: {
      const num = Number(raw);
      if (raw === null || raw === '' || Number.isNaN(num)) {
        return fail(`${attribute.name} must be a number`);
      }
      return { ...base, valueNumber: new Prisma.Decimal(num) };
    }

    case AttributeType.BOOLEAN: {
      if (typeof raw !== 'boolean') return fail(`${attribute.name} must be true or false`);
      return { ...base, valueBoolean: raw };
    }

    case AttributeType.DROPDOWN: {
      if (typeof raw !== 'string') return fail(`${attribute.name} must be a single option`);
      const options = (attribute.options as string[] | null) ?? [];
      if (!options.includes(raw)) {
        return fail(`${attribute.name} must be one of: ${options.join(', ')}`);
      }
      return { ...base, valueText: raw };
    }

    case AttributeType.MULTI_SELECT: {
      if (!Array.isArray(raw)) return fail(`${attribute.name} must be an array of options`);
      const options = (attribute.options as string[] | null) ?? [];
      const invalid = raw.filter((v) => !options.includes(v));
      if (invalid.length > 0) {
        return fail(`${attribute.name} contains invalid options: ${invalid.join(', ')}`);
      }
      return { ...base, valueJson: raw as unknown as Prisma.InputJsonValue };
    }

    case AttributeType.TEXT:
    default: {
      if (typeof raw !== 'string') return fail(`${attribute.name} must be text`);
      return { ...base, valueText: raw };
    }
  }
}

async function buildAttributeData(
  subCategoryId: string,
  submitted: Record<string, AttributeInputValue> | undefined,
): Promise<Prisma.ProductAttributeValueCreateWithoutProductInput[]> {
  const definitions = await attributeRepository.findBySubCategory(subCategoryId);
  const values = submitted ?? {};

  // Every required attribute must be present and non-empty.
  const missing: FieldError[] = definitions
    .filter((def) => def.isRequired)
    .filter((def) => {
      const v = values[def.code];
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    })
    .map((def) => ({ field: `attributes.${def.code}`, message: `${def.name} is required` }));

  if (missing.length > 0) {
    throw ApiError.validation('Required attributes are missing', missing);
  }

  const byCode = new Map(definitions.map((d) => [d.code, d]));

  return Object.entries(values)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([code, value]) => {
      const definition = byCode.get(code);
      if (!definition) {
        throw ApiError.validation('Unknown attribute', [
          {
            field: `attributes.${code}`,
            message: 'This attribute does not exist in this category',
          },
        ]);
      }
      return mapAttributeValue(definition, value);
    });
}

/** Brand rule lives in brandResolution.ts (injectable, unit-tested); this binds it to the database. */
export function resolveProductBrand(input: { brandId?: string | null; brand?: string | null }) {
  return resolveBrandChoice(input, brandRepository);
}

/**
 * Old admin clients send variants with a free-text `color` and no `colors`
 * array. Turn those strings into colour groups so every product created from
 * now on follows the same model.
 */
function deriveLegacyColors(variants: VariantInput[]): {
  colors: ColorInput[];
  variants: VariantInput[];
} {
  const named = variants.filter((v) => v.color?.trim());
  if (named.length === 0) return { colors: [], variants };
  if (named.length !== variants.length) {
    throw ApiError.validation('Colour missing', [
      {
        field: 'variants',
        message: 'Give every size a colour, or leave colour empty on all sizes',
      },
    ]);
  }

  const colors: ColorInput[] = [];
  const keyByName = new Map<string, string>();
  for (const v of variants) {
    const name = (v.color as string).trim();
    const lower = name.toLowerCase();
    if (!keyByName.has(lower)) {
      const key = `legacy-${colors.length}`;
      keyByName.set(lower, key);
      colors.push({
        key,
        name,
        hex: v.colorHex ?? null,
        isActive: true,
        isDefault: colors.length === 0,
      });
    }
  }

  return {
    colors,
    variants: variants.map((v) => ({
      ...v,
      colorKey: keyByName.get((v.color as string).trim().toLowerCase()),
    })),
  };
}

function round(value: number, toRupee: boolean): number {
  const r = toRupee ? Math.round(value) : Math.round(value * 100) / 100;
  return Math.max(0, r);
}

/** Applies a bulk price change to one selling price (given its MRP). */
function transformSelling(
  mode: BulkPriceMode,
  value: number,
  selling: number,
  mrp: number,
): number {
  switch (mode) {
    case 'SET_SELLING':
      return value;
    case 'PERCENT_OFF_MRP':
      return mrp * (1 - value / 100);
    case 'PERCENT_CHANGE':
      return selling * (1 + value / 100);
    case 'AMOUNT_CHANGE':
      return selling + value;
    case 'SET_MRP':
    default:
      return selling;
  }
}

export const productService = {
  /**
   * Turns `attr_flex_rating=Medium`, `attr_board_length_min=150` etc. into
   * typed filters. Unknown codes are ignored so old bookmarked URLs still work.
   */
  async parseAttributeFilters(
    subCategoryId: string | undefined,
    query: Record<string, unknown>,
  ): Promise<AttributeFilter[]> {
    if (!subCategoryId) return [];

    const definitions = await attributeRepository.findFilterableBySubCategory(subCategoryId);
    if (definitions.length === 0) return [];

    const byCode = new Map(definitions.map((d) => [d.code, d]));
    const collected = new Map<string, AttributeFilter>();

    for (const [key, rawValue] of Object.entries(query)) {
      if (!key.startsWith('attr_') || rawValue === undefined || rawValue === '') continue;

      const withoutPrefix = key.slice(5);
      const isMin = withoutPrefix.endsWith('_min');
      const isMax = withoutPrefix.endsWith('_max');
      const code = isMin || isMax ? withoutPrefix.slice(0, -4) : withoutPrefix;

      const attribute = byCode.get(code);
      if (!attribute) continue;

      const entry = collected.get(code) ?? { attribute };

      if (isMin) {
        const n = Number(rawValue);
        if (!Number.isNaN(n)) entry.min = n;
      } else if (isMax) {
        const n = Number(rawValue);
        if (!Number.isNaN(n)) entry.max = n;
      } else {
        entry.values = String(rawValue)
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      }

      collected.set(code, entry);
    }

    // Drop entries that ended up with nothing usable.
    return [...collected.values()].filter(
      (f) => (f.values && f.values.length > 0) || f.min !== undefined || f.max !== undefined,
    );
  },

  /** Storefront listing / search: cards with colour swatches and price range. */
  async list(
    filters: ProductListFilters,
    sort: ProductSort | undefined,
    skip: number,
    take: number,
  ) {
    const { items, total } = await productRepository.findMany(filters, sort, skip, take);
    return { items: items.map(productPresenter.storefrontCard), total };
  },

  /** Admin products table: stock health, margin and missing-info badges per row. */
  async listForAdmin(
    filters: ProductListFilters,
    sort: ProductSort | undefined,
    skip: number,
    take: number,
  ) {
    const { items, total } = await productRepository.findManyForAdmin(filters, sort, skip, take);
    return { items: items.map(productPresenter.adminListRow), total };
  },

  async getBySlug(slug: string) {
    const product = await productRepository.findBySlug(slug, true);
    if (!product) throw ApiError.notFound('Product not found');
    // The size guide is derived, not stored: it follows the product's name and category
    // unless the admin pinned or disabled it via sizeChartKey (see productPresenter).
    return productPresenter.storefrontDetail(product);
  },

  async getByIdForAdmin(id: string) {
    const product = await productRepository.findById(id, true);
    if (!product) throw ApiError.notFound('Product not found');
    return productPresenter.adminDetail(product);
  },

  async getStock(productId: string) {
    const product = await productRepository.findByIdBasic(productId);
    if (!product || product.deletedAt) throw ApiError.notFound('Product not found');
    return variantRepository.stockByProduct(productId);
  },

  async getFilterOptions(subCategoryId?: string) {
    const [brands, priceRange, attributes] = await Promise.all([
      productRepository.distinctBrands(subCategoryId),
      productRepository.priceRange(subCategoryId),
      subCategoryId
        ? attributeRepository.findFilterableBySubCategory(subCategoryId)
        : Promise.resolve([]),
    ]);

    return { brands, priceRange, attributes };
  },

  /**
   * Creates the whole product in one transaction: base fields, spec values,
   * colours with their photos, sizes with stock (logged as INITIAL_STOCK),
   * shared photos and related-product links.
   */
  async create(input: CreateProductInput, adminId?: string) {
    const subCategory = await subCategoryRepository.findById(input.subCategoryId);
    if (!subCategory) throw ApiError.badRequest('Category does not exist');

    // ---- colours (new flow) or derived from legacy variant.color strings ----
    const derived =
      (input.colors?.length ?? 0) > 0
        ? { colors: input.colors as ColorInput[], variants: input.variants }
        : deriveLegacyColors(input.variants);
    const colors = derived.colors;
    const variants = derived.variants;

    if (colors.length > 0 && !colors.some((c) => c.isDefault)) {
      const firstActive = colors.find((c) => c.isActive !== false) ?? colors[0];
      firstActive.isDefault = true;
    }
    const defaultColor = colors.find((c) => c.isDefault);
    if (defaultColor && defaultColor.isActive === false) {
      throw ApiError.badRequest('The default colour cannot be hidden');
    }
    const colorByKey = new Map(colors.map((c) => [c.key, c]));

    // ---- pricing, in memory, before anything is written ----
    const priceErrors = checkPrices({
      product: input,
      colors,
      variants: variants.map((v, i) => ({
        label: v.size ?? `#${i + 1}`,
        colorKey: v.colorKey,
        priceOverride: v.priceOverride,
      })),
    });
    if (priceErrors.length > 0) throw ApiError.validation('Pricing error', priceErrors);

    // ---- sizes, SKUs, barcodes ----
    const rows = variants.map((v) => ({
      size: v.size ?? null,
      colorName: v.colorKey ? (colorByKey.get(v.colorKey)?.name ?? null) : null,
      sku: v.sku,
    }));
    assertUniqueSizeColor(rows);

    // Admin can skip the SKU prefix entirely — derive one from the product name.
    const skuPrefix = input.skuPrefix?.trim() || generateSkuPrefix(input.name);
    const skus = planSkus(skuPrefix, rows);
    await assertSkusAvailable(prisma, skus);
    await assertBarcodesAvailable(
      prisma,
      variants.map((v) => v.barcode),
    );

    // ---- photos ----
    const sharedImages = input.images ?? [];
    if (sharedImages.length > UPLOAD.MAX_PRODUCT_IMAGES) {
      throw ApiError.badRequest(`At most ${UPLOAD.MAX_PRODUCT_IMAGES} shared photos`);
    }
    assertImageDimensions([...sharedImages, ...colors.flatMap((c) => c.images ?? [])]);

    // ---- relations, brand, slug, specs ----
    const related = input.relatedProductIds ?? [];
    const boughtTogether = input.boughtTogetherIds ?? [];
    await assertRelatableProducts(prisma, null, [...related, ...boughtTogether]);

    const brandResolution = await resolveProductBrand(input);
    const slug = await createUniqueSlug(input.name, (s) => productRepository.slugExists(s));
    const attributeData = await buildAttributeData(input.subCategoryId, input.attributes);

    // Exactly one primary among shared photos; refreshCover() later moves it to
    // the default colour's first photo when the product has colours.
    const hasPrimary = sharedImages.some((img) => img.isPrimary);

    const productId = await prisma.$transaction(
      async (tx) => {
        const product = await tx.product.create({
          data: {
            subCategory: { connect: { id: input.subCategoryId } },
            name: input.name,
            slug,
            brand: brandResolution?.brand ?? null,
            ...(brandResolution?.brandId
              ? { brandRef: { connect: { id: brandResolution.brandId } } }
              : {}),
            description: input.description ?? null,
            shortDescription: input.shortDescription ?? null,
            mrp: new Prisma.Decimal(input.mrp),
            sellingPrice: new Prisma.Decimal(input.sellingPrice),
            costPrice: dec(input.costPrice),
            skuPrefix,
            hsnCode: input.hsnCode ?? null,
            gstRate: dec(input.gstRate),
            weightGrams: input.weightGrams ?? null,
            isOversized: input.isOversized ?? false,
            shippingCharge: dec(input.shippingCharge),
            highlights: input.highlights ?? [],
            packageContents: input.packageContents ?? [],
            sizeChartKey: input.sizeChartKey ?? null,
            sizeSystem: input.sizeSystem ?? null,
            videoUrl: input.videoUrl ?? null,
            tags: normalizeTags(input.tags),
            searchKeywords: normalizeKeywords(input.searchKeywords),
            maxOrderQuantity: input.maxOrderQuantity ?? null,
            isReturnable: input.isReturnable ?? true,
            returnWindowDays: input.returnWindowDays ?? null,
            codAvailable: input.codAvailable ?? true,
            countryOfOrigin: input.countryOfOrigin ?? null,
            manufacturerDetails: input.manufacturerDetails ?? null,
            packerDetails: input.packerDetails ?? null,
            importerDetails: input.importerDetails ?? null,
            netQuantity: input.netQuantity ?? null,
            warrantyInfo: input.warrantyInfo ?? null,
            status: input.status ?? 'DRAFT',
            metaTitle: input.metaTitle ?? null,
            metaDescription: input.metaDescription ?? null,
            attributeValues: { create: attributeData },
            images: {
              create: sharedImages.map((img, index) => ({
                url: img.url,
                publicId: img.publicId,
                altText: img.altText ?? input.name,
                displayOrder: img.displayOrder ?? index,
                isPrimary: hasPrimary ? Boolean(img.isPrimary) : index === 0,
                width: img.width ?? null,
                height: img.height ?? null,
                sizeBytes: img.sizeBytes ?? null,
              })),
            },
          },
        });

        // Colours (with their photos). Created one by one because variants need the ids.
        const colorIdByKey = new Map<string, string>();
        for (const [index, c] of colors.entries()) {
          const images = c.images ?? [];
          const color = await tx.productColor.create({
            data: {
              productId: product.id,
              swatchId: c.swatchId ?? null,
              name: c.name,
              hex: c.hex ?? null,
              secondaryHex: c.secondaryHex ?? null,
              mrp: dec(c.mrp),
              sellingPrice: dec(c.sellingPrice),
              costPrice: dec(c.costPrice),
              isActive: c.isActive ?? true,
              isDefault: Boolean(c.isDefault),
              displayOrder: index,
              images: {
                createMany: {
                  data: images.map((img, i) => ({
                    productId: product.id,
                    url: img.url,
                    publicId: img.publicId,
                    altText: img.altText ?? `${input.name} – ${c.name}`,
                    displayOrder: img.displayOrder ?? i,
                    width: img.width ?? null,
                    height: img.height ?? null,
                    sizeBytes: img.sizeBytes ?? null,
                    isPrimary: false,
                  })),
                },
              },
            },
          });
          colorIdByKey.set(c.key, color.id);
        }

        // Sizes.
        for (const [i, v] of variants.entries()) {
          const color = v.colorKey ? colorByKey.get(v.colorKey) : undefined;
          const variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              colorId: v.colorKey ? (colorIdByKey.get(v.colorKey) ?? null) : null,
              sku: skus[i],
              barcode: v.barcode ?? null,
              size: v.size ?? null,
              color: color?.name ?? null,
              colorHex: color?.hex ?? null,
              priceOverride: dec(v.priceOverride),
              stock: v.stock ?? 0,
              lowStockThreshold: v.lowStockThreshold ?? 5,
              imageUrl: v.imageUrl ?? null,
              // A size inside a hidden colour is hidden too.
              isActive: (v.isActive ?? true) && (color?.isActive ?? true),
            },
          });
          if ((v.stock ?? 0) > 0) {
            await tx.stockMovement.create({
              data: {
                variantId: variant.id,
                reason: 'INITIAL_STOCK',
                quantityDelta: v.stock as number,
                stockBefore: 0,
                stockAfter: v.stock as number,
                note: 'Product created',
                adminId: adminId ?? null,
              },
            });
          }
        }

        await replaceRelations(tx, product.id, related, boughtTogether);
        await refreshCover(tx, product.id);

        if (input.draftId && adminId) {
          await tx.productDraft.deleteMany({ where: { id: input.draftId, adminId } });
        }

        return product.id;
      },
      { timeout: 20_000 },
    );

    return this.getByIdForAdmin(productId);
  },

  async update(
    id: string,
    input: Record<string, unknown> & { attributes?: Record<string, AttributeInputValue> },
  ) {
    const existing = await productRepository.findByIdBasic(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound('Product not found');

    // brandId is not a scalar on the checked update input — it is applied via the brandRef relation.
    const { attributes, brandId: _brandId, ...scalarInput } = input;
    const data: Prisma.ProductUpdateInput = { ...scalarInput };

    const brandResolution = await resolveProductBrand({
      brandId: input.brandId as string | null | undefined,
      brand: input.brand as string | null | undefined,
    });
    if (brandResolution) {
      data.brand = brandResolution.brand;
      data.brandRef = brandResolution.brandId
        ? { connect: { id: brandResolution.brandId } }
        : { disconnect: true };
    }

    if (typeof input.name === 'string' && input.name !== existing.name) {
      data.slug = await createUniqueSlug(input.name, async (s) =>
        s === existing.slug ? false : productRepository.slugExists(s),
      );
    }

    if (input.tags !== undefined) data.tags = normalizeTags(input.tags as string[]);
    if (input.searchKeywords !== undefined) {
      data.searchKeywords = normalizeKeywords(input.searchKeywords as string[]);
    }

    // Attribute values are replaced wholesale rather than diffed — simpler,
    // and the row count per product is small.
    const attributeData =
      attributes !== undefined
        ? await buildAttributeData(existing.subCategoryId, attributes)
        : undefined;

    await prisma.$transaction(async (tx) => {
      if (attributeData) {
        await tx.productAttributeValue.deleteMany({ where: { productId: id } });
        data.attributeValues = { create: attributeData };
      }
      await tx.product.update({ where: { id }, data });
      // MRP / selling changes must still be valid against colour and size prices.
      await assertPriceConsistency(tx, id);
    });

    return this.getByIdForAdmin(id);
  },

  async softDelete(id: string) {
    const existing = await productRepository.findByIdBasic(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound('Product not found');
    // Soft delete only — order_items reference variants and must stay valid.
    return productRepository.softDelete(id);
  },

  async bulkAction(ids: string[], action: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE') {
    switch (action) {
      case 'ACTIVATE':
        return productRepository.bulkUpdateStatus(ids, 'ACTIVE');
      case 'DEACTIVATE':
        return productRepository.bulkUpdateStatus(ids, 'DRAFT');
      case 'DELETE':
        return productRepository.bulkSoftDelete(ids);
    }
  },

  /**
   * Bulk edit from the product list (#6). Each product is updated in its own
   * transaction; a product whose new prices would break the MRP rule is skipped
   * and reported instead of failing the whole batch.
   */
  async bulkEdit(ids: string[], changes: BulkEditChanges) {
    if (changes.subCategoryId) {
      const sub = await subCategoryRepository.findById(changes.subCategoryId);
      if (!sub) throw ApiError.badRequest('Category does not exist');
    }
    const brand =
      changes.brandId !== undefined
        ? await resolveProductBrand({ brandId: changes.brandId })
        : undefined;
    const addTags = normalizeTags(changes.addTags);
    const removeTags = new Set(normalizeTags(changes.removeTags).map((t) => t.toLowerCase()));

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, deletedAt: null },
      include: {
        colors: { select: { id: true, mrp: true, sellingPrice: true } },
        variants: { select: { id: true, colorId: true, priceOverride: true } },
      },
    });

    const skipped: { id: string; name: string; reason: string }[] = [];
    let updated = 0;

    for (const p of products) {
      try {
        await prisma.$transaction(async (tx) => {
          const data: Prisma.ProductUncheckedUpdateInput = {};
          if (changes.status) data.status = changes.status;
          if (changes.isReturnable !== undefined) data.isReturnable = changes.isReturnable;
          if (changes.returnWindowDays !== undefined)
            data.returnWindowDays = changes.returnWindowDays;
          if (changes.codAvailable !== undefined) data.codAvailable = changes.codAvailable;
          if (changes.maxOrderQuantity !== undefined)
            data.maxOrderQuantity = changes.maxOrderQuantity;
          if (brand !== undefined) {
            data.brandId = brand?.brandId ?? null;
            data.brand = brand?.brand ?? null;
          }
          if (addTags.length > 0 || removeTags.size > 0) {
            data.tags = normalizeTags([...p.tags, ...addTags]).filter(
              (t) => !removeTags.has(t.toLowerCase()),
            );
          }
          if (changes.subCategoryId && changes.subCategoryId !== p.subCategoryId) {
            // Spec values belong to the old category's attributes — they cannot move.
            await tx.productAttributeValue.deleteMany({ where: { productId: p.id } });
            data.subCategoryId = changes.subCategoryId;
          }

          if (changes.price) {
            const { mode, value, includeColorAndSizePrices, roundToRupee } = changes.price;
            const oldMrp = Number(p.mrp);
            const newMrp = mode === 'SET_MRP' ? round(value, roundToRupee) : oldMrp;
            data.mrp = newMrp;
            data.sellingPrice = round(
              transformSelling(mode, value, Number(p.sellingPrice), newMrp),
              roundToRupee,
            );

            if (includeColorAndSizePrices) {
              const colorMrp = new Map<string, number>();
              for (const c of p.colors) {
                // After SET_MRP every colour follows the new product MRP.
                const cMrp = mode === 'SET_MRP' || c.mrp === null ? newMrp : Number(c.mrp);
                colorMrp.set(c.id, cMrp);
                const colorData: Prisma.ProductColorUpdateInput = {};
                if (mode === 'SET_MRP') colorData.mrp = null; // follow the product MRP again
                if (mode === 'SET_SELLING')
                  colorData.sellingPrice = null; // everything = value
                else if (c.sellingPrice !== null) {
                  colorData.sellingPrice = round(
                    transformSelling(mode, value, Number(c.sellingPrice), cMrp),
                    roundToRupee,
                  );
                }
                if (Object.keys(colorData).length > 0) {
                  await tx.productColor.update({ where: { id: c.id }, data: colorData });
                }
              }
              // Size-level price overrides: SET_SELLING clears them (every size = value),
              // SET_MRP leaves them alone, the relative modes transform them.
              if (mode !== 'SET_MRP') {
                for (const v of p.variants) {
                  if (v.priceOverride === null) continue;
                  const vMrp = (v.colorId ? colorMrp.get(v.colorId) : undefined) ?? newMrp;
                  const priceOverride =
                    mode === 'SET_SELLING'
                      ? null
                      : round(
                          transformSelling(mode, value, Number(v.priceOverride), vMrp),
                          roundToRupee,
                        );
                  await tx.productVariant.update({ where: { id: v.id }, data: { priceOverride } });
                }
              }
            }
          }

          await tx.product.update({ where: { id: p.id }, data });
          await assertPriceConsistency(tx, p.id);
        });
        updated += 1;
      } catch (error) {
        skipped.push({
          id: p.id,
          name: p.name,
          reason:
            error instanceof ApiError
              ? [error.message, ...error.errors.map((e) => e.message)].join(' — ')
              : 'Update failed',
        });
      }
    }

    const missing = ids.filter((id) => !products.some((p) => p.id === id));
    for (const id of missing) skipped.push({ id, name: '', reason: 'Product not found' });

    return { updated, skipped };
  },

  /**
   * "Duplicate product" (#2). Copies everything except stock (new product starts
   * at 0), barcodes (must be unique) and order history. Photos are re-used —
   * the same R2 objects — so duplicating is instant; deletes check for other users.
   */
  async duplicate(id: string, options: { name?: string; copyImages: boolean }, adminId?: string) {
    const source = await prisma.product.findUnique({
      where: { id },
      include: {
        attributeValues: true,
        colors: { orderBy: { displayOrder: 'asc' }, include: { images: true } },
        variants: true,
        images: { where: { colorId: null } },
        relationsFrom: true,
      },
    });
    if (!source || source.deletedAt) throw ApiError.notFound('Product not found');

    const name = options.name ?? `${source.name} (Copy)`;
    const slug = await createUniqueSlug(name, (s) => productRepository.slugExists(s));

    // Find a prefix whose generated SKUs are all free.
    const baseprefix = generateSkuPrefix(name);
    const colorNameById = new Map(source.colors.map((c) => [c.id, c.name]));
    let skuPrefix = baseprefix;
    let skus: string[] = [];
    for (let attempt = 1; attempt <= 50; attempt += 1) {
      skuPrefix = attempt === 1 ? baseprefix : `${baseprefix.slice(0, 17)}${attempt}`;
      skus = planSkus(
        skuPrefix,
        source.variants.map((v) => ({
          size: v.size,
          colorName: v.colorId ? colorNameById.get(v.colorId) : v.color,
        })),
      );
      const taken = await variantRepository.takenSkus(skus);
      if (taken.size === 0) break;
      if (attempt === 50) throw ApiError.conflict('Could not find free SKUs — set a SKU prefix');
    }

    const {
      id: _id,
      slug: _slug,
      name: _name,
      skuPrefix: _prefix,
      createdAt: _c,
      updatedAt: _u,
      deletedAt: _d,
      orderCount: _o,
      status: _s,
      attributeValues,
      colors,
      variants,
      images,
      relationsFrom,
      ...scalars
    } = source;

    const newId = await prisma.$transaction(
      async (tx) => {
        const product = await tx.product.create({
          data: {
            ...scalars,
            name,
            slug,
            skuPrefix,
            status: 'DRAFT',
            orderCount: 0,
            metaTitle: source.metaTitle ? name : null,
            attributeValues: {
              createMany: {
                data: attributeValues.map((a) => ({
                  attributeId: a.attributeId,
                  valueText: a.valueText,
                  valueNumber: a.valueNumber,
                  valueBoolean: a.valueBoolean,
                  valueJson: a.valueJson ?? Prisma.JsonNull,
                })),
              },
            },
            images: options.copyImages
              ? {
                  createMany: {
                    data: images.map((img) => ({
                      url: img.url,
                      publicId: img.publicId,
                      altText: img.altText,
                      displayOrder: img.displayOrder,
                      isPrimary: img.isPrimary,
                      width: img.width,
                      height: img.height,
                      sizeBytes: img.sizeBytes,
                    })),
                  },
                }
              : undefined,
          },
        });

        const newColorId = new Map<string, string>();
        for (const c of colors) {
          const created = await tx.productColor.create({
            data: {
              productId: product.id,
              swatchId: c.swatchId,
              name: c.name,
              hex: c.hex,
              secondaryHex: c.secondaryHex,
              mrp: c.mrp,
              sellingPrice: c.sellingPrice,
              costPrice: c.costPrice,
              isActive: c.isActive,
              isDefault: c.isDefault,
              displayOrder: c.displayOrder,
              images: options.copyImages
                ? {
                    createMany: {
                      data: c.images.map((img) => ({
                        productId: product.id,
                        url: img.url,
                        publicId: img.publicId,
                        altText: img.altText,
                        displayOrder: img.displayOrder,
                        isPrimary: false,
                        width: img.width,
                        height: img.height,
                        sizeBytes: img.sizeBytes,
                      })),
                    },
                  }
                : undefined,
            },
          });
          newColorId.set(c.id, created.id);
        }

        await tx.productVariant.createMany({
          data: variants.map((v, i) => ({
            productId: product.id,
            colorId: v.colorId ? (newColorId.get(v.colorId) ?? null) : null,
            sku: skus[i],
            barcode: null,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            priceOverride: v.priceOverride,
            stock: 0,
            lowStockThreshold: v.lowStockThreshold,
            imageUrl: v.imageUrl,
            isActive: v.isActive,
          })),
        });

        if (relationsFrom.length > 0) {
          await tx.productRelation.createMany({
            data: relationsFrom.map((r) => ({
              productId: product.id,
              relatedProductId: r.relatedProductId,
              type: r.type,
              displayOrder: r.displayOrder,
            })),
          });
        }

        await refreshCover(tx, product.id);
        return product.id;
      },
      { timeout: 20_000 },
    );

    void adminId; // reserved for an audit trail (#20, later)
    return this.getByIdForAdmin(newId);
  },

  /** Replaces the hand-picked "related" and "frequently bought together" lists (#14). */
  async setRelations(id: string, related: string[], boughtTogether: string[]) {
    const product = await productRepository.findByIdBasic(id);
    if (!product || product.deletedAt) throw ApiError.notFound('Product not found');
    await assertRelatableProducts(prisma, id, [...related, ...boughtTogether]);
    await prisma.$transaction((tx) => replaceRelations(tx, id, related, boughtTogether));
    return this.getByIdForAdmin(id);
  },

  // ---------- Variants ----------

  /** Adds ONE size. For products with colours, colorId is required. */
  async addVariant(
    productId: string,
    input: VariantInput & { colorId?: string | null; stock: number; lowStockThreshold: number },
    adminId?: string,
  ) {
    const [variant] = await this.addVariants(productId, input.colorId ?? null, [input], adminId, {
      legacyColor: input.color ?? null,
      legacyColorHex: input.colorHex ?? null,
    });
    return variant;
  },

  /** Adds several sizes to one colour (or to a colour-less product). */
  async addVariants(
    productId: string,
    colorId: string | null,
    sizes: (VariantInput & { stock: number; lowStockThreshold: number })[],
    adminId?: string,
    legacy?: { legacyColor: string | null; legacyColorHex: string | null },
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        colors: { select: { id: true, name: true, hex: true, isActive: true } },
        variants: { select: { size: true, color: true, colorId: true } },
      },
    });
    if (!product || product.deletedAt) throw ApiError.notFound('Product not found');

    let color: { id: string; name: string; hex: string | null; isActive: boolean } | null = null;
    if (product.colors.length > 0) {
      if (!colorId) {
        throw ApiError.badRequest('Choose which colour these sizes belong to', [
          { field: 'colorId', message: 'Required' },
        ]);
      }
      color = product.colors.find((c) => c.id === colorId) ?? null;
      if (!color) throw ApiError.badRequest('That colour does not belong to this product');
    } else if (colorId) {
      throw ApiError.badRequest('This product has no colours yet — add a colour first');
    }

    const colorName = color?.name ?? legacy?.legacyColor ?? null;
    const colorHex = color?.hex ?? legacy?.legacyColorHex ?? null;

    assertUniqueSizeColor([
      ...product.variants.map((v) => ({ size: v.size, colorName: v.color })),
      ...sizes.map((s) => ({ size: s.size, colorName })),
    ]);

    const skus = planSkus(
      product.skuPrefix,
      sizes.map((s) => ({ size: s.size, colorName, sku: s.sku })),
    );
    await assertSkusAvailable(prisma, skus);
    await assertBarcodesAvailable(
      prisma,
      sizes.map((s) => s.barcode),
    );

    const ids = await prisma.$transaction(async (tx) => {
      const created: string[] = [];
      for (const [i, s] of sizes.entries()) {
        const variant = await tx.productVariant.create({
          data: {
            productId,
            colorId: color?.id ?? null,
            sku: skus[i],
            barcode: s.barcode ?? null,
            size: s.size ?? null,
            color: colorName,
            colorHex,
            priceOverride: dec(s.priceOverride),
            stock: s.stock,
            lowStockThreshold: s.lowStockThreshold,
            imageUrl: s.imageUrl ?? null,
            isActive: (s.isActive ?? true) && (color?.isActive ?? true),
          },
        });
        if (s.stock > 0) {
          await tx.stockMovement.create({
            data: {
              variantId: variant.id,
              reason: 'INITIAL_STOCK',
              quantityDelta: s.stock,
              stockBefore: 0,
              stockAfter: s.stock,
              note: 'Size added',
              adminId: adminId ?? null,
            },
          });
        }
        created.push(variant.id);
      }
      await assertPriceConsistency(tx, productId);
      return created;
    });

    return prisma.productVariant.findMany({ where: { id: { in: ids } }, orderBy: { size: 'asc' } });
  },

  async updateVariant(
    id: string,
    input: {
      sku?: string;
      barcode?: string | null;
      priceOverride?: number | null;
      stock?: number;
      lowStockThreshold?: number;
      imageUrl?: string | null;
      isActive?: boolean;
    },
    adminId?: string,
  ) {
    const existing = await variantRepository.findById(id);
    if (!existing) throw ApiError.notFound('Variant not found');

    if (input.sku && input.sku !== existing.sku) {
      await assertSkusAvailable(prisma, [input.sku], id);
    }
    if (input.barcode) await assertBarcodesAvailable(prisma, [input.barcode], id);
    if (input.isActive === true && existing.colorRef?.isActive === false) {
      throw ApiError.badRequest(`Show the colour "${existing.colorRef.name}" first`);
    }

    const { stock, priceOverride, ...rest } = input;

    await prisma.$transaction(async (tx) => {
      await tx.productVariant.update({
        where: { id },
        data: {
          ...rest,
          ...(priceOverride !== undefined ? { priceOverride: dec(priceOverride) } : {}),
        },
      });
      // Stock typed straight into the variant row is still an audited movement.
      if (stock !== undefined) {
        await stockMovementService.setStock(id, stock, 'MANUAL_ADJUSTMENT', {
          adminId,
          note: 'Edited on variant',
          client: tx,
        });
      }
      if (priceOverride !== undefined) await assertPriceConsistency(tx, existing.productId);
    });

    return prisma.productVariant.findUnique({ where: { id } });
  },

  async deleteVariant(id: string) {
    const existing = await variantRepository.findById(id);
    if (!existing) throw ApiError.notFound('Variant not found');

    const remaining = await variantRepository.countActiveByProduct(existing.productId);
    if (remaining <= 1) {
      throw ApiError.conflict('A product must have at least one variant');
    }
    if (await variantRepository.anyOrdered([id])) {
      throw ApiError.conflict(
        'This size has been ordered before, so it cannot be deleted. Deactivate it instead.',
      );
    }

    return variantRepository.delete(id);
  },

  // ---------- Stock (#7) ----------

  async adjustStock(
    variantId: string,
    input: {
      mode: 'SET' | 'ADD' | 'REMOVE';
      quantity: number;
      reason: 'RESTOCK' | 'DAMAGED' | 'CORRECTION' | 'MANUAL_ADJUSTMENT';
      note?: string;
    },
    adminId?: string,
  ) {
    const options = { adminId, note: input.note ?? null };
    if (input.mode === 'SET') {
      return stockMovementService.setStock(variantId, input.quantity, input.reason, options);
    }
    const delta = input.mode === 'ADD' ? input.quantity : -input.quantity;
    return stockMovementService.adjustStock(variantId, delta, input.reason, options);
  },

  /** Saves the colour × size stock grid in one go. Every changed cell is logged. */
  async updateStockGrid(
    productId: string,
    items: { variantId: string; stock: number; lowStockThreshold?: number }[],
    reason: 'RESTOCK' | 'DAMAGED' | 'CORRECTION' | 'MANUAL_ADJUSTMENT',
    note: string | undefined,
    adminId?: string,
  ) {
    const owned = await prisma.productVariant.count({
      where: { productId, id: { in: items.map((i) => i.variantId) } },
    });
    if (owned !== new Set(items.map((i) => i.variantId)).size) {
      throw ApiError.badRequest('Some sizes do not belong to this product');
    }

    await prisma.$transaction(
      async (tx) => {
        for (const item of items) {
          await stockMovementService.setStock(item.variantId, item.stock, reason, {
            adminId,
            note: note ?? 'Stock grid',
            client: tx,
          });
          if (item.lowStockThreshold !== undefined) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { lowStockThreshold: item.lowStockThreshold },
            });
          }
        }
      },
      { timeout: 20_000 },
    );

    return variantRepository.findByProduct(productId);
  },

  // ---------- Images ----------

  /** Attaches photos to the shared group (colorId null) or to one colour. */
  async attachImages(productId: string, images: (ImageInput & { colorId?: string | null })[]) {
    const product = await productRepository.findByIdBasic(productId);
    if (!product || product.deletedAt) throw ApiError.notFound('Product not found');

    assertImageDimensions(images);

    const groups = new Map<string | null, typeof images>();
    for (const img of images) {
      const key = img.colorId ?? null;
      groups.set(key, [...(groups.get(key) ?? []), img]);
    }

    const colorIds = [...groups.keys()].filter((k): k is string => k !== null);
    if (colorIds.length > 0) {
      const owned = await prisma.productColor.count({ where: { productId, id: { in: colorIds } } });
      if (owned !== colorIds.length) {
        throw ApiError.badRequest('That colour does not belong to this product');
      }
    }

    const rows: Prisma.ProductImageCreateManyInput[] = [];
    for (const [colorId, group] of groups) {
      const existingCount = await imageRepository.countInGroup(productId, colorId);
      const limit = colorId ? UPLOAD.MAX_IMAGES_PER_COLOR : UPLOAD.MAX_PRODUCT_IMAGES;
      if (existingCount + group.length > limit) {
        throw ApiError.badRequest(
          `At most ${limit} photos ${colorId ? 'per colour' : 'in shared photos'} (currently ${existingCount})`,
        );
      }
      group.forEach((img, index) =>
        rows.push({
          productId,
          colorId,
          url: img.url,
          publicId: img.publicId,
          altText: img.altText ?? product.name,
          displayOrder: img.displayOrder ?? existingCount + index,
          width: img.width ?? null,
          height: img.height ?? null,
          sizeBytes: img.sizeBytes ?? null,
          isPrimary: false,
        }),
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.productImage.createMany({ data: rows });
      await refreshCover(tx, productId);
    });

    return imageRepository.findByProduct(productId);
  },

  async updateImage(id: string, input: { altText?: string | null; colorId?: string | null }) {
    const image = await imageRepository.findById(id);
    if (!image) throw ApiError.notFound('Image not found');

    if (input.colorId !== undefined && input.colorId !== image.colorId) {
      if (input.colorId) {
        const color = await prisma.productColor.findFirst({
          where: { id: input.colorId, productId: image.productId },
        });
        if (!color) throw ApiError.badRequest('That colour does not belong to this product');
      }
      const count = await imageRepository.countInGroup(image.productId, input.colorId);
      const limit = input.colorId ? UPLOAD.MAX_IMAGES_PER_COLOR : UPLOAD.MAX_PRODUCT_IMAGES;
      if (count >= limit) throw ApiError.badRequest(`That group already has ${limit} photos`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.productImage.update({
        where: { id },
        data: {
          ...(input.altText !== undefined ? { altText: input.altText } : {}),
          ...(input.colorId !== undefined ? { colorId: input.colorId } : {}),
        },
      });
      await refreshCover(tx, image.productId);
    });

    return imageRepository.findById(id);
  },

  async deleteImage(id: string) {
    const image = await imageRepository.findById(id);
    if (!image) throw ApiError.notFound('Image not found');

    await prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id } });
      // If the cover was removed, promote the next one.
      await refreshCover(tx, image.productId);
    });

    // Remove from R2 after the DB row is gone — only if no duplicated product still uses it.
    await productColorService.cleanupObjects([image.publicId]);
  },

  async reorderImages(
    items: { id: string; displayOrder: number; isPrimary?: boolean; colorId?: string | null }[],
  ) {
    const images = await prisma.productImage.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      select: { id: true, productId: true },
    });
    if (images.length !== items.length) throw ApiError.notFound('Image not found');
    const productId = images[0].productId;
    if (images.some((img) => img.productId !== productId)) {
      throw ApiError.badRequest('All photos must belong to the same product');
    }

    const movedTo = [...new Set(items.map((i) => i.colorId).filter((c): c is string => !!c))];
    if (movedTo.length > 0) {
      const owned = await prisma.productColor.count({ where: { productId, id: { in: movedTo } } });
      if (owned !== movedTo.length) {
        throw ApiError.badRequest('That colour does not belong to this product');
      }
    }

    await imageRepository.reorder(productId, items);
    await refreshCover(prisma, productId);
    return imageRepository.findByProduct(productId);
  },

  /** Admin screen helpers: tag suggestions + tags already in use + issue catalogue. */
  async formMeta() {
    const rows = await prisma.$queryRaw<{ tag: string; count: bigint }[]>`
      SELECT tag, COUNT(*) AS count
      FROM products, UNNEST(tags) AS tag
      WHERE deleted_at IS NULL
      GROUP BY tag
      ORDER BY count DESC, tag ASC
      LIMIT 100
    `;
    return {
      tagsInUse: rows.map((r) => ({ tag: r.tag, count: Number(r.count) })),
    };
  },
};
