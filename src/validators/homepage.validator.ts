import { z } from 'zod';

const uuid = z.string().uuid('Invalid id');

// ---------- Announcement Items ----------

export const createAnnouncementSchema = z.object({
  body: z.object({
    text: z.string().min(1).max(255),
    linkUrl: z.string().url().nullable().optional(),
    linkText: z.string().max(100).nullable().optional(),
    emoji: z.string().max(10).nullable().optional(),
    isActive: z.boolean().default(true),
    displayOrder: z.coerce.number().int().min(0).default(0),
  }),
});

export const updateAnnouncementSchema = z.object({
  params: z.object({ id: uuid }),
  body: createAnnouncementSchema.shape.body.partial(),
});

// ---------- Trust Badges ----------

export const createTrustBadgeSchema = z.object({
  body: z.object({
    icon: z.string().min(1).max(50),
    title: z.string().min(1).max(120),
    subtitle: z.string().max(255).nullable().optional(),
    isActive: z.boolean().default(true),
    displayOrder: z.coerce.number().int().min(0).default(0),
  }),
});

export const updateTrustBadgeSchema = z.object({
  params: z.object({ id: uuid }),
  body: createTrustBadgeSchema.shape.body.partial(),
});

// ---------- Testimonials ----------

export const createTestimonialSchema = z.object({
  body: z.object({
    authorName: z.string().min(1).max(150),
    authorTitle: z.string().max(150).nullable().optional(),
    authorAvatar: z.string().url().nullable().optional(),
    rating: z.coerce.number().min(1).max(5).multipleOf(0.5),
    text: z.string().min(10).max(2000),
    sportId: uuid.nullable().optional(),
    isActive: z.boolean().default(true),
    displayOrder: z.coerce.number().int().min(0).default(0),
  }),
});

export const updateTestimonialSchema = z.object({
  params: z.object({ id: uuid }),
  body: createTestimonialSchema.shape.body.partial(),
});

// ---------- Collections ----------

export const createCollectionSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(150),
    type: z.enum(['CURATED', 'TRENDING', 'BEST_SELLERS', 'NEW_ARRIVALS']).default('CURATED'),
    description: z.string().max(2000).nullable().optional(),
    sportId: uuid.nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    isActive: z.boolean().default(true),
    displayOrder: z.coerce.number().int().min(0).default(0),
  }),
});

export const updateCollectionSchema = z.object({
  params: z.object({ id: uuid }),
  body: createCollectionSchema.shape.body.partial(),
});

export const setCollectionProductsSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    productIds: z.array(uuid).min(1).max(50),
  }),
});

// ---------- Featured Spotlights ----------

export const upsertSpotlightSchema = z.object({
  body: z.object({
    key: z.string().min(1).max(100),
    title: z.string().max(255).nullable().optional(),
    subtitle: z.string().max(255).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    productId: uuid,
    isActive: z.boolean().default(true),
  }),
});
