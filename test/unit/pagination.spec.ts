import { describe, it, expect } from 'vitest';
import {
  buildCursorResponse,
  buildOffsetResponse,
} from '../../src/common/pagination/index.js';

describe('Pagination helpers', () => {
  it('buildCursorResponse should correctly compute nextCursor and hasMore', () => {
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];
    const res = buildCursorResponse(items, 10, 2);
    expect(res.meta.hasMore).toBe(true);
    expect(res.meta.nextCursor).toBe('2');

    const lastItems = [{ id: '3', name: 'Item 3' }];
    const lastRes = buildCursorResponse(lastItems, 10, 2);
    expect(lastRes.meta.hasMore).toBe(false);
    expect(lastRes.meta.nextCursor).toBeUndefined();
  });

  it('buildOffsetResponse should correctly calculate totalPages and hasMore', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const res = buildOffsetResponse(items, 10, 1, 2);
    expect(res.meta.totalPages).toBe(5);
    expect(res.meta.hasMore).toBe(true);
    expect(res.meta.page).toBe(1);

    const pageFive = buildOffsetResponse(items, 10, 5, 2);
    expect(pageFive.meta.hasMore).toBe(false);
  });
});
