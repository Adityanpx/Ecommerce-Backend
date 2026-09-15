import { z } from 'zod';

const uuid = z.string().uuid('Invalid id');

const seoFields = {
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
};

export const createSportSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(120),
    description: z.string().max(2000).nullable().optional(),
    iconUrl: z.string().url().nullable().optional(),
    bannerUrl: z.string().url().nullable().optional(),
    heroTitle: z.string().max(255).nullable().optional(),
    heroSubtitle: z.string().max(255).nullable().optional(),
    heroDescription: z.string().max(2000).nullable().optional(),
    heroCtaText: z.string().max(100).nullable().optional(),
    heroCtaLink: z.string().max(500).nullable().optional(),
    heroSecondaryCtaText: z.string().max(100).nullable().optional(),
    heroSecondaryCtaLink: z.string().max(500).nullable().optional(),
    heroBadges: z.array(z.string().max(50)).default([]),
    highlights: z
      .array(
        z.object({
          label: z.string().max(50),
          value: z.string().max(100),
          description: z.string().max(255).optional(),
        }),
      )
      .nullable()
      .optional(),
    displayOrder: z.coerce.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
    ...seoFields,
  }),
});

export const updateSportSchema = z.object({
  params: z.object({ id: uuid }),
  body: createSportSchema.shape.body.partial(),
});

export const createSubCategorySchema = z.object({
  body: z.object({
    sportId: uuid,
    name: z.string().min(1, 'Name is required').max(120),
    description: z.string().max(2000).nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    gstRate: z.coerce.number().min(0).max(100).nullable().optional(),
    displayOrder: z.coerce.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
    ...seoFields,
  }),
});

export const updateSubCategorySchema = z.object({
  params: z.object({ id: uuid }),
  body: createSubCategorySchema.shape.body.partial().omit({ sportId: true }),
});

const attributeTypeEnum = z.enum(['TEXT', 'NUMBER', 'DROPDOWN', 'MULTI_SELECT', 'BOOLEAN']);

export const createAttributeSchema = z.object({
  body: z
    .object({
      subCategoryId: uuid,
      name: z.string().min(1, 'Name is required').max(120),
      type: attributeTypeEnum,
      options: z.array(z.string().min(1)).min(1).optional(),
      unit: z.string().max(20).nullable().optional(),
      isRequired: z.boolean().default(false),
      isFilterable: z.boolean().default(false),
      displayOrder: z.coerce.number().int().min(0).default(0),
    })
    // DROPDOWN and MULTI_SELECT are meaningless without options to pick from.
    .refine(
      (data) =>
        !['DROPDOWN', 'MULTI_SELECT'].includes(data.type) ||
        (data.options !== undefined && data.options.length > 0),
      {
        message: 'options are required for DROPDOWN and MULTI_SELECT attributes',
        path: ['options'],
      },
    ),
});

export const updateAttributeSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    options: z.array(z.string().min(1)).min(1).optional(),
    unit: z.string().max(20).nullable().optional(),
    isRequired: z.boolean().optional(),
    isFilterable: z.boolean().optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
  }),
});

export const reorderAttributesSchema = z.object({
  body: z.object({
    items: z.array(z.object({ id: uuid, displayOrder: z.number().int().min(0) })).min(1),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: uuid }),
});

export const slugParamSchema = z.object({
  params: z.object({ slug: z.string().min(1) }),
});
