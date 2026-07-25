import { q } from '@actual-app/core/shared/query';
// @ts-strict-ignore
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pagedQuery } from '#queries/pagedQuery';

import { usePagedQuery } from './usePagedQuery';

vi.mock('#queries/pagedQuery', () => ({
  pagedQuery: vi.fn(),
}));

describe('usePagedQuery', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses the requested page size and delegates loading the next page', async () => {
    const fetchNext = vi.fn().mockResolvedValue(undefined);
    vi.mocked(pagedQuery).mockReturnValue({
      data: [{ id: 'first' }],
      hasNext: true,
      fetchNext,
      unsubscribe: vi.fn(),
    } as never);

    const query = q('transactions').select('*');
    const { result } = renderHook(() =>
      usePagedQuery(query, { pageCount: 50 }),
    );

    expect(pagedQuery).toHaveBeenCalledWith(
      query,
      expect.objectContaining({ options: { pageCount: 50 } }),
    );

    await act(() => result.current.fetchNext());

    expect(fetchNext).toHaveBeenCalledOnce();
  });

  it('unsubscribes the live query when unmounted', () => {
    const unsubscribe = vi.fn();
    vi.mocked(pagedQuery).mockReturnValue({
      data: [],
      hasNext: false,
      fetchNext: vi.fn(),
      unsubscribe,
    } as never);

    const { unmount } = renderHook(() =>
      usePagedQuery(q('transactions').select('*'), { pageCount: 50 }),
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
