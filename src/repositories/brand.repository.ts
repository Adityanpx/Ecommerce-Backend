import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export const brandRepository = {
  findAll(onlyActive = false) {
    return prisma.brand.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
  },

  findById(id: string) {
    return prisma.brand.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.brand.findUnique({ where: { slug } });
  },

  slugExists(slug: string) {
    return prisma.brand.findUnique({ where: { slug } }).then((b) => b !== null);
  },

  create(data: Prisma.BrandCreateInput) {
    return prisma.brand.create({ data });
  },

  update(id: string, data: Prisma.BrandUpdateInput) {
    return prisma.brand.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.brand.delete({ where: { id } });
  },

  /** Count products using this brand — prevents deletion if > 0. */
  productCount(id: string) {
    return prisma.product.count({ where: { brandId: id, deletedAt: null } });
  },
};
