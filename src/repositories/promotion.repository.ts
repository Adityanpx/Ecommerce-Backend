import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export const promotionRepository = {
  findAll(includeInactive = false) {
    return prisma.promotion.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
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
