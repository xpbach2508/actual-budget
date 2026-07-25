# Review Queue Lazy Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `/review` responsive with hundreds of pending transactions by loading 50 rows initially and fetching subsequent 50-row pages near the end of the list.

**Architecture:** Reuse Actual’s existing `PagedQuery` implementation rather than adding a second pagination protocol. A small hook owns the live paged AQL query, exposes its current rows and `fetchNext`, and cleans it up. `ReviewQueue` observes a sentinel after the queue rows and requests the next page; live query updates refill the 50-row visible window after approval or deletion.

**Tech Stack:** React, TypeScript, Actual AQL, `PagedQuery`, `useIsInViewport`, Vitest.

## Global Constraints

- Query only transactions with `cleared=false`, sorted newest first.
- Initial and subsequent page size is exactly `50`.
- Do not add a dependency or custom server endpoint.
- Approve still sends only `{ id, cleared: true }`; delete still sends only `{ id }`.
- Do not render or retain all queued rows at once.

---

## File structure

- Create `packages/desktop-client/src/hooks/usePagedQuery.ts`: React lifecycle wrapper for `PagedQuery` with live data, loading, next-page state, and cleanup.
- Create `packages/desktop-client/src/hooks/usePagedQuery.test.ts`: verifies page size, next-page delegation, and unsubscribe lifecycle using a mocked `pagedQuery`.
- Modify `packages/desktop-client/src/components/review/ReviewQueue.tsx`: replace unbounded `useQuery` with the paged hook; sort newest first; add an `IntersectionObserver` sentinel that requests the next page.
- Create `packages/desktop-client/src/components/review/ReviewQueue.test.tsx`: verifies the Review query is `cleared=false`, descending by date, and configured with page size 50.

### Task 1: Add the reusable paged-query React hook

**Files:**

- Create: `packages/desktop-client/src/hooks/usePagedQuery.ts`
- Create: `packages/desktop-client/src/hooks/usePagedQuery.test.ts`

**Interfaces:**

- Produces `usePagedQuery<T>(query, { pageCount }): { data: ReadonlyArray<T> | null; isLoading: boolean; hasNext: boolean; fetchNext: () => Promise<void> }`.
- Consumes `pagedQuery` from `#queries/pagedQuery`; later `ReviewQueue` passes its AQL query and `pageCount: 50`.

- [ ] **Step 1: Write the failing hook test**

