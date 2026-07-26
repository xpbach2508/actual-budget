# Gold Transaction Quantity Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a read-only `Số chỉ` column in the normal transaction list for Gold accounts, populated for linked manual-add and purchase transactions.

**Architecture:** Persist the Gold-account transaction ID in `gold_lots.transfer_id` for both purchase and manual-add flows. `TransactionList` loads lots only for a Gold account and derives a `Map<transactionId, quantityChi>`, which it passes to `TransactionsTable`. The table conditionally adds one non-editable column beside amount-related fields and leaves cells blank when a transaction has no Gold lot.

**Tech Stack:** React/TypeScript, Actual AQL `q`, Vitest, Testing Library, SQLite/CRDT server mutators.

## Global Constraints

- Display the column only when `account.account_subtype === 'gold'`.
- Format quantities in Vietnamese as `<quantity> chỉ`.
- Do not render or edit the column for non-Gold accounts.
- Price-revaluation and any unlinked transaction must display an empty cell.
- Keep `gold_lots` sync-safe: data fields remain nullable at SQLite level because CRDT applies one column at a time.

---

## File Structure

- `packages/loot-core/src/server/accounts/app.ts` — links a manually-added lot to its created transaction.
- `packages/loot-core/src/server/accounts/app.test.ts` — regression coverage for the manual-add lot linkage.
- `packages/desktop-client/src/components/transactions/goldQuantity.ts` — pure map construction and Vietnamese quantity formatting.
- `packages/desktop-client/src/components/transactions/goldQuantity.test.ts` — pure helper coverage.
- `packages/desktop-client/src/components/transactions/TransactionList.tsx` — conditionally queries Gold lots and passes the derived values to the table.
- `packages/desktop-client/src/components/transactions/TransactionsTable.tsx` — conditionally renders the `Số chỉ` header/cell beside the amount fields.
- `packages/desktop-client/src/components/transactions/TransactionsTable.test.tsx` — table rendering coverage for Gold and ordinary accounts.

### Task 1: Link manual Gold additions to their transaction

**Files:**
- Modify: `packages/loot-core/src/server/accounts/app.ts:724-748`
- Test: `packages/loot-core/src/server/accounts/app.test.ts`

**Interfaces:**
- Produces: `gold_lots.transfer_id` equal to the ID returned by `db.insertTransaction` for a manual addition.
- Consumes: existing `insertGoldLot({ accountId, date, quantityChi, totalCost, transferId })`.

- [ ] **Step 1: Write the failing server regression test**

Add a test that mocks `db.insertTransaction` as returning `manual-transaction-id`, invokes the registered `gold-manual-add` handler with a valid Gold account, and asserts its `db.insertWithSchema('gold_lots', values)` call contains:

```ts
expect(insertWithSchema).toHaveBeenCalledWith(
  'gold_lots',
  expect.objectContaining({ transfer_id: 'manual-transaction-id' }),
);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node .yarn/releases/yarn-4.17.1.cjs vitest run packages/loot-core/src/server/accounts/app.test.ts
```

Expected: FAIL because the lot is currently inserted without `transfer_id`.

- [ ] **Step 3: Implement the minimal server change**

In `addGoldManually`, retain the ID returned by `db.insertTransaction` and pass it to `insertGoldLot`:

```ts
const transactionId = await db.insertTransaction({
  account: accountId,
  amount: amountToInteger(totalCost),
  category: null,
  date,
  cleared: true,
});
await insertGoldLot({
  accountId,
  date,
  quantityChi,
  totalCost,
  transferId: transactionId,
});
```

