import { PAGINATION } from '../config/constants';
import type { PaginationMeta } from './ApiResponse';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function parsePagination(query: { page?: unknown; limit?: unknown }): PaginationParams {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);

  const page =
    Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : PAGINATION.DEFAULT_PAGE;

  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), PAGINATION.MAX_LIMIT)
      : PAGINATION.DEFAULT_LIMIT;

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta(
  total: number,
  { page, limit }: Pick<PaginationParams, 'page' | 'limit'>,
): PaginationMeta {
  const pages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}
