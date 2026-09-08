import { Prisma, Sport } from '@prisma/client';
import { prisma } from '../config/database';

export const sportRepository = {
  findAll(onlyActive: boolean) {
    return prisma.sport.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { subCategories: true } },
      },
    });
  },

  findBySlug(slug: string, onlyActive: boolean) {
    return prisma.sport.findFirst({
      where: { slug, ...(onlyActive ? { isActive: true } : {}) },
      include: {
        subCategories: {
          where: onlyActive ? { isActive: true } : undefined,
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });
  },

  findById(id: string): Promise<Sport | null> {
    return prisma.sport.findUnique({ where: { id } });
  },

  slugExists(slug: string): Promise<boolean> {
    return prisma.sport.findUnique({ where: { slug } }).then((s) => s !== null);
  },

  create(data: Prisma.SportCreateInput): Promise<Sport> {
    return prisma.sport.create({ data });
  },

  update(id: string, data: Prisma.SportUpdateInput): Promise<Sport> {
    return prisma.sport.update({ where: { id }, data });
  },

  delete(id: string): Promise<Sport> {
    return prisma.sport.delete({ where: { id } });
  },

  countProducts(sportId: string): Promise<number> {
    return prisma.product.count({
      where: { subCategory: { sportId }, deletedAt: null },
    });
  },
};
