export interface PaginationInput {
  limit?: string | number;
  page?: string | number;
  defaultLimit?: number;
  defaultPage?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export function paginateArray<T>(items: T[], input?: PaginationInput): PaginatedResult<T> {
  const limit = Math.max(1, Number(input?.limit) || input?.defaultLimit || 20);
  const page = Math.max(1, Number(input?.page) || input?.defaultPage || 1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * limit;
  const end = start + limit;

  return {
    items: items.slice(start, end),
    meta: {
      page: clampedPage,
      limit,
      total,
      totalPages,
      hasPrevPage: clampedPage > 1,
      hasNextPage: clampedPage < totalPages,
    },
  };
}

export function formatPaginationFooter(meta: PaginationMeta): string {
  return `Page ${meta.page} of ${meta.totalPages} (${meta.total} total)`;
}