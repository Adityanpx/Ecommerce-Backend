import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export const promotionRepository = {
  findAll(includeInactive = false) {
    return prisma.promotion.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Admin list: paginated with optional name search, newest first. */
  async findMany(skip: number, take: number, search?: string) {
    const where: Prisma.PromotionWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {};

    const [items, total] = await prisma.$transaction([
      prisma.promotion.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.promotion.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string) {
    return prisma.promotion.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.promotion.findUnique({ where: { slug } });
  },

  slugExists(slug: string) {
    return prisma.promotion.findUnique({ where: { slug } }).then((p) => p !== null);
  },

  /** Find all active promotions that are currently running (within date range). */
  findActive(now: Date = new Date()) {
    return prisma.promotion.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });
  },

  create(data: Prisma.PromotionCreateInput) {
    return prisma.promotion.create({ data });
  },

  update(id: string, data: Prisma.PromotionUpdateInput) {
    return prisma.promotion.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.promotion.delete({ where: { id } });
  },
};
