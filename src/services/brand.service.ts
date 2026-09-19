import { brandRepository } from '../repositories/brand.repository';
import { createUniqueSlug } from '../utils/slugify';
import { ApiError } from '../utils/ApiError';

export const brandService = {
  list(onlyActive = false) {
    return brandRepository.findAll(onlyActive);
  },

  async getById(id: string) {
    const brand = await brandRepository.findById(id);
    if (!brand) throw ApiError.notFound('Brand not found');
    return brand;
  },

  async create(input: { name: string; logoUrl?: string | null; description?: string | null }) {
    const slug = await createUniqueSlug(input.name, (s) => brandRepository.slugExists(s));
    return brandRepository.create({
      name: input.name,
      slug,
      logoUrl: input.logoUrl ?? null,
      description: input.description ?? null,
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

    return brandRepository.update(id, data);
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
