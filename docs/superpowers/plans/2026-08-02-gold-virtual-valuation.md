# Gold Virtual Valuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Include current market value for Gold accounts in current Off-Budget and Net Worth totals without inserting revaluation transactions.

**Architecture:** A shared pure calculation derives each eligible Gold account's market-value adjustment from active lots, stored price, and ledger balance. Client hooks supply active lots and current balances to sidebar totals. The Net Worth spreadsheet applies the aggregate adjustment only to its latest point when that point represents today/current month; all historical points remain transaction-ledger values.

**Tech Stack:** TypeScript, React, TanStack Query, Actual AQL, Vitest.

## Global Constraints

- Never write a price-adjustment transaction.
- Only `tombstone: false` lots are valued.
- Closed or `exclude_from_totals` Gold accounts contribute zero.
- An unset/non-positive market price contributes zero.
- Historical Net Worth points remain ledger-based.

---

### Task 1: Add pure virtual-valuation calculation

**Files:**
- Create: `actual-budget/packages/loot-core/src/shared/gold-valuation.ts`
- Create: `actual-budget/packages/loot-core/src/shared/gold-valuation.test.ts`

**Interfaces:**
- Produces `calculateGoldVirtualAdjustment(accounts, lots, balances): number`.
- Inputs: accounts with `id`, `account_subtype`, `closed`, `exclude_from_totals`, and `gold_current_price_per_chi`; active/tombstoned lots with `account_id`, `quantity_chi`, and `tombstone`; a `ReadonlyMap<string, number>` of ledger balances.

- [ ] **Step 1: Write failing unit tests**

Add tests that prove:

```ts
expect(
  calculateGoldVirtualAdjustment(
    [{ id: 'gold', account_subtype: 'gold', closed: 0, exclude_from_totals: 0, gold_current_price_per_chi: 8_000_000 }],
    [{ account_id: 'gold', quantity_chi: 2, tombstone: false }],
    new Map([['gold', 14_000_000]]),
  ),
).toBe(2_000_000);
```

Also cover tombstoned lots, no price, non-Gold account, closed Gold account, and excluded Gold account, all of which produce no adjustment.

- [ ] **Step 2: Verify RED**

```bash
cd actual-budget
./node_modules/.bin/vitest run --config vitest.config.ts packages/loot-core/src/shared/gold-valuation.test.ts
```

Expected: fail because the module and calculation do not exist.

- [ ] **Step 3: Implement minimal calculation**

Implement a pure function that filters eligible Gold accounts, sums active lot quantities by account, calculates `quantity × price − ledgerBalance`, and returns the aggregate. Treat missing balance as zero only for an account with active quantity and price.

- [ ] **Step 4: Verify GREEN**

```bash
cd actual-budget
./node_modules/.bin/vitest run --config vitest.config.ts packages/loot-core/src/shared/gold-valuation.test.ts
```

Expected: all calculation tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/loot-core/src/shared/gold-valuation.ts packages/loot-core/src/shared/gold-valuation.test.ts
git commit -m "feat(gold): calculate virtual market-value adjustments"
```

### Task 2: Add a client hook for current Gold virtual adjustment

**Files:**
- Create: `actual-budget/packages/desktop-client/src/hooks/useGoldVirtualAdjustment.ts`
- Create: `actual-budget/packages/desktop-client/src/hooks/useGoldVirtualAdjustment.test.ts`

**Interfaces:**
- Consumes loaded `AccountEntity[]` and AQL data for active `gold_lots` plus current account ledger balances.
- Produces `useGoldVirtualAdjustment(accounts): number`.

- [ ] **Step 1: Write failing hook tests**

Mock the AQL query results for active lots and grouped transaction balances. Render a hook with one open Off-Budget Gold account containing two active lots at a stored price and a ledger cost basis, then assert it returns market value minus ledger balance. Assert that an excluded or closed account returns zero.

- [ ] **Step 2: Verify RED**

```bash
cd actual-budget
./node_modules/.bin/vitest run --config vitest.config.ts packages/desktop-client/src/hooks/useGoldVirtualAdjustment.test.ts
```

Expected: fail because the hook does not exist.

- [ ] **Step 3: Implement the hook**

Use the existing live-query `useQuery` hook for:

```ts
q('gold_lots').filter({ tombstone: false }).select(['account_id', 'quantity_chi'])
```

and an AQL aggregate grouped by account for open transaction balances. Convert grouped results to `ReadonlyMap<AccountEntity['id'], number>` and call `calculateGoldVirtualAdjustment`. Return zero until both live query datasets are available.

- [ ] **Step 4: Verify GREEN**

```bash
cd actual-budget
./node_modules/.bin/vitest run --config vitest.config.ts packages/desktop-client/src/hooks/useGoldVirtualAdjustment.test.ts
```

Expected: hook tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop-client/src/hooks/useGoldVirtualAdjustment.ts packages/desktop-client/src/hooks/useGoldVirtualAdjustment.test.ts
git commit -m "feat(gold): expose current virtual valuation"
```

