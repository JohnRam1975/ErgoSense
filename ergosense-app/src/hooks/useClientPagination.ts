import { useEffect, useMemo, useState } from 'react';

export const DEFAULT_PAGE_SIZE = 10;

export type ClientPaginationOptions = {
  pageSize?: number;
  /** Mude ao filtrar/buscar para voltar à página 1 */
  resetKey?: string | number;
};

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    page: currentPage,
    total,
    totalPages,
    start: total === 0 ? 0 : start + 1,
    end: Math.min(start + pageSize, total),
  };
}

export function useClientPagination<T>(items: T[], options: ClientPaginationOptions = {}) {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const resetKey = options.resetKey ?? '';
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  const slice = useMemo(() => paginateItems(items, page, pageSize), [items, page, pageSize]);

  useEffect(() => {
    if (page !== slice.page) setPage(slice.page);
  }, [page, slice.page]);

  return {
    ...slice,
    pageSize,
    hasPrev: slice.page > 1,
    hasNext: slice.page < slice.totalPages,
    setPage,
    next: () => setPage((p) => Math.min(slice.totalPages, p + 1)),
    prev: () => setPage((p) => Math.max(1, p - 1)),
  };
}
