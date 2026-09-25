import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';

/** The admin's reusable colour library (pick a swatch → name + hex pre-filled). */
export const colorSwatchService = {
  list(includeInactive: boolean) {
    return prisma.colorSwatch.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { productColors: true } } },
    });
  },

  async create(input: {
    name: string;
    hex: string;
    secondaryHex?: string | null;
    isActive: boolean;
  }) {
    await this.assertNameFree(input.name);
    return prisma.colorSwatch.create({
      data: {
        name: input.name,
        hex: input.hex,
        secondaryHex: input.secondaryHex ?? null,
        isActive: input.isActive,
      },
    });
  },

  /** Editing a swatch does NOT rename colours already on products — those are independent copies. */
  async update(
    id: string,
    input: { name?: string; hex?: string; secondaryHex?: string | null; isActive?: boolean },
  ) {
    const existing = await prisma.colorSwatch.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Colour not found');
    if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
      await this.assertNameFree(input.name, id);
    }
    return prisma.colorSwatch.update({ where: { id }, data: input });
  },

  /** Products that used this swatch keep their colour (swatchId is set to null). */
  async remove(id: string) {
    const existing = await prisma.colorSwatch.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Colour not found');
    await prisma.colorSwatch.delete({ where: { id } });
  },

  async assertNameFree(name: string, exceptId?: string) {
    const clash = await prisma.colorSwatch.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    if (clash) {
      throw ApiError.conflict(`"${clash.name}" is already in the colour library`, [
        { field: 'name', message: 'Already exists' },
      ]);
    }
  },
};
