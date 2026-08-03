# Gold Data Integrity Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix corrupted gold lot dates, exclude deleted lots from totals, make scraper failures explicit, and remove the misleading revaluation endpoint.

**Architecture:** Normalize dates at the Actual account-handler boundary, where all gold-lot writes pass through `insertGoldLot`. Add `tombstone: 0` to the three desktop gold-lot queries. Make `fetch_latest_gold_prices` return only parsed provider data and raise when none is available; the FastAPI route will translate that failure to a 502. Remove `/gold/revalue` and its test.

**Tech Stack:** TypeScript, SQLite/Actual Budget query API, Python, FastAPI, pytest, Vitest.

## Global Constraints

- Actual gold lot dates use integer `YYYYMMDD`.
- Gold summaries must include only rows with `tombstone = 0`.
- Scraper failure must never produce fabricated market prices.
- Revaluation remains exclusively in Actual Budget's authenticated IPC mutation.
- Follow test-first development: each behavior gets a failing regression test before production code.

---

### Task 1: Normalize and validate gold lot dates

**Files:**
- Modify: `actual-budget/packages/loot-core/src/server/accounts/app.ts:581-599`
- Test: `actual-budget/packages/loot-core/src/server/accounts/app-bank-sync.test.ts`

**Interfaces:**
- Consumes the existing `GoldLotInput.date: string` handler input.
- Produces an integer date passed to `db.insertWithSchema('gold_lots', ...)`.

- [ ] **Step 1: Write the failing tests**

Add tests for `gold-manual-add` that assert a supplied `date: '2026-08-02'` is inserted as `20260802`, and that a malformed date is rejected before an insert is attempted. Use the existing database setup and handler invocation patterns in `app-bank-sync.test.ts`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run from `actual-budget`:

```bash
./node_modules/.bin/vitest run --config vitest.config.ts packages/loot-core/src/server/accounts/app-bank-sync.test.ts
```

Expected: the date assertion fails because the current implementation inserts the ISO string, and the invalid-date test fails because no validation exists.

- [ ] **Step 3: Implement the minimal conversion**

Add a local helper near `insertGoldLot` that accepts `YYYY-MM-DD`, validates it by constructing a calendar date and checking the normalized components, and returns `Number(date.replaceAll('-', ''))`. Call it before inserting `gold_lots`; use the converted value for `date`.

Reject empty, incorrectly shaped, impossible, or non-finite date values with `Error('Gold date must be a valid YYYY-MM-DD date')`.

- [ ] **Step 4: Run the focused test and verify it passes**

```bash
./node_modules/.bin/vitest run --config vitest.config.ts packages/loot-core/src/server/accounts/app-bank-sync.test.ts
```

Expected: all tests in the file pass.

- [ ] **Step 5: Commit**

```bash
git add packages/loot-core/src/server/accounts/app.ts packages/loot-core/src/server/accounts/app-bank-sync.test.ts
git commit -m "fix(gold): store lot dates as Actual integers"
```

### Task 2: Exclude tombstoned lots from all desktop summaries

**Files:**
- Modify: `actual-budget/packages/desktop-client/src/components/accounts/GoldAccountPanel.tsx:43-45`
- Modify: `actual-budget/packages/desktop-client/src/components/sidebar/Account.tsx:149-156`
- Modify: `actual-budget/packages/desktop-client/src/components/accounts/Balance.tsx:199-207`
- Test: `actual-budget/packages/loot-core/src/shared/gold.test.ts`

**Interfaces:**
- Existing `calculateGoldSummary` remains pure and unchanged.
- Each desktop query produces only active gold lots.

- [ ] **Step 1: Write the failing test**

Add a summary regression test with an active lot and a tombstoned lot. Pass only active rows to `calculateGoldSummary` as the query contract requires and assert the deleted lot cannot affect quantity, cost basis, or P&L. Also update the gold-lot query filters in the three components to include `tombstone: 0`.

- [ ] **Step 2: Run the focused test and verify the regression test fails if the contract is not enforced**

```bash
./node_modules/.bin/vitest run --config vitest.config.ts packages/loot-core/src/shared/gold.test.ts
```

Expected: the newly added regression test should fail against an implementation that includes the tombstoned row; retain the failing test before making the query changes.

- [ ] **Step 3: Implement the query filters**

Change each query filter from:

```ts
.filter({ account_id: account.id })
```

to:

```ts
.filter({ account_id: account.id, tombstone: 0 })
```

Extend local lot types with `tombstone` where required by the query result typing.

- [ ] **Step 4: Run focused tests and formatting**

```bash
./node_modules/.bin/vitest run --config vitest.config.ts packages/loot-core/src/shared/gold.test.ts packages/desktop-client/src/components/transactions/goldQuantity.test.ts
./node_modules/.bin/oxfmt --check packages/desktop-client/src/components/accounts/GoldAccountPanel.tsx packages/desktop-client/src/components/sidebar/Account.tsx packages/desktop-client/src/components/accounts/Balance.tsx
```

Expected: tests and formatting checks pass.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop-client/src/components/accounts/GoldAccountPanel.tsx packages/desktop-client/src/components/sidebar/Account.tsx packages/desktop-client/src/components/accounts/Balance.tsx packages/loot-core/src/shared/gold.test.ts
 git commit -m "fix(gold): exclude tombstoned lots from summaries"
