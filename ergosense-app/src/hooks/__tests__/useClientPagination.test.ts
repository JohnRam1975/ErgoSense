import { describe, expect, it } from 'vitest';
import { paginateItems } from '../useClientPagination';

describe('paginateItems', () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);

  it('primeira página com pageSize 10', () => {
    const r = paginateItems(items, 1, 10);
    expect(r.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(r.total).toBe(23);
    expect(r.totalPages).toBe(3);
    expect(r.start).toBe(1);
    expect(r.end).toBe(10);
  });

  it('última página parcial', () => {
    const r = paginateItems(items, 3, 10);
    expect(r.pageItems).toEqual([21, 22, 23]);
    expect(r.start).toBe(21);
    expect(r.end).toBe(23);
  });

  it('página acima do total é clampada', () => {
    const r = paginateItems(items, 99, 10);
    expect(r.page).toBe(3);
    expect(r.pageItems).toHaveLength(3);
  });

  it('lista vazia', () => {
    const r = paginateItems([], 1, 10);
    expect(r.pageItems).toEqual([]);
    expect(r.totalPages).toBe(1);
    expect(r.start).toBe(0);
    expect(r.end).toBe(0);
  });
});