- [ ] **Step 4: Run the focused test and verify success**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/loot-core/src/server/accounts/app.ts packages/loot-core/src/server/accounts/app.test.ts
git commit -m "fix: link manual gold additions to transactions"
```

### Task 2: Add pure Gold-quantity display helpers

**Files:**
- Create: `packages/desktop-client/src/components/transactions/goldQuantity.ts`
- Create: `packages/desktop-client/src/components/transactions/goldQuantity.test.ts`

**Interfaces:**
- Produces: `getGoldQuantityByTransaction(lots)` and `formatGoldQuantity(quantityChi)`.
- Consumes: lot rows with `transfer_id`, `quantity_chi`, and `tombstone` values.
- Used by: `TransactionList` and `TransactionsTable`.

- [ ] **Step 1: Write failing helper tests**

Cover map creation and formatting:

```ts
expect(
  getGoldQuantityByTransaction([
    { transfer_id: 'purchase', quantity_chi: 1.5, tombstone: 0 },
    { transfer_id: 'deleted', quantity_chi: 2, tombstone: 1 },
    { transfer_id: null, quantity_chi: 3, tombstone: 0 },
  ]),
).toEqual(new Map([['purchase', 1.5]]));
expect(formatGoldQuantity(1.5)).toBe('1,5 chỉ');
expect(formatGoldQuantity(undefined)).toBe('');
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node .yarn/releases/yarn-4.17.1.cjs vitest run packages/desktop-client/src/components/transactions/goldQuantity.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the helpers**

Create `goldQuantity.ts` with a narrow lot type and these functions:

```ts
export function getGoldQuantityByTransaction(lots: readonly GoldLotQuantity[]) {
  return new Map(
    lots
      .filter(lot => lot.tombstone === 0 && lot.transfer_id != null)
      .map(lot => [lot.transfer_id!, lot.quantity_chi]),
  );
}

export function formatGoldQuantity(quantityChi: number | undefined): string {
  return quantityChi == null
    ? ''
    : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(quantityChi)} chỉ`;
}
```

- [ ] **Step 4: Run tests and verify success**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop-client/src/components/transactions/goldQuantity.ts packages/desktop-client/src/components/transactions/goldQuantity.test.ts
git commit -m "feat: add gold quantity display helpers"
```

### Task 3: Load Gold lots and pass quantities into the transaction table

**Files:**
- Modify: `packages/desktop-client/src/components/transactions/TransactionList.tsx:290-810`
- Modify: `packages/desktop-client/src/components/transactions/TransactionsTable.tsx:2745-2785`
- Test: `packages/desktop-client/src/components/transactions/TransactionsTable.test.tsx`

**Interfaces:**
- Consumes: `getGoldQuantityByTransaction` from Task 2 and Gold account subtype.
- Produces: optional `goldQuantityByTransaction?: ReadonlyMap<string, number>` table prop.
- Used by: Task 4 table header and cell rendering.

- [ ] **Step 1: Write a failing table render test**

Mock `TransactionsTable` and render `TransactionList` with a Gold account plus a mocked `gold_lots` query returning a lot linked to the first transaction. Assert its `goldQuantityByTransaction` prop contains the linked value. Render again with `account_subtype: null` and assert that prop is `undefined`.

```ts
expect(mockTransactionTable).toHaveBeenLastCalledWith(
  expect.objectContaining({
    goldQuantityByTransaction: new Map([['gold-transaction', 1.5]]),
  }),
  expect.anything(),
);
expect(mockTransactionTable).toHaveBeenLastCalledWith(
  expect.objectContaining({ goldQuantityByTransaction: undefined }),
  expect.anything(),
);

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node .yarn/releases/yarn-4.17.1.cjs vitest run packages/desktop-client/src/components/transactions/TransactionsTable.test.tsx
```

Expected: FAIL because no Gold-lot query or table prop exists.

- [ ] **Step 3: Implement conditional lot loading and prop plumbing**

In `TransactionList.tsx`:

```ts
const isGoldAccount = account?.account_subtype === 'gold';
const { data: goldLots } = useQuery(
  () =>
    isGoldAccount
      ? q('gold_lots').filter({ account_id: account.id }).select('*')
      : null,
  [isGoldAccount, account?.id],
);
const goldQuantityByTransaction = useMemo(
  () => getGoldQuantityByTransaction(goldLots ?? []),
  [goldLots],
);
```

