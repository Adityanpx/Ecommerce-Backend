import { z } from 'zod';

const uuid = z.string().uuid('Invalid id');

export const createBannerSchema = z.object({
  body: z.object({
    title: z.string().max(150).nullable().optional(),
    imageUrl: z.string().url('Invalid image URL'),
    mobileImageUrl: z.string().url().nullable().optional(),
    publicId: z.string().min(1),
    linkUrl: z.string().max(500).nullable().optional(),
    subtitle: z.string().max(255).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    ctaText: z.string().max(100).nullable().optional(),
    ctaLink: z.string().max(500).nullable().optional(),
    secondaryCtaText: z.string().max(100).nullable().optional(),
    secondaryCtaLink: z.string().max(500).nullable().optional(),
    position: z.enum(['HERO', 'CAROUSEL', 'PROMO_MID']).default('CAROUSEL'),
    featuredProductId: z.string().uuid().nullable().optional(),
    displayOrder: z.coerce.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
  }),
});

export const updateBannerSchema = z.object({
  params: z.object({ id: uuid }),
  body: createBannerSchema.shape.body.partial(),
});

export const upsertPageSchema = z.object({
  body: z.object({
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/, 'Slug may contain lowercase letters, numbers and hyphens only'),
    title: z.string().min(1).max(200),
    content: z.string().min(1),
    metaTitle: z.string().max(255).nullable().optional(),
    metaDescription: z.string().max(500).nullable().optional(),
    isPublished: z.boolean().default(true),
  }),
});

export const contactFormSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(150),
    email: z.string().email('Enter a valid email'),
    phone: z.string().max(15).optional(),
    subject: z.string().min(1, 'Subject is required').max(255),
    message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  }),
});

export const updateSettingsSchema = z.object({
  body: z.object({
    settings: z
      .array(
        z.object({
          key: z.string().min(1).max(100),
          value: z.union([z.string(), z.number(), z.boolean()]),
        }),
      )
      .min(1),
  }),
});