### Task 3: Apply virtual adjustment to Off-Budget sidebar total

**Files:**
- Modify: `actual-budget/packages/desktop-client/src/components/sidebar/Accounts.tsx:22-150`
- Modify: `actual-budget/packages/desktop-client/src/components/sidebar/Account.tsx`
- Test: `actual-budget/packages/desktop-client/src/components/sidebar/Accounts.test.tsx` (create if absent)

**Interfaces:**
- Consumes `useGoldVirtualAdjustment(offbudgetAccounts)`.
- Extends title `Account` rendering with an optional `balanceAdjustment?: number` applied only to its displayed balance binding.

- [ ] **Step 1: Write failing component test**

Render the Off-Budget title with a ledger binding value of `14_000_000` and `balanceAdjustment={2_000_000}`. Assert the displayed summary is `16_000_000`. Render an ordinary account row with no adjustment and assert its output is unchanged.

- [ ] **Step 2: Verify RED**

```bash
cd actual-budget
./node_modules/.bin/vitest run --config vitest.config.ts packages/desktop-client/src/components/sidebar/Accounts.test.tsx
```

Expected: fail because `Account` cannot receive or apply `balanceAdjustment`.

- [ ] **Step 3: Implement display-only adjustment**

In `Account`, wrap the title balance’s `CellValue` render function so it formats `props.value + balanceAdjustment`; preserve ordinary account and Gold quantity row behavior. In `Accounts`, call the hook with `offbudgetAccounts` and pass the result only to the Off-Budget title row.

- [ ] **Step 4: Verify GREEN**

```bash
cd actual-budget
./node_modules/.bin/vitest run --config vitest.config.ts packages/desktop-client/src/components/sidebar/Accounts.test.tsx
```

Expected: adjusted Off-Budget total is shown; normal account output is unchanged.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop-client/src/components/sidebar/Accounts.tsx packages/desktop-client/src/components/sidebar/Account.tsx packages/desktop-client/src/components/sidebar/Accounts.test.tsx
git commit -m "feat(gold): include market value in off-budget total"
```

### Task 4: Apply virtual adjustment only to current Net Worth endpoint

**Files:**
- Modify: `actual-budget/packages/desktop-client/src/components/reports/spreadsheets/net-worth-spreadsheet.ts`
- Modify: `actual-budget/packages/desktop-client/src/components/reports/reports/NetWorthCard.tsx`
- Test: `actual-budget/packages/desktop-client/src/components/reports/spreadsheets/net-worth-spreadsheet.test.ts`

**Interfaces:**
- Extend `recalculate`/spreadsheet input with `currentGoldAdjustment: number` and `applyCurrentGoldAdjustment: boolean`.
- Only add the adjustment to `graphData.data.at(-1)`, `netWorth`, assets/debt totals, and latest net-worth display when the report endpoint is current.

- [ ] **Step 1: Write failing spreadsheet tests**

Create ledger data with two graph points and a `2_000_000` adjustment. Assert the first historical point is unchanged while only the final current point increases by `2_000_000`. Add a second test with `applyCurrentGoldAdjustment: false` proving all points remain ledger values.

- [ ] **Step 2: Verify RED**

```bash
cd actual-budget
./node_modules/.bin/vitest run --config vitest.config.ts packages/desktop-client/src/components/reports/spreadsheets/net-worth-spreadsheet.test.ts
```

Expected: fail because the spreadsheet does not accept or apply the adjustment.

- [ ] **Step 3: Implement endpoint-only adjustment**

In `NetWorthCard`, call `useGoldVirtualAdjustment(accounts)` and determine whether the report end is current using `monthUtils.currentDay()` and the interval’s final endpoint. Pass both values into `netWorthSpreadsheet`.

In `recalculate`, after computing each ledger point, add the adjustment only when processing the final point and `applyCurrentGoldAdjustment` is true. Update its assets/debt and formatted values from the adjusted total; compute `totalChange` from the adjusted latest value while retaining the ledger-only first point.

- [ ] **Step 4: Verify GREEN**

```bash
cd actual-budget
./node_modules/.bin/vitest run --config vitest.config.ts packages/desktop-client/src/components/reports/spreadsheets/net-worth-spreadsheet.test.ts
```

Expected: historical point remains ledger-based; current endpoint includes virtual value.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop-client/src/components/reports/spreadsheets/net-worth-spreadsheet.ts packages/desktop-client/src/components/reports/reports/NetWorthCard.tsx packages/desktop-client/src/components/reports/spreadsheets/net-worth-spreadsheet.test.ts
git commit -m "feat(gold): add virtual value to current net worth"
```

