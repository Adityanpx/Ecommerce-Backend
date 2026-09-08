import { CategoryAttribute, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export const attributeRepository = {
  findBySubCategory(subCategoryId: string): Promise<CategoryAttribute[]> {
    return prisma.categoryAttribute.findMany({
      where: { subCategoryId },
      orderBy: { displayOrder: 'asc' },
    });
  },

  findFilterableBySubCategory(subCategoryId: string): Promise<CategoryAttribute[]> {
    return prisma.categoryAttribute.findMany({
      where: { subCategoryId, isFilterable: true },
      orderBy: { displayOrder: 'asc' },
    });
  },

  findById(id: string): Promise<CategoryAttribute | null> {
    return prisma.categoryAttribute.findUnique({ where: { id } });
  },

  codeExists(subCategoryId: string, code: string): Promise<boolean> {
    return prisma.categoryAttribute
      .findUnique({ where: { subCategoryId_code: { subCategoryId, code } } })
      .then((a) => a !== null);
  },

  create(data: Prisma.CategoryAttributeCreateInput): Promise<CategoryAttribute> {
    return prisma.categoryAttribute.create({ data });
  },

  update(id: string, data: Prisma.CategoryAttributeUpdateInput): Promise<CategoryAttribute> {
    return prisma.categoryAttribute.update({ where: { id }, data });
  },

  delete(id: string): Promise<CategoryAttribute> {
    return prisma.categoryAttribute.delete({ where: { id } });
  },

  reorder(items: { id: string; displayOrder: number }[]) {
    return prisma.$transaction(
      items.map((item) =>
        prisma.categoryAttribute.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );
  },
};