```ts
it('uses the requested page size and delegates fetchNext', async () => {
  const fetchNext = vi.fn();
  vi.mocked(pagedQuery).mockReturnValue({
    data: [{ id: 'first' }],
    hasNext: true,
    fetchNext,
    unsubscribe: vi.fn(),
  } as never);

  const { result } = renderHook(() => usePagedQuery(query, { pageCount: 50 }));

  expect(pagedQuery).toHaveBeenCalledWith(query, expect.any(Object));
  expect(pagedQuery.mock.calls[0][1].options).toEqual({ pageCount: 50 });
  await result.current.fetchNext();
  expect(fetchNext).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run it and observe the missing-module failure**

Run: `yarn workspace @actual-app/web test src/hooks/usePagedQuery.test.ts`

Expected: FAIL because `usePagedQuery` does not exist.

- [ ] **Step 3: Implement the hook**

```ts
export function usePagedQuery<T>(query: Query, options: { pageCount: number }) {
  const [data, setData] = useState<ReadonlyArray<T> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const paged = useRef<PagedQuery<T> | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const next = pagedQuery<T>(query, {
      onData: data => {
        setData(data);
        setIsLoading(false);
      },
      onError: () => setIsLoading(false),
      options,
    });
    paged.current = next;
    return () => next.unsubscribe();
  }, [query, options]);

  return {
    data,
    isLoading,
    hasNext: paged.current?.hasNext ?? false,
    fetchNext: () => paged.current?.fetchNext() ?? Promise.resolve(),
  };
}
```

Memoize the options object in the caller so the live subscription is not recreated on every render.

- [ ] **Step 4: Run the hook test**

Run: `yarn workspace @actual-app/web test src/hooks/usePagedQuery.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add packages/desktop-client/src/hooks/usePagedQuery.ts packages/desktop-client/src/hooks/usePagedQuery.test.ts
git commit -m "feat: add paged query hook"
```

### Task 2: Page the Review Queue and load on scroll

**Files:**

- Modify: `packages/desktop-client/src/components/review/ReviewQueue.tsx`
- Create: `packages/desktop-client/src/components/review/ReviewQueue.test.tsx`

**Interfaces:**

- Consumes `usePagedQuery<TransactionEntity>(reviewQuery, { pageCount: 50 })`.
- Consumes `useIsInViewport(loadMoreRef)` and an effect that calls `fetchNext` while the sentinel is visible and `hasNext` is true.
- Produces only the current loaded 50-row pages; new live query data refills rows after approve/delete.

- [ ] **Step 1: Write the failing Review Queue query test**

```ts
it('loads pending transactions newest first in pages of 50', () => {
  render(<ReviewQueue />);

  expect(usePagedQuery).toHaveBeenCalledWith(
    expect.objectContaining({}),
    { pageCount: 50 },
  );
  expect(mockQuery.filter).toHaveBeenCalledWith({ cleared: false });
  expect(mockQuery.orderBy).toHaveBeenCalledWith({ date: 'desc' });
});
```

Mock the existing account/category/payee hooks and `usePagedQuery`; assert the query builder calls rather than implementation-specific DOM structure.

- [ ] **Step 2: Run the test and observe it fail**

Run: `yarn workspace @actual-app/web test src/components/review/ReviewQueue.test.tsx`

Expected: FAIL because `ReviewQueue` still calls unbounded `useQuery`.

- [ ] **Step 3: Replace the unbounded live query**

In `ReviewQueue.tsx`:

1. Replace `useQuery` with a memoized query:

```ts
const reviewQuery = useMemo(
  () =>
    q('transactions')
      .filter({ cleared: false })
      .orderBy({ date: 'desc' })
      .select('*'),
  [],
);
const {
  data: transactions,
  isLoading,
  hasNext,
  fetchNext,
} = usePagedQuery(reviewQuery, { pageCount: 50 });
```

2. Add `const loadMoreRef = useRef<HTMLDivElement>(null);` and `const isLoadMoreVisible = useIsInViewport(loadMoreRef);`.
3. Add an effect with `[fetchNext, hasNext, isLoadMoreVisible]` dependencies that calls `void fetchNext()` only when both `hasNext` and `isLoadMoreVisible` are true. `PagedQuery.fetchNext` is already guarded by `once`, so repeated intersection events cannot issue concurrent page requests.
4. Render `<View ref={loadMoreRef} style={{ height: 1, flexShrink: 0 }} />` immediately after the transaction list when `hasNext` is true.
5. Preserve all existing Quick Add, category, transfer, approve, delete, error, and toast behavior. `PagedQuery` live updates must remain subscribed, so approval/deletion re-runs its query and refills the current page window.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
yarn workspace @actual-app/web test src/hooks/usePagedQuery.test.ts src/components/review/ReviewQueue.test.tsx
yarn workspace @actual-app/web typecheck
```

Expected: both tests pass and the web workspace has no TypeScript errors.

- [ ] **Step 5: Commit Task 2**

```bash
git add packages/desktop-client/src/components/review/ReviewQueue.tsx packages/desktop-client/src/components/review/ReviewQueue.test.tsx
git commit -m "feat: page review queue transactions"
```

### Task 3: Verify the production behavior

**Files:**

- Verify: `packages/desktop-client/src/components/review/ReviewQueue.tsx`

- [ ] **Step 1: Run the web test suite and production build**

Run:

```bash
yarn workspace @actual-app/web test
yarn build:browser
```

Expected: both commands exit 0.

- [ ] **Step 2: Manually verify with the current 446-item queue**

Run: `docker compose -f docker-compose.local.yml up -d --build actual`

Verify at `/review`:

1. Initial render shows at most 50 queued cards and remains responsive.
2. Scrolling to the bottom appends the next 50 cards without duplicates.
3. Approving or deleting a card refills the loaded set when more pending rows exist.
4. Quick Add, Payee autocomplete, transfer, category, notes, and success toasts still work.

- [ ] **Step 3: Commit verification-only changes if any were generated**

```bash
git status --short
```

Expected: no uncommitted generated files. Do not commit build output.

## Plan self-review

- Spec coverage: 50-item initial page, scroll-triggered 50-item pages, approval/deletion refill, and prevention of all-row rendering are in Task 2.
- Placeholder scan: no incomplete implementation steps remain.
- Type consistency: `usePagedQuery` returns `hasNext` and `fetchNext`; `ReviewQueue` passes the same `Query` and fixed page size used by `PagedQuery`.
