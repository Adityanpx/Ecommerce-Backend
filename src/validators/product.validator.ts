import { z } from 'zod';
import { isValidChartKey } from '../config/sizeCharts';
import { CATALOG, UPLOAD } from '../config/constants';

const uuid = z.string().uuid('Invalid id');

/** "#aabbcc" → "#AABBCC". Stored upper-case so swatch comparisons are exact. */
const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Colour must be a hex value like #1A2B3C')
  .transform((v) => v.toUpperCase());

const money = z.coerce.number().min(0, 'Cannot be negative').max(10_000_000);

/** Blank strings from form inputs become null. */
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v?.trim() || null));

/** Custom SKU. Upper-cased; letters, digits and dashes only. */
const skuField = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .transform((v) => v.toUpperCase())
  .refine((v) => /^[A-Z0-9-]+$/.test(v), 'SKU may contain only letters, numbers and dashes');

const barcodeField = z
  .string()
  .trim()
  .max(64)
  .regex(/^[0-9A-Za-z-]*$/, 'Barcode may contain only letters, numbers and dashes')
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null));

const sizeField = z
  .string()
  .max(50)
  .nullable()
  .optional()
  .transform((value) => value?.trim() || null);

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

const imageInput = z.object({
  url: z.string().url('Invalid image url'),
  publicId: z.string().min(1, 'publicId is required'),
  altText: z.string().max(255).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
  /** Reported by the admin uploader after reading the file. Used for the resolution check. */
  width: z.coerce.number().int().positive().nullable().optional(),
  height: z.coerce.number().int().positive().nullable().optional(),
  sizeBytes: z.coerce.number().int().positive().nullable().optional(),
});

/** Image attached to an existing product; colorId null/absent = shared image. */
const attachImageInput = imageInput.extend({
  colorId: uuid.nullable().optional(),
});

// ---------------------------------------------------------------------------
// Variants & colours
// ---------------------------------------------------------------------------

const variantInput = z.object({
  // Optional: one-size products (bags, balls) have no size. Blank normalises to null.
  size: sizeField,
  /** Legacy: free-text colour. Ignored when the product is created with `colors`. */
  color: z.string().max(50).nullable().optional(),
  colorHex: hexColor.nullable().optional(),
  /** New flow: links this variant to one of the `colors[].key` in the same request. */
  colorKey: z.string().min(1).max(40).nullable().optional(),
  /** Leave empty to auto-generate PREFIX-SIZE-COLOUR. */
  sku: skuField.optional(),
  barcode: barcodeField,
  priceOverride: money.nullable().optional(),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().default(true),
});

/** One size row inside a colour (add-colour and add-sizes flows). */
const sizeRowInput = z.object({
  size: sizeField,
  sku: skuField.optional(),
  barcode: barcodeField,
  priceOverride: money.nullable().optional(),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
});

const colorFields = {
  name: z.string().trim().min(1, 'Colour name is required').max(50),
  hex: hexColor.nullable().optional(),
  secondaryHex: hexColor.nullable().optional(),
  /** Set when picked from the colour library. */
  swatchId: uuid.nullable().optional(),
  /** null = same as the product. */
  mrp: money.nullable().optional(),
  sellingPrice: money.nullable().optional(),
  costPrice: money.nullable().optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
};

const colorInput = z.object({
  /** Client-side id so variants in the same request can point at this colour. */
  key: z.string().min(1).max(40),
  ...colorFields,
  images: z.array(imageInput).max(UPLOAD.MAX_IMAGES_PER_COLOR).default([]),
});

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

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

const tagsField = z
  .array(z.string().trim().min(1).max(30))
  .max(CATALOG.MAX_TAGS, `At most ${CATALOG.MAX_TAGS} tags`);

const keywordsField = z
  .array(z.string().trim().min(1).max(50))
  .max(CATALOG.MAX_SEARCH_KEYWORDS, `At most ${CATALOG.MAX_SEARCH_KEYWORDS} keywords`);

