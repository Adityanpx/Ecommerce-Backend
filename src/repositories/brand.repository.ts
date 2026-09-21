import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export const brandRepository = {
  findAll(onlyActive = false) {
    return prisma.brand.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
  },

  /** Admin list: paginated, name search, and a live-product count per brand. */
  async findMany(skip: number, take: number, search?: string) {
    const where: Prisma.BrandWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {};

    const [items, total] = await prisma.$transaction([
      prisma.brand.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
        include: { _count: { select: { products: { where: { deletedAt: null } } } } },
      }),
      prisma.brand.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string) {
    return prisma.brand.findUnique({ where: { id } });
  },

  /** Case-insensitive lookup — links a free-text product brand to its Brand record. */
  findByName(name: string) {
    return prisma.brand.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  },

  /** Product.brand is a denormalised copy of the name (used by search and filters). */
  syncProductBrandName(brandId: string, name: string) {
    return prisma.product.updateMany({ where: { brandId }, data: { brand: name } });
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
