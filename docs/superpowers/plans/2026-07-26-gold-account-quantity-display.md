# Gold Account Quantity Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display a Gold account's total quantity in chỉ instead of its monetary balance in the sidebar.

**Architecture:** Extend the existing sidebar `Account` component with a live AQL query for active `gold_lots` only when `account_subtype` is `gold`. Sum lot quantities with the existing Gold calculation helper and render the result in the right-side balance position; retain `CellValue` for every other account.

**Tech Stack:** React/TypeScript, Actual AQL live queries, Vitest, Testing Library.

## Global Constraints

- Only `account_subtype === 'gold'` changes display.
- Gold display uses `<quantity> chỉ`; ordinary account display remains financial currency.
- Tombstoned lots do not contribute to the quantity.
- Do not alter transaction amounts, current valuation, or gain/loss.

---

## File Structure

- `packages/desktop-client/src/components/sidebar/Account.tsx` — query and render Gold quantity in the existing sidebar balance location.
- `packages/desktop-client/src/components/sidebar/Account.test.tsx` — verify Gold quantity and normal currency displays.

### Task 1: Add failing sidebar display tests

**Files:**
- Test: `packages/desktop-client/src/components/sidebar/Account.test.tsx`

**Interfaces:**
- Consumes: account subtype and a mocked AQL result for `gold_lots`.
- Produces: assertions for `8.5 chỉ` on Gold accounts and unchanged `CellValue` usage otherwise.

- [ ] **Step 1: Write Gold and non-Gold rendering tests**

Render the sidebar `Account` with a Gold account and mocked live-query data:

```ts
[{ account_id: 'gold', quantity_chi: 3, tombstone: false },
 { account_id: 'gold', quantity_chi: 5.5, tombstone: false },
 { account_id: 'gold', quantity_chi: 9, tombstone: true }]
```

Assert `8.5 chỉ` is visible. Render a standard account and assert the Gold text is absent while its financial `CellValue` mock is present.

- [ ] **Step 2: Run the focused test and verify failure**

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web test src/components/sidebar/Account.test.tsx
```

Expected: FAIL because the sidebar always renders `CellValue`.

### Task 2: Implement conditional Gold quantity display

**Files:**
- Modify: `packages/desktop-client/src/components/sidebar/Account.tsx:1-160,260-290`
- Test: `packages/desktop-client/src/components/sidebar/Account.test.tsx`

**Interfaces:**
- Consumes: `useQuery`, `q('gold_lots')`, `calculateGoldSummary`.
- Produces: `goldQuantityDisplay` used in the `AlignedText` right slot.

- [ ] **Step 1: Add the conditional live query**

Import `useQuery`, `q`, and `calculateGoldSummary`. Query lots only for Gold accounts:

```ts
const isGoldAccount = account?.account_subtype === 'gold';
const { data: goldLots } = useQuery(
  () =>
    isGoldAccount && account
      ? q('gold_lots').filter({ account_id: account.id }).select('*')
      : null,
  [account?.id, isGoldAccount],
);
```

- [ ] **Step 2: Derive and render the display**

Compute total quantity with `calculateGoldSummary(goldLots ?? [], 0).quantityChi`. In `AlignedText.right`, replace `balanceCell` only for Gold accounts:

```tsx
isGoldAccount ? <Text>{`${quantityChi} chỉ`}</Text> : balanceCell
```

Keep the `balanceTestId` wrapper for both branches.

- [ ] **Step 3: Run focused tests**

Run the command from Task 1 Step 2.

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/desktop-client/src/components/sidebar/Account.tsx packages/desktop-client/src/components/sidebar/Account.test.tsx
git commit -m "feat: show gold account quantities in sidebar"
```

### Task 3: Verify integration

- [ ] **Step 1: Run web typecheck**

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web typecheck
```

Expected: all strict files pass.

- [ ] **Step 2: Manually verify**

Open the sidebar after adding Gold lots. Confirm Gold shows `8.5 chỉ` (or the actual total) while an ordinary account remains a currency amount.
