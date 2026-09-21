import { brandRepository } from '../repositories/brand.repository';
import { createUniqueSlug } from '../utils/slugify';
import { ApiError } from '../utils/ApiError';

export const brandService = {
  list(onlyActive = false) {
    return brandRepository.findAll(onlyActive);
  },

  listPaginated(skip: number, take: number, search?: string) {
    return brandRepository.findMany(skip, take, search);
  },

  async getById(id: string) {
    const brand = await brandRepository.findById(id);
    if (!brand) throw ApiError.notFound('Brand not found');
    return brand;
  },

  async create(input: {
    name: string;
    logoUrl?: string | null;
    description?: string | null;
    isActive?: boolean;
  }) {
    const slug = await createUniqueSlug(input.name, (s) => brandRepository.slugExists(s));
    return brandRepository.create({
      name: input.name,
      slug,
      logoUrl: input.logoUrl ?? null,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
    });
  },

  async update(
    id: string,
    input: {
      name?: string;
      logoUrl?: string | null;
      description?: string | null;
      isActive?: boolean;
    },
  ) {
    const existing = await brandRepository.findById(id);
    if (!existing) throw ApiError.notFound('Brand not found');

    const data: Record<string, unknown> = { ...input };

    if (input.name && input.name !== existing.name) {
      data.slug = await createUniqueSlug(input.name, async (s) =>
        s === existing.slug ? false : brandRepository.slugExists(s),
      );
    }

    const updated = await brandRepository.update(id, data);

    if (input.name && input.name !== existing.name) {
      await brandRepository.syncProductBrandName(id, input.name);
    }

    return updated;
  },

  async delete(id: string) {
    const existing = await brandRepository.findById(id);
    if (!existing) throw ApiError.notFound('Brand not found');

    const count = await brandRepository.productCount(id);
    if (count > 0) {
      throw ApiError.conflict(
        `Cannot delete brand "${existing.name}" — it has ${count} product(s). Reassign them first.`,
      );
    }

    return brandRepository.delete(id);
  },
};
