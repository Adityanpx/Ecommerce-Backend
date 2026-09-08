import { AttributeType, CategoryAttribute, Prisma, ProductStatus } from '@prisma/client';
import { prisma } from '../config/database';
import {
  productRepository,
  ProductListFilters,
  ProductSort,
  AttributeFilter,
} from '../repositories/product.repository';
import { variantRepository } from '../repositories/variant.repository';
import { imageRepository } from '../repositories/image.repository';
import { subCategoryRepository } from '../repositories/subCategory.repository';
import { attributeRepository } from '../repositories/attribute.repository';
import { createUniqueSlug } from '../utils/slugify';
import { generateSku } from '../utils/generators';
import { ApiError, FieldError } from '../utils/ApiError';
import { UPLOAD } from '../config/constants';
import { deleteAsset } from '../integrations/cloudinary/deleteAsset';

type AttributeInputValue = string | number | boolean | string[] | null;

interface VariantInput {
  size: string;
  color?: string | null;
  colorHex?: string | null;
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

function assertUniqueVariants(variants: VariantInput[]): void {
  const seen = new Set<string>();
  for (const v of variants) {
    const key = `${v.size.toLowerCase()}|${(v.color ?? '').toLowerCase()}`;
    if (seen.has(key)) {
      throw ApiError.conflict(
        `Duplicate variant: size "${v.size}"${v.color ? ` / colour "${v.color}"` : ''}`,
      );
    }
    seen.add(key);
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

  list(filters: ProductListFilters, sort: ProductSort | undefined, skip: number, take: number) {
    return productRepository.findMany(filters, sort, skip, take);
  },

  async getBySlug(slug: string) {
    const product = await productRepository.findBySlug(slug, true);
    if (!product) throw ApiError.notFound('Product not found');
    return product;
  },

  async getByIdForAdmin(id: string) {
    const product = await productRepository.findById(id, true);
    if (!product) throw ApiError.notFound('Product not found');
    return product;
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

  /** Product + attribute values + variants + images, atomically. */
  async create(input: {
    subCategoryId: string;
    name: string;
    brand?: string | null;
    description?: string | null;
    shortDescription?: string | null;
    mrp: number;
    sellingPrice: number;
    skuPrefix: string;
    hsnCode?: string | null;
    gstRate?: number | null;
    weightGrams?: number | null;
    isOversized?: boolean;
    shippingCharge?: number | null;
    status?: ProductStatus;
    metaTitle?: string | null;
    metaDescription?: string | null;
    attributes?: Record<string, AttributeInputValue>;
    variants: VariantInput[];
    images?: ImageInput[];
  }) {
    const subCategory = await subCategoryRepository.findById(input.subCategoryId);
    if (!subCategory) throw ApiError.badRequest('Category does not exist');

    if (input.sellingPrice > input.mrp) {
      throw ApiError.validation('Pricing error', [
        { field: 'sellingPrice', message: 'Selling price cannot exceed MRP' },
      ]);
    }

    assertUniqueVariants(input.variants);

    const images = input.images ?? [];
    if (images.length > UPLOAD.MAX_PRODUCT_IMAGES) {
      throw ApiError.badRequest(`A product can have at most ${UPLOAD.MAX_PRODUCT_IMAGES} images`);
    }

    const slug = await createUniqueSlug(input.name, (s) => productRepository.slugExists(s));
    const attributeData = await buildAttributeData(input.subCategoryId, input.attributes);

    // Generate SKUs up front and check them all before opening the transaction.
    const variantData = input.variants.map((v) => ({
      ...v,
      sku: generateSku(input.skuPrefix, v.size, v.color),
    }));

    for (const v of variantData) {
      if (await variantRepository.skuExists(v.sku)) {
        throw ApiError.conflict(`SKU "${v.sku}" already exists. Use a different SKU prefix.`);
      }
    }

    // Exactly one primary image. Default to the first if none was flagged.
    const hasPrimary = images.some((img) => img.isPrimary);
    const imageData = images.map((img, index) => ({
      url: img.url,
      publicId: img.publicId,
      altText: img.altText ?? input.name,
      displayOrder: img.displayOrder ?? index,
      isPrimary: hasPrimary ? Boolean(img.isPrimary) : index === 0,
    }));

    return prisma.product.create({
      data: {
        subCategory: { connect: { id: input.subCategoryId } },
        name: input.name,
        slug,
        brand: input.brand ?? null,
        description: input.description ?? null,
        shortDescription: input.shortDescription ?? null,
        mrp: new Prisma.Decimal(input.mrp),
        sellingPrice: new Prisma.Decimal(input.sellingPrice),
        skuPrefix: input.skuPrefix,
        hsnCode: input.hsnCode ?? null,
        gstRate:
          input.gstRate !== undefined && input.gstRate !== null
            ? new Prisma.Decimal(input.gstRate)
            : null,
        weightGrams: input.weightGrams ?? null,
        isOversized: input.isOversized ?? false,
        shippingCharge:
          input.shippingCharge !== undefined && input.shippingCharge !== null
            ? new Prisma.Decimal(input.shippingCharge)
            : null,
        status: input.status ?? 'DRAFT',
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        attributeValues: { create: attributeData },
        variants: {
          create: variantData.map((v) => ({
            sku: v.sku,
            size: v.size,
            color: v.color ?? null,
            colorHex: v.colorHex ?? null,
            priceOverride:
              v.priceOverride !== undefined && v.priceOverride !== null
                ? new Prisma.Decimal(v.priceOverride)
                : null,
            stock: v.stock ?? 0,
            lowStockThreshold: v.lowStockThreshold ?? 5,
            imageUrl: v.imageUrl ?? null,
            isActive: v.isActive ?? true,
          })),
        },
        images: { create: imageData },
      },
      include: {
        variants: true,
        images: true,
        attributeValues: { include: { attribute: true } },
      },
    });
  },

  async update(
    id: string,
    input: Record<string, unknown> & { attributes?: Record<string, AttributeInputValue> },
  ) {
    const existing = await productRepository.findByIdBasic(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound('Product not found');

    const mrp = input.mrp !== undefined ? Number(input.mrp) : Number(existing.mrp);
    const sellingPrice =
      input.sellingPrice !== undefined ? Number(input.sellingPrice) : Number(existing.sellingPrice);

    if (sellingPrice > mrp) {
      throw ApiError.validation('Pricing error', [
        { field: 'sellingPrice', message: 'Selling price cannot exceed MRP' },
      ]);
    }

    const { attributes, ...scalarInput } = input;
    const data: Prisma.ProductUpdateInput = { ...scalarInput };

    if (typeof input.name === 'string' && input.name !== existing.name) {
      data.slug = await createUniqueSlug(input.name, async (s) =>
        s === existing.slug ? false : productRepository.slugExists(s),
      );
    }

    if (input.mrp !== undefined) data.mrp = new Prisma.Decimal(mrp);
    if (input.sellingPrice !== undefined) data.sellingPrice = new Prisma.Decimal(sellingPrice);

    // Attribute values are replaced wholesale rather than diffed — simpler,
    // and the row count per product is small.
    if (attributes !== undefined) {
      const attributeData = await buildAttributeData(existing.subCategoryId, attributes);

      return prisma.$transaction(async (tx) => {
        await tx.productAttributeValue.deleteMany({ where: { productId: id } });
        return tx.product.update({
          where: { id },
          data: { ...data, attributeValues: { create: attributeData } },
          include: {
            variants: true,
            images: true,
            attributeValues: { include: { attribute: true } },
          },
        });
      });
    }

    return productRepository.update(id, data);
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

  // ---------- Variants ----------

  async addVariant(productId: string, input: VariantInput) {
    const product = await productRepository.findByIdBasic(productId);
    if (!product || product.deletedAt) throw ApiError.notFound('Product not found');

    const sku = generateSku(product.skuPrefix, input.size, input.color);
    if (await variantRepository.skuExists(sku)) {
      throw ApiError.conflict(`SKU "${sku}" already exists`);
    }

    return variantRepository.create({
      productId,
      sku,
      size: input.size,
      color: input.color ?? null,
      colorHex: input.colorHex ?? null,
      priceOverride:
        input.priceOverride !== undefined && input.priceOverride !== null
          ? new Prisma.Decimal(input.priceOverride)
          : null,
      stock: input.stock ?? 0,
      lowStockThreshold: input.lowStockThreshold ?? 5,
      imageUrl: input.imageUrl ?? null,
      isActive: input.isActive ?? true,
    });
  },

  async updateVariant(id: string, input: Partial<VariantInput>) {
    const existing = await variantRepository.findById(id);
    if (!existing) throw ApiError.notFound('Variant not found');

    const data: Prisma.ProductVariantUpdateInput = { ...input };

    if (input.priceOverride !== undefined) {
      data.priceOverride =
        input.priceOverride === null ? null : new Prisma.Decimal(input.priceOverride);
    }

    return variantRepository.update(id, data);
  },

  async deleteVariant(id: string) {
    const existing = await variantRepository.findById(id);
    if (!existing) throw ApiError.notFound('Variant not found');

    const remaining = await variantRepository.countActiveByProduct(existing.productId);
    if (remaining <= 1) {
      throw ApiError.conflict('A product must have at least one variant');
    }

    return variantRepository.delete(id);
  },

  // ---------- Images ----------

  async attachImages(productId: string, images: ImageInput[]) {
    const product = await productRepository.findByIdBasic(productId);
    if (!product || product.deletedAt) throw ApiError.notFound('Product not found');

    const existingCount = await imageRepository.countByProduct(productId);
    if (existingCount + images.length > UPLOAD.MAX_PRODUCT_IMAGES) {
      throw ApiError.badRequest(
        `A product can have at most ${UPLOAD.MAX_PRODUCT_IMAGES} images (currently ${existingCount})`,
      );
    }

    await imageRepository.createMany(
      images.map((img, index) => ({
        productId,
        url: img.url,
        publicId: img.publicId,
        altText: img.altText ?? product.name,
        displayOrder: img.displayOrder ?? existingCount + index,
        isPrimary: existingCount === 0 && index === 0,
      })),
    );

    return imageRepository.findByProduct(productId);
  },

  async deleteImage(id: string) {
    const image = await imageRepository.findById(id);
    if (!image) throw ApiError.notFound('Image not found');

    await imageRepository.delete(id);
    // Remove from Cloudinary after the DB row is gone. Best-effort.
    void deleteAsset(image.publicId);

    // If the primary image was removed, promote the next one.
    if (image.isPrimary) {
      const remaining = await imageRepository.findByProduct(image.productId);
      if (remaining.length > 0) {
        await imageRepository.reorder(
          image.productId,
          remaining.map((img, index) => ({
            id: img.id,
            displayOrder: index,
            isPrimary: index === 0,
          })),
        );
      }
    }
  },

  async reorderImages(items: { id: string; displayOrder: number; isPrimary?: boolean }[]) {
    const first = await imageRepository.findById(items[0].id);
    if (!first) throw ApiError.notFound('Image not found');
    await imageRepository.reorder(first.productId, items);
    return imageRepository.findByProduct(first.productId);
  },
};