Pass `goldQuantityByTransaction` only when `isGoldAccount`; add the optional prop to `TransactionTableProps` and thread it into `TransactionTableInnerProps`.

- [ ] **Step 4: Run the focused test and verify progress**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop-client/src/components/transactions/TransactionList.tsx packages/desktop-client/src/components/transactions/TransactionsTable.tsx packages/desktop-client/src/components/transactions/TransactionsTable.test.tsx
git commit -m "feat: load gold quantities for transaction lists"
```

### Task 4: Render the display-only `Số chỉ` column

**Files:**
- Modify: `packages/desktop-client/src/components/transactions/TransactionsTable.tsx:157-350, 1200-2050`
- Test: `packages/desktop-client/src/components/transactions/TransactionsTable.test.tsx`

**Interfaces:**
- Consumes: `goldQuantityByTransaction?: ReadonlyMap<string, number>` and `formatGoldQuantity`.
- Produces: a read-only column named `Số chỉ` adjacent to the amount cells.

- [ ] **Step 1: Complete failing UI cases**

Extend the test to assert a Gold account renders:

```ts
expect(screen.getByText('1,5 chỉ')).toBeInTheDocument();
expect(screen.getByTestId('gold-quantity-empty')).toHaveTextContent('');
```

Use an unlinked revaluation transaction for the empty-cell assertion. Keep the non-Gold assertion from Task 3.

- [ ] **Step 2: Run the focused test and verify failure**

Run the command from Task 3 Step 2.

Expected: FAIL because the table does not yet render the column.

- [ ] **Step 3: Add the header and read-only cell in matching table locations**

Add `showGoldQuantity = props.goldQuantityByTransaction != null` to the header and row render paths. Beside the existing amount header/cell, conditionally render:

```tsx
<HeaderCell width={90}>
  <Trans>Số chỉ</Trans>
</HeaderCell>
```

and, for each non-temporary row:

```tsx
<Cell width={90} data-testid={quantity == null ? 'gold-quantity-empty' : undefined}>
  {formatGoldQuantity(props.goldQuantityByTransaction?.get(trans.id))}
</Cell>
```

Use the same grid order in header and every row variant (ordinary, split parent, child, and adding row). For temporary/new rows render an empty non-editable cell to preserve alignment. Do not add this field to navigator/editing fields or transaction serialization.

- [ ] **Step 4: Run focused tests and verify success**

Run:

```bash
node .yarn/releases/yarn-4.17.1.cjs vitest run packages/desktop-client/src/components/transactions/TransactionsTable.test.tsx packages/desktop-client/src/components/transactions/goldQuantity.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop-client/src/components/transactions/TransactionsTable.tsx packages/desktop-client/src/components/transactions/TransactionsTable.test.tsx
git commit -m "feat: show gold quantities in transaction list"
```

### Task 5: Full verification

**Files:**
- Modify only if verification exposes a defect.

- [ ] **Step 1: Run focused server and client tests**

```bash
node .yarn/releases/yarn-4.17.1.cjs vitest run packages/loot-core/src/server/accounts/app.test.ts packages/desktop-client/src/components/transactions/goldQuantity.test.ts packages/desktop-client/src/components/transactions/TransactionsTable.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run web typecheck**

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web typecheck
```

Expected: all strict files pass.

- [ ] **Step 3: Manually verify the UI**

Open a Gold account at `http://localhost:5006`, create one manual addition and one purchase, and confirm both rows display their quantity in `Số chỉ`. Update the Gold price and confirm the revaluation row has an empty quantity cell. Open a non-Gold account and confirm the column is absent.

- [ ] **Step 4: Check the working tree**

```bash
git status --short
```

Expected: no uncommitted files unless a defect found during verification required a separately reviewed correction.
