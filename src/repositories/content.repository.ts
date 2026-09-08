import { Banner, ContactMessage, Prisma, StaticPage } from '@prisma/client';
import { prisma } from '../config/database';

export const contentRepository = {
  // ---------- Banners ----------

  findBanners(activeOnly: boolean): Promise<Banner[]> {
    return prisma.banner.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { displayOrder: 'asc' },
    });
  },

  findBannerById(id: string): Promise<Banner | null> {
    return prisma.banner.findUnique({ where: { id } });
  },

  createBanner(data: Prisma.BannerUncheckedCreateInput): Promise<Banner> {
    return prisma.banner.create({ data });
  },

  updateBanner(id: string, data: Prisma.BannerUpdateInput): Promise<Banner> {
    return prisma.banner.update({ where: { id }, data });
  },

  deleteBanner(id: string): Promise<Banner> {
    return prisma.banner.delete({ where: { id } });
  },

  // ---------- Static pages ----------

  findPages(publishedOnly: boolean): Promise<StaticPage[]> {
    return prisma.staticPage.findMany({
      where: publishedOnly ? { isPublished: true } : {},
      orderBy: { slug: 'asc' },
    });
  },

  findPageBySlug(slug: string, publishedOnly: boolean): Promise<StaticPage | null> {
    return prisma.staticPage.findFirst({
      where: { slug, ...(publishedOnly ? { isPublished: true } : {}) },
    });
  },

  upsertPage(data: {
    slug: string;
    title: string;
    content: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    isPublished: boolean;
  }): Promise<StaticPage> {
    return prisma.staticPage.upsert({
      where: { slug: data.slug },
      update: data,
      create: data,
    });
  },

  deletePage(slug: string): Promise<StaticPage> {
    return prisma.staticPage.delete({ where: { slug } });
  },

  // ---------- Contact messages ----------

  createContactMessage(data: Prisma.ContactMessageUncheckedCreateInput): Promise<ContactMessage> {
    return prisma.contactMessage.create({ data });
  },

  async findContactMessages(skip: number, take: number, unreadOnly?: boolean) {
    const where: Prisma.ContactMessageWhereInput = unreadOnly ? { isRead: false } : {};

    const [items, total] = await prisma.$transaction([
      prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.contactMessage.count({ where }),
    ]);

    return { items, total };
  },

  markMessageRead(id: string): Promise<ContactMessage> {
    return prisma.contactMessage.update({ where: { id }, data: { isRead: true } });
  },
};
