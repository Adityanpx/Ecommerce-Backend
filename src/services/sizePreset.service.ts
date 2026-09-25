import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';

interface PresetInput {
  name?: string;
  sizeSystem?: string | null;
  sizes?: string[];
  subCategoryId?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}

/** Reusable size sets ("S–XXL", "UK 6–11") — one click fills the size row of a colour. */
export const sizePresetService = {
  /**
   * With subCategoryId, presets linked to that category come first
   * (the form suggests them the moment a category is picked).
   */
  async list(options: { subCategoryId?: string; includeInactive?: boolean }) {
    const presets = await prisma.sizePreset.findMany({
      where: options.includeInactive ? {} : { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: { subCategory: { select: { id: true, name: true } } },
    });
    if (!options.subCategoryId) return presets;
    return [
      ...presets.filter((p) => p.subCategoryId === options.subCategoryId),
      ...presets.filter((p) => p.subCategoryId !== options.subCategoryId),
    ];
  },

  async create(input: Required<Pick<PresetInput, 'name' | 'sizes'>> & PresetInput) {
    await this.assertValid(input);
    return prisma.sizePreset.create({
      data: {
        name: input.name,
        sizeSystem: input.sizeSystem ?? null,
        sizes: input.sizes,
        subCategoryId: input.subCategoryId ?? null,
        isActive: input.isActive ?? true,
        displayOrder: input.displayOrder ?? 0,
      },
    });
  },

  async update(id: string, input: PresetInput) {
    const existing = await prisma.sizePreset.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Size preset not found');
    await this.assertValid(input, id);
    return prisma.sizePreset.update({ where: { id }, data: input });
  },

  async remove(id: string) {
    const existing = await prisma.sizePreset.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Size preset not found');
    await prisma.sizePreset.delete({ where: { id } });
  },

  async assertValid(input: PresetInput, exceptId?: string) {
    if (input.name) {
      const clash = await prisma.sizePreset.findFirst({
        where: {
          name: { equals: input.name, mode: 'insensitive' },
          ...(exceptId ? { id: { not: exceptId } } : {}),
        },
      });
      if (clash) throw ApiError.conflict(`A size preset called "${clash.name}" already exists`);
    }
    if (input.subCategoryId) {
      const sub = await prisma.subCategory.findUnique({ where: { id: input.subCategoryId } });
      if (!sub) throw ApiError.badRequest('Category does not exist');
    }
  },
};
