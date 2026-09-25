import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { CATALOG } from '../config/constants';

/**
 * Autosave for the product form (#3). The admin client generates the draft id
 * (uuid) when the form opens and PUTs the whole form state every few seconds;
 * the same id is sent to POST /admin/products as `draftId` so the draft is
 * deleted once the product is created. Drafts are private to the admin.
 */
export const productDraftService = {
  list(adminId: string) {
    return prisma.productDraft.findMany({
      where: { adminId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, productId: true, title: true, createdAt: true, updatedAt: true },
    });
  },

  async get(adminId: string, id: string) {
    const draft = await prisma.productDraft.findFirst({ where: { id, adminId } });
    if (!draft) throw ApiError.notFound('Draft not found');
    return draft;
  },

  async save(
    adminId: string,
    id: string,
    input: { productId?: string | null; title?: string | null; data: Record<string, unknown> },
  ) {
    const bytes = Buffer.byteLength(JSON.stringify(input.data), 'utf8');
    if (bytes > CATALOG.MAX_DRAFT_BYTES) {
      throw ApiError.badRequest('Draft is too large to autosave');
    }

    const existing = await prisma.productDraft.findUnique({ where: { id } });
    if (existing && existing.adminId !== adminId) throw ApiError.forbidden('Not your draft');

    if (!existing) {
      const count = await prisma.productDraft.count({ where: { adminId } });
      if (count >= CATALOG.MAX_DRAFTS_PER_ADMIN) {
        throw ApiError.badRequest(
          `You have ${count} unsaved drafts. Delete some before starting another product.`,
        );
      }
    }

    if (input.productId) {
      const product = await prisma.product.findUnique({ where: { id: input.productId } });
      if (!product) throw ApiError.badRequest('Product does not exist');
    }

    const data = input.data as Prisma.InputJsonValue;
    return prisma.productDraft.upsert({
      where: { id },
      create: {
        id,
        adminId,
        productId: input.productId ?? null,
        title: input.title ?? null,
        data,
      },
      update: {
        ...(input.productId !== undefined ? { productId: input.productId } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        data,
      },
      select: { id: true, productId: true, title: true, updatedAt: true },
    });
  },

  async remove(adminId: string, id: string) {
    await prisma.productDraft.deleteMany({ where: { id, adminId } });
  },
};
