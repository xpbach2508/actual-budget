import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsInViewport } from './useIsInViewport';

describe('useIsInViewport', () => {
  let observe: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observe = vi.fn();
    disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = observe;
        disconnect = disconnect;
        unobserve = vi.fn();
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('observes the element after it appears on a later render', () => {
    const ref: { current: Element | null } = { current: null };
    const { rerender } = renderHook(() => useIsInViewport(ref));

    expect(observe).not.toHaveBeenCalled();

    const node = document.createElement('div');
    ref.current = node;
    rerender();

    expect(observe).toHaveBeenCalledWith(node);
  });
});
