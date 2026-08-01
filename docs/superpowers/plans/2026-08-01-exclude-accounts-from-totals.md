# Exclude Accounts from Summary Totals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an option to exclude specific accounts from parent balance summary totals ("All accounts", "On budget", "Off budget") while retaining the account's individual balance display.

**Architecture:** Add an `exclude_from_totals` boolean field to the `accounts` table, update AQL spreadsheet query filters in `bindings.ts` (`allAccountBalance`, `onBudgetAccountBalance`, `offBudgetAccountBalance`) to exclude flagged accounts from aggregate calculations, add a toggle in `AccountMenuModal.tsx`, and apply muted styling to excluded account items in `Account.tsx` sidebar.

**Tech Stack:** TypeScript, React, Redux Toolkit, SQLite, Actual AQL Query Engine, Vitest / Jest.

## Global Constraints

- Native AQL Spreadsheet engine filtering for balance calculations.
- Clean CRDT sync-compatible SQLite migration for `exclude_from_totals`.
- All tests in `packages/desktop-client` and `packages/loot-core` must pass.

---

### Task 1: Migration & Data Model Changes

**Files:**
- Create: `packages/loot-core/migrations/1800000000002_exclude_from_totals.sql`
- Modify: `packages/loot-core/src/server/aql/schema/index.ts:70-85`
- Modify: `packages/loot-core/src/types/models/account.d.ts`

**Interfaces:**
- Produces: `AccountEntity.exclude_from_totals?: boolean` and AQL schema support for `account.exclude_from_totals`.

- [ ] **Step 1: Create SQLite Migration File**

Create `packages/loot-core/migrations/1800000000002_exclude_from_totals.sql`:
```sql
ALTER TABLE accounts ADD COLUMN exclude_from_totals INTEGER DEFAULT 0;
```

- [ ] **Step 2: Update AQL Schema**

Modify `packages/loot-core/src/server/aql/schema/index.ts` to add `exclude_from_totals`:
```ts
accounts: {
  id: f('id'),
  name: f('string'),
  offbudget: f('boolean'),
  closed: f('boolean'),
  exclude_from_totals: f('boolean'),
},
```

- [ ] **Step 3: Update `AccountEntity` Type**

Modify `packages/loot-core/src/types/models/account.d.ts`:
```ts
export interface AccountEntity {
  id: string;
  name: string;
  offbudget?: boolean;
  closed?: boolean;
  exclude_from_totals?: boolean;
  ...
}
```

- [ ] **Step 4: Verify Build & Types**

Run: `yarn build` (or `yarn check-types`) in `packages/loot-core`.
Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add packages/loot-core/migrations/1800000000002_exclude_from_totals.sql packages/loot-core/src/server/aql/schema/index.ts packages/loot-core/src/types/models/account.d.ts
git commit -m "feat(accounts): add exclude_from_totals schema and migration"
```

---

### Task 2: AQL & Spreadsheet Query Bindings Update

**Files:**
- Modify: `packages/desktop-client/src/spreadsheet/bindings.ts:52-78`
- Test: `packages/desktop-client/src/spreadsheet/bindings.test.ts` (or equivalent query test file)

**Interfaces:**
- Consumes: `exclude_from_totals` in AQL `accounts` schema filter.
- Produces: Filtered aggregate balance queries for `allAccountBalance`, `onBudgetAccountBalance`, and `offBudgetAccountBalance`.

- [ ] **Step 1: Write Failing Test for Excluded Accounts Query**

Add test in `packages/desktop-client/src/spreadsheet/bindings.test.ts`:
```ts
test('allAccountBalance filters out accounts marked with exclude_from_totals', () => {
  const binding = allAccountBalance();
  expect(binding.query._filter).toEqual(
    expect.arrayContaining([
      { 'account.closed': false },
      { 'account.exclude_from_totals': false },
    ]),
  );
});
```

- [ ] **Step 2: Run Test to Verify Failure**

Run: `yarn test packages/desktop-client/src/spreadsheet/bindings.test.ts`
Expected: FAIL due to missing `'account.exclude_from_totals': false` filter.

- [ ] **Step 3: Update `bindings.ts` Query Filters**

In `packages/desktop-client/src/spreadsheet/bindings.ts`:
```ts
export function allAccountBalance() {
  return {
    query: q('transactions')
      .filter({ 'account.closed': false, 'account.exclude_from_totals': false })
      .calculate({ $sum: '$amount' }),
    name: 'accounts-balance',
  } satisfies Binding<'account', 'accounts-balance'>;
}

