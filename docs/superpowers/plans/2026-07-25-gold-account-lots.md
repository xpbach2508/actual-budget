# Gold Account Lots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add purchase lots, manual valuation, and category-free transfer-funded purchases for off-budget Gold accounts.

**Architecture:** A `gold_lots` synced record stores immutable physical lots normalized to chỉ. The account keeps the manually supplied current VND/chỉ price. Server handlers create lots together with monetary transfer or adjustment transactions; the client renders actions and a derived summary.

**Tech Stack:** TypeScript, React, SQLite migrations, Actual sync/AQL, Vitest.

## Global Constraints

- Work directly on `master`.
- Gold only; `1 cây = 10 chỉ`; UI default is `chỉ`.
- Transfers and valuation adjustments use no category and do not affect budget spending.
- No sale flow and no external price feed.

---

## File Structure

- Create `packages/loot-core/migrations/1800000000001_gold_lots.sql` — table and account price column.
- Create `packages/loot-core/src/shared/gold.ts` and `.test.ts` — normalization and valuation calculations.
- Modify `packages/loot-core/src/types/models/account.ts`, `packages/loot-core/src/server/db/types/index.ts`, and `packages/loot-core/src/server/aql/schema/index.ts` — record types and query schema.
- Modify `packages/loot-core/src/server/accounts/app.ts` — lot handlers and account metadata returned to the client.
- Modify `packages/desktop-client/src/accounts/mutations.ts` — lot mutation hooks.
- Create `packages/desktop-client/src/components/accounts/GoldAccountPanel.tsx` and test — summary and three forms/actions.
- Modify `packages/desktop-client/src/components/accounts/Account.tsx` — render panel only for Gold accounts.
- Modify `packages/desktop-client/src/components/modals/CreateLocalAccountModal.tsx` — Gold creation starts empty, without generic Balance.

### Task 1: Gold calculations and schema

**Files:** create migration, `shared/gold.ts`, `shared/gold.test.ts`; modify account/AQL/db types.

- [ ] **Step 1: Write failing pure calculation tests**

```ts
import { describe, expect, it } from 'vitest';
import { calculateGoldSummary, normalizeGoldQuantity } from './gold';

describe('gold calculations', () => {
  it('normalizes cây to chỉ', () => {
    expect(normalizeGoldQuantity(2, 'cay')).toBe(20);
  });
  it('calculates cost, current value, and gain', () => {
    expect(calculateGoldSummary([{ quantity_chi: 3, cost_per_chi: 7000000 }], 8000000)).toEqual({ quantityChi: 3, costBasis: 21000000, currentValue: 24000000, gainLoss: 3000000 });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/core test src/shared/gold.test.ts
```

Expected: import failure because `gold.ts` does not exist.

- [ ] **Step 3: Add minimal calculation module and database types**

Implement `normalizeGoldQuantity(quantity, unit)` with `cay` multiplier 10 and `calculateGoldSummary(lots, price)` using `reduce`. Add `DbGoldLot` and `GoldLotEntity`; add `gold_current_price_per_chi` to accounts. Migration must create:

```sql
ALTER TABLE accounts ADD COLUMN gold_current_price_per_chi INTEGER DEFAULT NULL;
CREATE TABLE gold_lots (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  date TEXT NOT NULL,
  quantity_chi REAL NOT NULL,
  cost_per_chi INTEGER NOT NULL,
  transfer_id TEXT DEFAULT NULL,
  tombstone INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX gold_lots_account_id ON gold_lots(account_id, tombstone);
```

Add `gold_lots` to the AQL schema with id, account reference, date, quantity, cost, transfer, and tombstone fields.

- [ ] **Step 4: Verify GREEN and typecheck**

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/core test src/shared/gold.test.ts
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web typecheck
```

- [ ] **Step 5: Commit**

```bash
git add packages/loot-core
git commit -m "feat: add gold lot schema and calculations"
```

### Task 2: Server lot operations

**Files:** modify `packages/loot-core/src/server/accounts/app.ts`; create `packages/loot-core/src/server/accounts/gold.test.ts`.

- [ ] **Step 1: Write failing handler tests**

Test `gold-purchase` creates two category-null linked transactions with opposite amounts and a lot carrying the transfer id. Test `gold-manual-add` creates one positive Gold transaction and no source transaction. Test `gold-update-price` persists price and inserts a category-null adjustment equal to `currentValue - accountBalance`.

- [ ] **Step 2: Run server tests and verify RED**

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/core test src/server/accounts/gold.test.ts
```

Expected: handlers are absent.

- [ ] **Step 3: Implement category-free handlers**

Register `gold-purchase`, `gold-manual-add`, and `gold-update-price` in `AccountHandlers`. Validate gold subtype, positive quantity, non-negative amount/price, and distinct source account. Use existing transfer transaction primitives to create linked transactions, insert a UUID lot, and run `revalueGoldAccount` after purchases/manual additions when price is present. The revaluation inserts only the difference from `getAccountBalance` with `category: null`.

- [ ] **Step 4: Verify GREEN and commit**

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/core test src/server/accounts/gold.test.ts
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web typecheck
git add packages/loot-core/src/server/accounts
git commit -m "feat: add gold account lot operations"
```

### Task 3: Gold account UI

**Files:** create `GoldAccountPanel.tsx` and test; modify account screen, client mutations, and create-account modal.

- [ ] **Step 1: Write failing panel tests**

Render a Gold account with lots and assert summary quantity, VND cost/value/gain, the three labelled actions, default `Chỉ`, and that rendering a non-Gold account does not render the panel.

- [ ] **Step 2: Run test and verify RED**

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web test src/components/accounts/GoldAccountPanel.test.tsx
```

Expected: module does not exist.

- [ ] **Step 3: Implement panel and hooks**

Add mutation hooks that send the three server commands. Query lots by account id; compute display with `calculateGoldSummary`. Add compact modal forms for purchase (source account/date/quantity/unit/total), manual addition (date/quantity/unit/total), and price update (VND/chỉ). Use `toRelaxedNumber`, existing DateSelect, Select, Input, and notification patterns. Suppress the generic Balance input when the create modal subtype is `gold`.

- [ ] **Step 4: Verify GREEN and commit**

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web test src/components/accounts/GoldAccountPanel.test.tsx
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web typecheck
git add packages/desktop-client
git commit -m "feat: add gold account purchase and valuation UI"
```

### Task 4: Full verification and local deployment

- [ ] **Step 1: Run verification**

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web test
node .yarn/releases/yarn-4.17.1.cjs build:browser
docker compose -f docker-compose.local.yml up -d --build actual
curl --fail http://localhost:5006/health
```

Expected: tests and browser build succeed; health returns `{"status":"UP"}`.

- [ ] **Step 2: Update progress docs and commit**

Update `TASK_BACKLOG.md`, `PERSONAL_FINANCE_SPECIFICATION.md`, and `ARCHITECTURE_AND_ROADMAP.md` to record Gold lots, manual valuation, and category-free transfer purchases. Commit tracked Actual documentation changes.