```

### Task 3: Make gold scraper failures explicit

**Files:**
- Modify: `personal_finance/src/finance_common/gold_scraper.py:35-61`
- Modify: `personal_finance/src/bank_webhook/app.py:239-243`
- Test: `personal_finance/tests/test_gold_scraper.py`
- Test: `personal_finance/tests/test_gold_api.py`

**Interfaces:**
- `fetch_latest_gold_prices() -> list[GoldPrice]` returns only valid parsed prices or raises `RuntimeError` when no provider yields valid data.
- `GET /gold/prices/latest` returns HTTP 502 with a safe error body when scraping fails.

- [ ] **Step 1: Write failing Python tests**

Add a scraper test that patches both provider requests to fail and asserts `fetch_latest_gold_prices` raises `RuntimeError` rather than returning the hardcoded fallback. Add an API test that patches `fetch_latest_gold_prices` to raise and asserts status `502`.

- [ ] **Step 2: Run tests and verify they fail**

```bash
cd personal_finance
.venv/bin/python -m pytest tests/test_gold_scraper.py tests/test_gold_api.py -q
```

Expected: the scraper test fails because the current fallback returns a fake SJC price; the API test fails because the route currently propagates the exception.

- [ ] **Step 3: Remove fabricated provider fallbacks**

Change `parse_webtygia_html` so provider-name presence alone returns no price; only return values extracted from a valid numeric pattern. Remove the hardcoded fallback in `fetch_latest_gold_prices`. After both provider attempts, raise `RuntimeError('Unable to fetch valid gold prices from configured providers')`.

Add a FastAPI exception handling branch in the route that catches this `RuntimeError` and returns `JSONResponse(status_code=502, content={'detail': 'Gold price providers unavailable'})`.

- [ ] **Step 4: Run focused Python tests**

```bash
cd personal_finance
.venv/bin/python -m pytest tests/test_gold_scraper.py tests/test_gold_api.py -q
```

Expected: all focused tests pass, including existing valid parser tests.

- [ ] **Step 5: Commit**

```bash
git add src/finance_common/gold_scraper.py src/bank_webhook/app.py tests/test_gold_scraper.py tests/test_gold_api.py
git commit -m "fix(gold): fail safely when price providers are unavailable"
```

### Task 4: Remove the non-functional revaluation endpoint

**Files:**
- Modify: `personal_finance/src/bank_webhook/app.py:246-251`
- Modify: `personal_finance/tests/test_gold_api.py`

**Interfaces:**
- `/gold/prices/latest` remains read-only.
- `/gold/revalue` no longer exists; Actual IPC remains the revaluation interface.

- [ ] **Step 1: Write the failing removal test**

Replace the existing revaluation test with an assertion that `client.post('/gold/revalue?account_id=dummy_acc').status_code == 404`.

- [ ] **Step 2: Run the test and verify it fails**

```bash
cd personal_finance
.venv/bin/python -m pytest tests/test_gold_api.py::test_trigger_gold_revaluation -q
```

Expected: current route returns 200, so the test fails.

- [ ] **Step 3: Remove the route**

Delete the `trigger_gold_revaluation` route and its unused scraper import. Keep the latest-price route unchanged except for Task 3's failure handling.

- [ ] **Step 4: Run the focused test and verify it passes**

```bash
cd personal_finance
.venv/bin/python -m pytest tests/test_gold_api.py -q
```

Expected: all tests pass and the removed route returns 404.

- [ ] **Step 5: Commit**

```bash
git add src/bank_webhook/app.py tests/test_gold_api.py
git commit -m "remove(bank-webhook): remove fake gold revaluation endpoint"
```

### Task 5: Full verification and review

**Files:**
- No planned source changes.

- [ ] **Step 1: Run the full Python suite**

```bash
cd personal_finance
.venv/bin/python -m pytest -q
```

Expected: zero failures.

- [ ] **Step 2: Run Actual targeted tests with the repository configuration**

```bash
cd actual-budget
./node_modules/.bin/vitest run --config vitest.config.ts packages/loot-core/src/server/accounts/app-bank-sync.test.ts packages/loot-core/src/shared/gold.test.ts packages/desktop-client/src/components/transactions/goldQuantity.test.ts
```

Expected: zero failures and no environment errors.

- [ ] **Step 3: Run formatting and type checks available in the environment**

```bash
cd actual-budget
./node_modules/.bin/oxfmt --check packages/desktop-client/src/components/accounts/GoldAccountPanel.tsx packages/desktop-client/src/components/sidebar/Account.tsx packages/desktop-client/src/components/accounts/Balance.tsx packages/loot-core/src/server/accounts/app.ts
./node_modules/.bin/oxlint --type-aware --quiet
```

Expected: no formatting or lint errors.

- [ ] **Step 4: Inspect final diffs and status**

```bash
git -C actual-budget diff upstream/master...HEAD --check
git -C personal_finance diff origin/main...HEAD --check
git -C actual-budget status --short
git -C personal_finance status --short
```

Confirm only intended source/test changes are present and no `/gold/revalue` route remains.