const productFields = {
  subCategoryId: uuid,
  name: z.string().trim().min(1, 'Name is required').max(255),
  brand: z.string().max(120).nullable().optional(),
  /** Preferred: link to a Brand record. `brand` (free text) is kept for legacy clients. */
  brandId: uuid.nullable().optional(),
  description: z.string().max(20000).nullable().optional(),
  shortDescription: z.string().max(500).nullable().optional(),
  mrp: money,
  sellingPrice: money,
  costPrice: money.nullable().optional(),
  skuPrefix: z.string().max(50).nullable().optional(),
  hsnCode: z.string().max(20).nullable().optional(),
  gstRate: z.coerce.number().min(0).max(100).nullable().optional(),
  weightGrams: z.coerce.number().int().min(0).nullable().optional(),
  isOversized: z.boolean().default(false),
  shippingCharge: money.nullable().optional(),
  highlights: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  packageContents: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  /** null = auto-detect, 'none' = no size guide, otherwise a built-in chart key. */
  sizeChartKey: z
    .string()
    .max(60)
    .refine(isValidChartKey, 'Unknown size chart')
    .nullable()
    .optional(),
  sizeSystem: optionalText(30),
  videoUrl: z.string().url('Enter a valid video link').max(2000).nullable().optional(),
  tags: tagsField.default([]),
  searchKeywords: keywordsField.default([]),
  maxOrderQuantity: z.coerce
    .number()
    .int()
    .min(1)
    .max(CATALOG.MAX_ORDER_QUANTITY_CEILING)
    .nullable()
    .optional(),
  isReturnable: z.boolean().default(true),
  returnWindowDays: z.coerce.number().int().min(0).max(90).nullable().optional(),
  codAvailable: z.boolean().default(true),
  countryOfOrigin: optionalText(80),
  manufacturerDetails: optionalText(1000),
  packerDetails: optionalText(1000),
  importerDetails: optionalText(1000),
  netQuantity: optionalText(60),
  warrantyInfo: optionalText(255),
  status: z.enum(['DRAFT', 'ACTIVE', 'OUT_OF_STOCK']).default('DRAFT'),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  attributes: attributeValuesInput.optional(),
};

export const createProductSchema = z.object({
  body: z
    .object({
      ...productFields,
      /** New flow: colours with their own photos/prices. Empty = product has no colours. */
      colors: z
        .array(colorInput)
        .max(CATALOG.MAX_COLORS_PER_PRODUCT, `At most ${CATALOG.MAX_COLORS_PER_PRODUCT} colours`)
        .default([]),
      variants: z.array(variantInput).min(1, 'At least one variant is required').max(500),
      /** Shared photos shown for every colour. */
      images: z.array(imageInput).max(UPLOAD.MAX_PRODUCT_IMAGES).default([]),
      relatedProductIds: z.array(uuid).max(CATALOG.MAX_RELATED_PRODUCTS).default([]),
      boughtTogetherIds: z.array(uuid).max(CATALOG.MAX_RELATED_PRODUCTS).default([]),
      /** When the product was built from an autosaved draft, the draft is deleted on success. */
      draftId: uuid.optional(),
    })
    .superRefine((body, ctx) => {
      const keys = new Set<string>();
      const names = new Set<string>();
      body.colors.forEach((c, i) => {
        if (keys.has(c.key)) {
          ctx.addIssue({ code: 'custom', path: ['colors', i, 'key'], message: 'Duplicate key' });
        }
        const lower = c.name.toLowerCase();
        if (names.has(lower)) {
          ctx.addIssue({
            code: 'custom',
            path: ['colors', i, 'name'],
            message: `Colour "${c.name}" is listed twice`,
          });
        }
        keys.add(c.key);
        names.add(lower);
      });

      if (body.colors.filter((c) => c.isDefault).length > 1) {
        ctx.addIssue({ code: 'custom', path: ['colors'], message: 'Only one default colour' });
      }

      body.variants.forEach((v, i) => {
        if (body.colors.length > 0) {
          if (!v.colorKey || !keys.has(v.colorKey)) {
            ctx.addIssue({
              code: 'custom',
              path: ['variants', i, 'colorKey'],
              message: 'Every size must belong to one of the colours',
            });
          }
        } else if (v.colorKey) {
          ctx.addIssue({
            code: 'custom',
            path: ['variants', i, 'colorKey'],
            message: 'colorKey given but the product has no colours',
          });
        }
      });
    }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object(productFields).partial().omit({ subCategoryId: true }),
});

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

export const createColorSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    ...colorFields,
    images: z.array(imageInput).max(UPLOAD.MAX_IMAGES_PER_COLOR).default([]),
    /** Sizes to create in this colour. Can be empty when copyFromColorId is used. */
    sizes: z.array(sizeRowInput).max(100).default([]),
    /**
     * "Add colour like this one": copies the sizes (stock 0, thresholds kept) and the
     * colour-level prices from an existing colour of the same product. Explicit
     * `sizes`/prices in this request win over the copied ones.
     */
    copyFromColorId: uuid.optional(),
  }),
});

