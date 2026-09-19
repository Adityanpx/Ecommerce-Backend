import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export const sizeChartRepository = {
  findBySubCategory(subCategoryId: string) {
    return prisma.sizeChartTemplate.findUnique({
      where: { subCategoryId },
      include: {
        entries: { orderBy: { sortOrder: 'asc' } },
      },
    });
  },

  findById(id: string) {
    return prisma.sizeChartTemplate.findUnique({
      where: { id },
      include: {
        entries: { orderBy: { sortOrder: 'asc' } },
        subCategory: { select: { id: true, name: true, slug: true } },
      },
    });
  },

  create(data: {
    subCategoryId: string;
    title: string;
    columns: string[];
    entries: { sizeLabel: string; values: (string | number)[]; sortOrder: number }[];
  }) {
    return prisma.sizeChartTemplate.create({
      data: {
        subCategory: { connect: { id: data.subCategoryId } },
        title: data.title,
        columns: data.columns,
        entries: {
          create: data.entries.map((e) => ({
            sizeLabel: e.sizeLabel,
            values: e.values as Prisma.InputJsonValue,
            sortOrder: e.sortOrder,
          })),
        },
      },
      include: { entries: { orderBy: { sortOrder: 'asc' } } },
    });
  },

  async update(
    id: string,
    data: {
      title?: string;
      columns?: string[];
      entries?: { sizeLabel: string; values: (string | number)[]; sortOrder: number }[];
    },
  ) {
    // If entries are being replaced, delete old ones and recreate.
    if (data.entries) {
      return prisma.$transaction(async (tx) => {
        await tx.sizeChartEntry.deleteMany({ where: { templateId: id } });
        return tx.sizeChartTemplate.update({
          where: { id },
          data: {
            title: data.title,
            columns: data.columns as Prisma.InputJsonValue,
            entries: {
              create: data.entries!.map((e) => ({
                sizeLabel: e.sizeLabel,
                values: e.values as Prisma.InputJsonValue,
                sortOrder: e.sortOrder,
              })),
            },
          },
          include: { entries: { orderBy: { sortOrder: 'asc' } } },
        });
      });
    }

    return prisma.sizeChartTemplate.update({
      where: { id },
      data: {
        title: data.title,
        columns: data.columns as Prisma.InputJsonValue,
      },
      include: { entries: { orderBy: { sortOrder: 'asc' } } },
    });
  },

  delete(id: string) {
    return prisma.sizeChartTemplate.delete({ where: { id } });
  },
};