export function onBudgetAccountBalance() {
  return {
    name: `onbudget-accounts-balance`,
    query: q('transactions')
      .filter({
        'account.offbudget': false,
        'account.closed': false,
        'account.exclude_from_totals': false,
      })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'account', 'onbudget-accounts-balance'>;
}

export function offBudgetAccountBalance() {
  return {
    name: `offbudget-accounts-balance`,
    query: q('transactions')
      .filter({
        'account.offbudget': true,
        'account.closed': false,
        'account.exclude_from_totals': false,
      })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'account', 'offbudget-accounts-balance'>;
}
```

- [ ] **Step 4: Run Test to Verify Pass**

Run: `yarn test packages/desktop-client/src/spreadsheet/bindings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop-client/src/spreadsheet/bindings.ts packages/desktop-client/src/spreadsheet/bindings.test.ts
git commit -m "feat(bindings): exclude flagged accounts from aggregate balance calculations"
```

---

### Task 3: Account Menu Modal Toggle Action

**Files:**
- Modify: `packages/desktop-client/src/components/modals/AccountMenuModal.tsx:240-310`

**Interfaces:**
- Consumes: `account.exclude_from_totals` property.
- Produces: Action item in `AccountMenuModal` dispatching `updateAccount({ id: account.id, exclude_from_totals: !account.exclude_from_totals })`.

- [ ] **Step 1: Add Toggle Action to `AccountMenuModal`**

In `packages/desktop-client/src/components/modals/AccountMenuModal.tsx`:
Add menu item:
```tsx
const isExcludedFromTotals = account.exclude_from_totals === true;

// Under menu items:
{
  name: 'toggle-exclude-from-totals',
  text: isExcludedFromTotals
    ? t('Include in summary totals')
    : t('Exclude from summary totals'),
}
```

And in the click handler:
```tsx
case 'toggle-exclude-from-totals':
  dispatch(
    updateAccount({
      ...account,
      exclude_from_totals: !account.exclude_from_totals,
    }),
  );
  onClose();
  break;
```

- [ ] **Step 2: Test Modal Action**

Run component tests or manually verify modal menu option appears and toggles state.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop-client/src/components/modals/AccountMenuModal.tsx
git commit -m "feat(ui): add exclude from summary totals toggle in AccountMenuModal"
```

---

### Task 4: Sidebar Styling & Visual Indicator

**Files:**
- Modify: `packages/desktop-client/src/components/sidebar/Account.tsx`

**Interfaces:**
- Consumes: `account.exclude_from_totals` prop on `Account` sidebar item.
- Produces: Visual dimmed styling & tooltip for excluded accounts.

- [ ] **Step 1: Update `Account.tsx` Sidebar Component**

In `packages/desktop-client/src/components/sidebar/Account.tsx`:
```tsx
const isExcluded = account?.exclude_from_totals === true;

// Apply muted styling to balance text when excluded:
<Text
  style={{
    color: isExcluded ? theme.pageTextSubdued : theme.sidebarItemText,
    fontStyle: isExcluded ? 'italic' : 'normal',
    opacity: isExcluded ? 0.7 : 1,
  }}
  title={isExcluded ? t('Excluded from summary totals') : undefined}
>
  ...
</Text>
```

- [ ] **Step 2: Run Desktop Client Tests**

Run: `yarn test` in `packages/desktop-client`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop-client/src/components/sidebar/Account.tsx
git commit -m "feat(sidebar): render muted style and tooltip for excluded account balances"
```