### Task 5: Remove transaction-based revaluation and verify

**Files:**
- Modify: `actual-budget/packages/loot-core/src/server/accounts/app.ts:629-655, 840-860`
- Modify: `actual-budget/packages/desktop-client/src/accounts/mutations.ts`
- Modify: `actual-budget/packages/desktop-client/src/components/accounts/GoldAccountPanel.tsx`
- Test: `actual-budget/packages/loot-core/src/server/accounts/app-bank-sync.test.ts`

**Interfaces:**
- `gold-update-price` stores only `gold_current_price_per_chi`.
- Gold purchase/manual-add never inserts a price-revaluation transaction.

- [ ] **Step 1: Write failing regression test**

Update the account handler test to set a market price, add a lot, and assert exactly one purchase/manual-add transaction exists. Update price and assert no extra `Gold price revaluation` transaction is created.

- [ ] **Step 2: Verify RED**

```bash
cd actual-budget
./node_modules/.bin/vitest run --config vitest.config.ts packages/loot-core/src/server/accounts/app-bank-sync.test.ts
```

Expected: fail because current handlers call `revalueGoldAccount`.

- [ ] **Step 3: Remove revaluation writes**

Delete `revalueGoldAccount` and its calls from purchase, manual-add, and `gold-update-price`. Preserve validation, account price persistence, live-query sync events, and user notifications.

- [ ] **Step 4: Verify GREEN**

```bash
cd actual-budget
./node_modules/.bin/vitest run --config vitest.config.ts packages/loot-core/src/server/accounts/app-bank-sync.test.ts
```

Expected: no revaluation transactions are inserted.

- [ ] **Step 5: Run full focused verification**

```bash
cd actual-budget
./node_modules/.bin/vitest run --config vitest.config.ts packages/loot-core/src/shared/gold.test.ts packages/loot-core/src/shared/gold-valuation.test.ts packages/loot-core/src/server/accounts/app-bank-sync.test.ts packages/desktop-client/src/components/transactions/goldQuantity.test.ts
./node_modules/.bin/oxfmt --check packages/loot-core/src/shared/gold-valuation.ts packages/desktop-client/src/hooks/useGoldVirtualAdjustment.ts packages/desktop-client/src/components/sidebar/Accounts.tsx packages/desktop-client/src/components/sidebar/Account.tsx packages/desktop-client/src/components/reports/spreadsheets/net-worth-spreadsheet.ts packages/desktop-client/src/components/reports/reports/NetWorthCard.tsx packages/loot-core/src/server/accounts/app.ts
```

Expected: all tests and formatting checks pass.

- [ ] **Step 6: Commit**

```bash
git add packages/loot-core/src/server/accounts/app.ts packages/desktop-client/src/accounts/mutations.ts packages/desktop-client/src/components/accounts/GoldAccountPanel.tsx packages/loot-core/src/server/accounts/app-bank-sync.test.ts
git commit -m "fix(gold): keep price valuation out of transactions"
```
