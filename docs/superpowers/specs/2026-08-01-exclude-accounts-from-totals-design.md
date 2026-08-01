# Design Spec: Exclude Specific Accounts from Summary Totals

**Date:** 2026-08-01  
**Status:** Approved  

## Overview
Add an option to exclude specific accounts (such as "Gửi người thân", "Tiền người khác", "Đầu tư cho bản thân") from parent balance summary totals ("All accounts", "On budget", "Off budget"). The excluded account still displays its own balance in the sidebar, but its value is omitted when computing aggregate section header totals.

---

## 1. Database & Schema Changes

### 1.1 SQLite Migration
Add migration `packages/loot-core/src/server/migrations/1800000000002_exclude_from_totals.sql`:
```sql
ALTER TABLE accounts ADD COLUMN exclude_from_totals INTEGER DEFAULT 0;
```

### 1.2 AQL Schema
In `packages/loot-core/src/server/aql/schema/index.ts`:
```ts
exclude_from_totals: f('boolean'),
```

### 1.3 Type Definition
In `AccountEntity` (`@actual-app/core/types/models`):
```ts
export interface AccountEntity {
  ...
  exclude_from_totals?: boolean;
}
```

---

## 2. AQL & Spreadsheet Query Bindings

In `packages/desktop-client/src/spreadsheet/bindings.ts`:

- **`allAccountBalance()`**:
  Filter transactions with `account.closed = false` and `account.exclude_from_totals = false`.
- **`onBudgetAccountBalance()`**:
  Filter transactions with `account.offbudget = false`, `account.closed = false`, and `account.exclude_from_totals = false`.
- **`offBudgetAccountBalance()`**:
  Filter transactions with `account.offbudget = true`, `account.closed = false`, and `account.exclude_from_totals = false`.
- **`accountBalance(accountId)`**:
  Unchanged (individual account views always reflect the account's actual total).

---

## 3. UI & Sidebar Components

### 3.1 Account Menu Action
In `packages/desktop-client/src/components/modals/AccountMenuModal.tsx`:
- Add a menu action item to toggle `exclude_from_totals`.
- Dispatches `updateAccount({ id: account.id, exclude_from_totals: !account.exclude_from_totals })`.

### 3.2 Sidebar Styling
In `packages/desktop-client/src/components/sidebar/Account.tsx`:
- When `account.exclude_from_totals` is `true`, render the balance in a muted style (`theme.pageTextSubdued`) with a visual indicator tooltip ("Excluded from summary totals").

---

## 4. Verification & Testing
- Unit tests in `bindings.test.ts` verifying that accounts with `exclude_from_totals = true` are omitted from aggregate balance calculations.
- Component tests for `AccountMenuModal` toggle behavior.
