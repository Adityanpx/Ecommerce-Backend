import { AttributeType, Prisma } from '@prisma/client';
import { sportRepository } from '../repositories/sport.repository';
import { subCategoryRepository } from '../repositories/subCategory.repository';
import { attributeRepository } from '../repositories/attribute.repository';
import { createSlug, createUniqueSlug } from '../utils/slugify';
import { ApiError } from '../utils/ApiError';

export const catalogService = {
  // ---------- Sports ----------

  listSports(onlyActive: boolean) {
    return sportRepository.findAll(onlyActive);
  },

  async getSportBySlug(slug: string, onlyActive: boolean) {
    const sport = await sportRepository.findBySlug(slug, onlyActive);
    if (!sport) throw ApiError.notFound('Sport not found');
    return sport;
  },

  async createSport(input: {
    name: string;
    description?: string | null;
    iconUrl?: string | null;
    bannerUrl?: string | null;
    displayOrder?: number;
    isActive?: boolean;
    metaTitle?: string | null;
    metaDescription?: string | null;
  }) {
    const slug = await createUniqueSlug(input.name, (s) => sportRepository.slugExists(s));
    return sportRepository.create({ ...input, slug });
  },

  async updateSport(id: string, input: Record<string, unknown>) {
    const existing = await sportRepository.findById(id);
    if (!existing) throw ApiError.notFound('Sport not found');

    const data: Prisma.SportUpdateInput = { ...input };

    // Regenerate the slug only when the name actually changed.
    if (typeof input.name === 'string' && input.name !== existing.name) {
      data.slug = await createUniqueSlug(input.name, async (s) =>
        s === existing.slug ? false : sportRepository.slugExists(s),
      );
    }

    return sportRepository.update(id, data);
  },

  async deleteSport(id: string) {
    const existing = await sportRepository.findById(id);
    if (!existing) throw ApiError.notFound('Sport not found');

    const productCount = await sportRepository.countProducts(id);
    if (productCount > 0) {
      throw ApiError.conflict(
        `Cannot delete — ${productCount} product(s) exist under this sport. Deactivate it instead.`,
      );
    }

    return sportRepository.delete(id);
  },

  // ---------- Sub-categories ----------

  listSubCategories(sportId?: string) {
    return subCategoryRepository.findAll(sportId);
  },

  async getSubCategoryBySlug(slug: string, onlyActive: boolean) {
    const subCategory = await subCategoryRepository.findBySlug(slug, onlyActive);
    if (!subCategory) throw ApiError.notFound('Category not found');
    return subCategory;
  },

  async createSubCategory(input: {
    sportId: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    gstRate?: number | null;
    displayOrder?: number;
    isActive?: boolean;
    metaTitle?: string | null;
    metaDescription?: string | null;
  }) {
    const sport = await sportRepository.findById(input.sportId);
    if (!sport) throw ApiError.badRequest('Sport does not exist');

    // Slug is unique per sport, not globally — two sports can both have "Apparel".
    const slug = await createUniqueSlug(input.name, (s) =>
      subCategoryRepository.slugExistsInSport(input.sportId, s),
    );

    const { sportId, ...rest } = input;

    return subCategoryRepository.create({
      ...rest,
      slug,
      sport: { connect: { id: sportId } },
    });
  },

  async updateSubCategory(id: string, input: Record<string, unknown>) {
    const existing = await subCategoryRepository.findById(id);
    if (!existing) throw ApiError.notFound('Category not found');

    const data: Prisma.SubCategoryUpdateInput = { ...input };

    if (typeof input.name === 'string' && input.name !== existing.name) {
      data.slug = await createUniqueSlug(input.name, async (s) =>
        s === existing.slug ? false : subCategoryRepository.slugExistsInSport(existing.sportId, s),
      );
    }

    return subCategoryRepository.update(id, data);
  },

  async deleteSubCategory(id: string) {
    const existing = await subCategoryRepository.findById(id);
    if (!existing) throw ApiError.notFound('Category not found');

    const productCount = await subCategoryRepository.countProducts(id);
    if (productCount > 0) {
      throw ApiError.conflict(
        `Cannot delete — ${productCount} product(s) exist in this category. Deactivate it instead.`,
      );
    }

    return subCategoryRepository.delete(id);
  },

  // ---------- Attributes ----------

  async listAttributes(subCategoryId: string) {
    const subCategory = await subCategoryRepository.findById(subCategoryId);
    if (!subCategory) throw ApiError.notFound('Category not found');
    return attributeRepository.findBySubCategory(subCategoryId);
  },

  async createAttribute(input: {
    subCategoryId: string;
    name: string;
    type: AttributeType;
    options?: string[];
    unit?: string | null;
    isRequired?: boolean;
    isFilterable?: boolean;
    displayOrder?: number;
  }) {
    const subCategory = await subCategoryRepository.findById(input.subCategoryId);
    if (!subCategory) throw ApiError.badRequest('Category does not exist');

    // `code` is the stable machine key used in filter query params
    // (attr_flex_rating=Medium). It is derived from the name once and
    // never regenerated, so renaming an attribute cannot break saved filter URLs.
    const code = createSlug(input.name).replace(/-/g, '_');

    if (await attributeRepository.codeExists(input.subCategoryId, code)) {
      throw ApiError.conflict(`An attribute with code "${code}" already exists in this category`, [
        { field: 'name', message: 'Duplicate attribute name' },
      ]);
    }

    const { subCategoryId, options, ...rest } = input;

    return attributeRepository.create({
      ...rest,
      code,
      options: options ? (options as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      subCategory: { connect: { id: subCategoryId } },
    });
  },

  async updateAttribute(
    id: string,
    input: {
      name?: string;
      options?: string[];
      unit?: string | null;
      isRequired?: boolean;
      isFilterable?: boolean;
      displayOrder?: number;
    },
  ) {
    const existing = await attributeRepository.findById(id);
    if (!existing) throw ApiError.notFound('Attribute not found');

    if (input.options !== undefined && !['DROPDOWN', 'MULTI_SELECT'].includes(existing.type)) {
      throw ApiError.badRequest('options can only be set on DROPDOWN or MULTI_SELECT attributes');
    }

    const { options, ...rest } = input;
    const data: Prisma.CategoryAttributeUpdateInput = { ...rest };

    if (options !== undefined) {
      data.options = options as unknown as Prisma.InputJsonValue;
    }

    // `code` and `type` are intentionally immutable. Changing either would
    // orphan every ProductAttributeValue already stored against this attribute.
    return attributeRepository.update(id, data);
  },

  async deleteAttribute(id: string) {
    const existing = await attributeRepository.findById(id);
    if (!existing) throw ApiError.notFound('Attribute not found');
    // Cascade deletes every ProductAttributeValue for this attribute.
    return attributeRepository.delete(id);
  },

  reorderAttributes(items: { id: string; displayOrder: number }[]) {
    return attributeRepository.reorder(items);
  },
};