export const updateColorSchema = z.object({
  params: z.object({ id: uuid }),
  body: z
    .object({
      name: colorFields.name,
      hex: colorFields.hex,
      secondaryHex: colorFields.secondaryHex,
      swatchId: colorFields.swatchId,
      mrp: colorFields.mrp,
      sellingPrice: colorFields.sellingPrice,
      costPrice: colorFields.costPrice,
      isActive: z.boolean(),
      isDefault: z.literal(true),
    })
    .partial()
    .refine((b) => Object.keys(b).length > 0, 'Nothing to update'),
});

export const reorderColorsSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    items: z
      .array(z.object({ id: uuid, displayOrder: z.number().int().min(0) }))
      .min(1)
      .max(CATALOG.MAX_COLORS_PER_PRODUCT),
  }),
});

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export const createVariantSchema = z.object({
  params: z.object({ id: uuid }),
  body: sizeRowInput.extend({
    /** Required when the product has colours. */
    colorId: uuid.nullable().optional(),
    /** Legacy colour fields — only used for products without colours (old admin UI). */
    color: z.string().max(50).nullable().optional(),
    colorHex: hexColor.nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
  }),
});

export const bulkCreateVariantsSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    colorId: uuid.nullable().optional(),
    sizes: z.array(sizeRowInput).min(1).max(100),
  }),
});

export const updateVariantSchema = z.object({
  params: z.object({ id: uuid }),
  body: z
    .object({
      sku: skuField,
      barcode: barcodeField,
      priceOverride: money.nullable(),
      /** Setting stock here is logged as MANUAL_ADJUSTMENT. Prefer the stock-adjustment endpoint. */
      stock: z.coerce.number().int().min(0),
      lowStockThreshold: z.coerce.number().int().min(0),
      imageUrl: z.string().url().nullable(),
      isActive: z.boolean(),
    })
    .partial(),
});

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------

const manualStockReason = z
  .enum(['RESTOCK', 'DAMAGED', 'CORRECTION', 'MANUAL_ADJUSTMENT'])
  .default('MANUAL_ADJUSTMENT');

export const stockAdjustmentSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    /** SET = make stock exactly `quantity`; ADD / REMOVE = change by `quantity`. */
    mode: z.enum(['SET', 'ADD', 'REMOVE']),
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    reason: manualStockReason,
    note: z.string().trim().max(500).optional(),
  }),
});

export const stockGridSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    /** One entry per changed cell of the colour × size grid. */
    items: z
      .array(
        z.object({
          variantId: uuid,
          stock: z.coerce.number().int().min(0).max(1_000_000),
          lowStockThreshold: z.coerce.number().int().min(0).optional(),
        }),
      )
      .min(1)
      .max(500),
    reason: manualStockReason,
    note: z.string().trim().max(500).optional(),
  }),
});

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export const attachImagesSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({ images: z.array(attachImageInput).min(1).max(UPLOAD.MAX_IMAGES_PER_COLOR) }),
});

export const reorderImagesSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: uuid,
          displayOrder: z.number().int().min(0),
          isPrimary: z.boolean().optional(),
          /** Moving a photo to another colour (or to shared = null) while reordering. */
          colorId: uuid.nullable().optional(),
        }),
      )
      .min(1),
  }),
});

export const updateImageSchema = z.object({
  params: z.object({ id: uuid }),
  body: z
    .object({
      altText: z.string().trim().max(255).nullable(),
      colorId: uuid.nullable(),
    })
    .partial()
    .refine((b) => Object.keys(b).length > 0, 'Nothing to update'),
});

// ---------------------------------------------------------------------------
// Bulk, duplicate, relations
// ---------------------------------------------------------------------------

export const bulkProductActionSchema = z.object({
  body: z.object({
    ids: z.array(uuid).min(1, 'Select at least one product'),
    action: z.enum(['ACTIVATE', 'DEACTIVATE', 'DELETE']),
  }),
});

