import { Prisma, SubCategory } from '@prisma/client';
import { prisma } from '../config/database';

export const subCategoryRepository = {
  findAll(sportId?: string) {
    return prisma.subCategory.findMany({
      where: sportId ? { sportId } : undefined,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        sport: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, attributes: true } },
      },
    });
  },

  findBySlug(slug: string, onlyActive: boolean) {
    return prisma.subCategory.findFirst({
      where: { slug, ...(onlyActive ? { isActive: true } : {}) },
      include: {
        sport: { select: { id: true, name: true, slug: true } },
        attributes: {
          where: onlyActive ? { isFilterable: true } : undefined,
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  },

  findById(id: string): Promise<SubCategory | null> {
    return prisma.subCategory.findUnique({ where: { id } });
  },

  slugExistsInSport(sportId: string, slug: string): Promise<boolean> {
    return prisma.subCategory
      .findUnique({ where: { sportId_slug: { sportId, slug } } })
      .then((s) => s !== null);
  },

  create(data: Prisma.SubCategoryCreateInput): Promise<SubCategory> {
    return prisma.subCategory.create({ data });
  },

  update(id: string, data: Prisma.SubCategoryUpdateInput): Promise<SubCategory> {
    return prisma.subCategory.update({ where: { id }, data });
  },

  delete(id: string): Promise<SubCategory> {
    return prisma.subCategory.delete({ where: { id } });
  },

  countProducts(subCategoryId: string): Promise<number> {
    return prisma.product.count({ where: { subCategoryId, deletedAt: null } });
  },
};
