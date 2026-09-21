import { z } from 'zod';
import { isValidChartKey } from '../config/sizeCharts';

const uuid = z.string().uuid('Invalid id');

const variantInput = z.object({
  // Optional: one-size products (bags, balls) have no size. Blank normalises to null.
  size: z
    .string()
    .max(50)
    .nullable()
    .optional()
    .transform((value) => value?.trim() || null),
  color: z.string().max(50).nullable().optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'colorHex must be a hex colour like #1A2B3C')
    .nullable()
    .optional(),
  priceOverride: z.coerce.number().min(0).nullable().optional(),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().default(true),
});

const imageInput = z.object({
  url: z.string().url('Invalid image url'),
  publicId: z.string().min(1, 'publicId is required'),
  altText: z.string().max(255).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

/**
 * Attribute values arrive keyed by attribute code, with a loose value type.
 * They cannot be strictly typed here because the valid shape depends on the
 * attribute's `type`, which lives in the database. productService validates
 * each value against its definition after loading them.
 */
const attributeValuesInput = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
);

export const createProductSchema = z.object({
  body: z.object({
    subCategoryId: uuid,
    name: z.string().min(1, 'Name is required').max(255),
    brand: z.string().max(120).nullable().optional(),
    /** Preferred: link to a Brand record. `brand` (free text) is kept for legacy clients. */
    brandId: uuid.nullable().optional(),
    description: z.string().max(20000).nullable().optional(),
    shortDescription: z.string().max(500).nullable().optional(),
    mrp: z.coerce.number().min(0, 'MRP cannot be negative'),
    sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative'),
    skuPrefix: z.string().max(50).nullable().optional(),
    hsnCode: z.string().max(20).nullable().optional(),
    gstRate: z.coerce.number().min(0).max(100).nullable().optional(),
    weightGrams: z.coerce.number().int().min(0).nullable().optional(),
    isOversized: z.boolean().default(false),
    shippingCharge: z.coerce.number().min(0).nullable().optional(),
    highlights: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
    packageContents: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
    /** null = auto-detect, 'none' = no size guide, otherwise a built-in chart key. */
    sizeChartKey: z
      .string()
      .max(60)
      .refine(isValidChartKey, 'Unknown size chart')
      .nullable()
      .optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'OUT_OF_STOCK']).default('DRAFT'),
    metaTitle: z.string().max(255).nullable().optional(),
    metaDescription: z.string().max(500).nullable().optional(),
    attributes: attributeValuesInput.optional(),
    variants: z.array(variantInput).min(1, 'At least one variant is required'),
    images: z.array(imageInput).default([]),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: uuid }),
  body: createProductSchema.shape.body
    .partial()
    .omit({ subCategoryId: true, variants: true, images: true }),
});

export const createVariantSchema = z.object({
  params: z.object({ id: uuid }),
  body: variantInput,
});

export const updateVariantSchema = z.object({
  params: z.object({ id: uuid }),
  body: variantInput.partial().omit({ size: true }),
});

export const attachImagesSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({ images: z.array(imageInput).min(1) }),
});

export const reorderImagesSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: uuid,
          displayOrder: z.number().int().min(0),
          isPrimary: z.boolean().optional(),
        }),
      )
      .min(1),
  }),
});

export const bulkProductActionSchema = z.object({
  body: z.object({
    ids: z.array(uuid).min(1, 'Select at least one product'),
    action: z.enum(['ACTIVATE', 'DEACTIVATE', 'DELETE']),
  }),
});

export const uploadSignatureSchema = z.object({
  body: z.object({
    folder: z.enum(['products', 'banners', 'returns', 'avatars', 'categories', 'brands']),
    // S3-style presigning binds the content-type into the signed URL itself,
    // so the client must declare it up front (Cloudinary's signature didn't need this).
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  }),
});