export const bulkEditSchema = z.object({
  body: z.object({
    ids: z.array(uuid).min(1, 'Select at least one product').max(200),
    changes: z
      .object({
        status: z.enum(['DRAFT', 'ACTIVE', 'OUT_OF_STOCK']),
        /** Moving category deletes spec values (they belong to the old category's attributes). */
        subCategoryId: uuid,
        brandId: uuid.nullable(),
        addTags: tagsField,
        removeTags: tagsField,
        isReturnable: z.boolean(),
        returnWindowDays: z.coerce.number().int().min(0).max(90).nullable(),
        codAvailable: z.boolean(),
        maxOrderQuantity: z.coerce
          .number()
          .int()
          .min(1)
          .max(CATALOG.MAX_ORDER_QUANTITY_CEILING)
          .nullable(),
        price: z.object({
          /**
           * SET_SELLING      selling price = value
           * SET_MRP          MRP = value
           * PERCENT_OFF_MRP  selling = MRP − value%          (e.g. 20 → 20% off MRP)
           * PERCENT_CHANGE   selling × (1 + value/100)       (value may be negative)
           * AMOUNT_CHANGE    selling + value                 (value may be negative)
           */
          mode: z.enum([
            'SET_SELLING',
            'SET_MRP',
            'PERCENT_OFF_MRP',
            'PERCENT_CHANGE',
            'AMOUNT_CHANGE',
          ]),
          value: z.coerce.number().min(-10_000_000).max(10_000_000),
          /** Also apply to colour-level prices and size price overrides. Default true. */
          includeColorAndSizePrices: z.boolean().default(true),
          /** Round resulting prices to the nearest rupee (default) — 1799.4 → 1799. */
          roundToRupee: z.boolean().default(true),
        }),
      })
      .partial()
      .refine((c) => Object.keys(c).length > 0, 'Choose at least one change'),
  }),
});

export const duplicateProductSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    /** Defaults to "<original name> (Copy)". */
    name: z.string().trim().min(1).max(255).optional(),
    copyImages: z.boolean().default(true),
  }),
});

export const setRelationsSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    related: z.array(uuid).max(CATALOG.MAX_RELATED_PRODUCTS).default([]),
    boughtTogether: z.array(uuid).max(CATALOG.MAX_RELATED_PRODUCTS).default([]),
  }),
});

// ---------------------------------------------------------------------------
// Library: colours & size presets
// ---------------------------------------------------------------------------

export const createSwatchSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(50),
    hex: hexColor,
    secondaryHex: hexColor.nullable().optional(),
    isActive: z.boolean().default(true),
  }),
});

export const updateSwatchSchema = z.object({
  params: z.object({ id: uuid }),
  body: createSwatchSchema.shape.body.partial(),
});

export const createSizePresetSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(80),
    sizeSystem: optionalText(30),
    sizes: z
      .array(z.string().trim().min(1).max(50))
      .min(1, 'Add at least one size')
      .max(60)
      .refine(
        (sizes) => new Set(sizes.map((s) => s.toLowerCase())).size === sizes.length,
        'Sizes must be unique',
      ),
    subCategoryId: uuid.nullable().optional(),
    isActive: z.boolean().default(true),
    displayOrder: z.coerce.number().int().min(0).default(0),
  }),
});

export const updateSizePresetSchema = z.object({
  params: z.object({ id: uuid }),
  body: createSizePresetSchema.shape.body.partial(),
});

// ---------------------------------------------------------------------------
// Drafts (autosave)
// ---------------------------------------------------------------------------

export const saveDraftSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    /** Set when the draft is an edit of an existing product. */
    productId: uuid.nullable().optional(),
    title: z.string().trim().max(255).nullable().optional(),
    /** The admin form state, stored as-is. */
    data: z.record(z.unknown()),
  }),
});

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export const uploadSignatureSchema = z.object({
  body: z
    .object({
      folder: z.enum([
        'products',
        'banners',
        'returns',
        'avatars',
        'categories',
        'brands',
        'videos',
      ]),
      // S3-style presigning binds the content-type into the signed URL itself,
      // so the client must declare it up front (Cloudinary's signature didn't need this).
      contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
      /** File size in bytes. Required for videos (signed into the URL to enforce the limit). */
      contentLength: z.coerce.number().int().positive().optional(),
    })
    .superRefine((body, ctx) => {
      const isVideo = body.contentType.startsWith('video/');
      if (isVideo !== (body.folder === 'videos')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contentType'],
          message: 'Videos go to the "videos" folder, and that folder accepts only videos',
        });
      }
      if (body.folder === 'videos' && body.contentLength === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contentLength'],
          message: 'contentLength is required for video uploads',
        });
      }
    }),
});
