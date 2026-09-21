import {
  AnnouncementItem,
  TrustBadge,
  Testimonial,
  Collection,
  FeaturedSpotlight,
  Prisma,
} from '@prisma/client';
import { prisma } from '../config/database';

/**
 * A product the storefront can actually open: not deleted, and ACTIVE or OUT_OF_STOCK
 * (the same rule the product page uses). Homepage sections must never link to anything else —
 * a DRAFT product has no page, so the link would 404.
 */
const STOREFRONT_VISIBLE_PRODUCT: Prisma.ProductWhereInput = {
  deletedAt: null,
  status: { in: ['ACTIVE', 'OUT_OF_STOCK'] },
};

export const homepageRepository = {
  // ---------- Announcement Items ----------

  findAnnouncements(activeOnly: boolean): Promise<AnnouncementItem[]> {
    return prisma.announcementItem.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { displayOrder: 'asc' },
    });
  },

  findAnnouncementById(id: string): Promise<AnnouncementItem | null> {
    return prisma.announcementItem.findUnique({ where: { id } });
  },

  createAnnouncement(data: Prisma.AnnouncementItemCreateInput): Promise<AnnouncementItem> {
    return prisma.announcementItem.create({ data });
  },

  updateAnnouncement(
    id: string,
    data: Prisma.AnnouncementItemUpdateInput,
  ): Promise<AnnouncementItem> {
    return prisma.announcementItem.update({ where: { id }, data });
  },

  deleteAnnouncement(id: string): Promise<AnnouncementItem> {
    return prisma.announcementItem.delete({ where: { id } });
  },

  // ---------- Trust Badges ----------

  findTrustBadges(activeOnly: boolean): Promise<TrustBadge[]> {
    return prisma.trustBadge.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { displayOrder: 'asc' },
    });
  },

  findTrustBadgeById(id: string): Promise<TrustBadge | null> {
    return prisma.trustBadge.findUnique({ where: { id } });
  },

  createTrustBadge(data: Prisma.TrustBadgeCreateInput): Promise<TrustBadge> {
    return prisma.trustBadge.create({ data });
  },

  updateTrustBadge(id: string, data: Prisma.TrustBadgeUpdateInput): Promise<TrustBadge> {
    return prisma.trustBadge.update({ where: { id }, data });
  },

  deleteTrustBadge(id: string): Promise<TrustBadge> {
    return prisma.trustBadge.delete({ where: { id } });
  },

  // ---------- Testimonials ----------

  findTestimonials(activeOnly: boolean, sportId?: string): Promise<Testimonial[]> {
    const where: Prisma.TestimonialWhereInput = {
      ...(activeOnly ? { isActive: true } : {}),
      ...(sportId ? { sportId } : {}),
    };
    return prisma.testimonial.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: { sport: { select: { id: true, name: true, slug: true } } },
    });
  },

  findTestimonialById(id: string): Promise<Testimonial | null> {
    return prisma.testimonial.findUnique({ where: { id } });
  },

  createTestimonial(data: Prisma.TestimonialUncheckedCreateInput): Promise<Testimonial> {
    return prisma.testimonial.create({ data });
  },

  updateTestimonial(
    id: string,
    data: Prisma.TestimonialUncheckedUpdateInput,
  ): Promise<Testimonial> {
    return prisma.testimonial.update({ where: { id }, data });
  },

  deleteTestimonial(id: string): Promise<Testimonial> {
    return prisma.testimonial.delete({ where: { id } });
  },

  // ---------- Collections ----------

  findCollections(activeOnly: boolean, sportId?: string) {
    const where: Prisma.CollectionWhereInput = {
      ...(activeOnly ? { isActive: true } : {}),
      ...(sportId !== undefined ? { sportId } : {}),
    };
    return prisma.collection.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        // Admin (activeOnly = false) sees every linked product; the storefront only live ones.
        _count: {
          select: {
            products: activeOnly ? { where: { product: STOREFRONT_VISIBLE_PRODUCT } } : true,
          },
        },
        sport: { select: { id: true, name: true, slug: true } },
      },
    });
  },

  findCollectionById(id: string) {
    return prisma.collection.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { displayOrder: 'asc' },
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                variants: { where: { isActive: true }, select: { id: true, stock: true } },
                subCategory: {
                  select: { name: true, slug: true, sport: { select: { name: true, slug: true } } },
                },
              },
            },
          },
        },
        sport: { select: { id: true, name: true, slug: true } },
      },
    });
  },

  findCollectionBySlug(slug: string) {
    return prisma.collection.findUnique({
      where: { slug },
      include: {
        products: {
          where: { product: STOREFRONT_VISIBLE_PRODUCT },
          orderBy: { displayOrder: 'asc' },
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                variants: { where: { isActive: true }, select: { id: true, stock: true } },
                subCategory: {
                  select: { name: true, slug: true, sport: { select: { name: true, slug: true } } },
                },
              },
            },
          },
        },
      },
    });
  },

  createCollection(data: Prisma.CollectionUncheckedCreateInput): Promise<Collection> {
    return prisma.collection.create({ data });
  },

  updateCollection(id: string, data: Prisma.CollectionUncheckedUpdateInput): Promise<Collection> {
    return prisma.collection.update({ where: { id }, data });
  },

  deleteCollection(id: string): Promise<Collection> {
    return prisma.collection.delete({ where: { id } });
  },

  async setCollectionProducts(collectionId: string, productIds: string[]): Promise<void> {
    await prisma.$transaction([
      prisma.collectionProduct.deleteMany({ where: { collectionId } }),
      prisma.collectionProduct.createMany({
        data: productIds.map((productId, i) => ({
          collectionId,
          productId,
          displayOrder: i,
        })),
      }),
    ]);
  },

  // ---------- Featured Spotlights ----------

  findSpotlights(activeOnly: boolean) {
    return prisma.featuredSpotlight.findMany({
      where: activeOnly ? { isActive: true } : {},
      include: {
        product: {
          include: {
            images: { orderBy: { displayOrder: 'asc' }, take: 5 },
            variants: { where: { isActive: true } },
            subCategory: {
              select: { name: true, slug: true, sport: { select: { name: true, slug: true } } },
            },
          },
        },
      },
    });
  },

  findSpotlightByKey(key: string) {
    return prisma.featuredSpotlight.findUnique({
      where: { key },
      include: {
        product: {
          include: {
            images: { orderBy: { displayOrder: 'asc' }, take: 5 },
            variants: { where: { isActive: true } },
            subCategory: {
              select: { name: true, slug: true, sport: { select: { name: true, slug: true } } },
            },
          },
        },
      },
    });
  },

  upsertSpotlight(data: {
    key: string;
    title?: string | null;
    subtitle?: string | null;
    description?: string | null;
    productId: string;
    isActive?: boolean;
  }): Promise<FeaturedSpotlight> {
    return prisma.featuredSpotlight.upsert({
      where: { key: data.key },
      create: data,
      update: data,
    });
  },

  deleteSpotlight(key: string): Promise<FeaturedSpotlight> {
    return prisma.featuredSpotlight.delete({ where: { key } });
  },
};
