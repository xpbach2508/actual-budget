# Gold Price Synced Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Have bank-webhook sync validated Gold prices into Actual metadata, with daily and Android-manual refreshes, while keeping the ledger transaction-free.

**Architecture:** Use Actual’s supported synced preference/metadata dataset rather than the fork-only `accounts` field. Bank-webhook serializes a per-account Gold-price record and commits it through actualpy. Actual resolves metadata first for Gold valuation. Android calls the protected refresh endpoint; a single scheduler invokes the same service daily at 09:00 Vietnam time.

**Tech Stack:** Python/FastAPI/actualpy, Kotlin/Compose/OkHttp, TypeScript/Vitest.

## Global Constraints

- Never create a revaluation transaction.
- Metadata price requires a positive parsed SJC sell price.
- Metadata key format is `gold-price:<account-id>`.
- Store `price_per_chi`, `provider`, and UTC `fetched_at`.
- Preserve old metadata after failed refresh.
- Daily refresh runs once at 09:00 `Asia/Ho_Chi_Minh`.

---

### Task 1: Establish actualpy synced-metadata write/read adapter

**Files:**
- Create: `personal_finance/src/finance_common/gold_price_metadata.py`
- Test: `personal_finance/tests/test_gold_price_metadata.py`

**Interfaces:**
- `gold_price_key(account_id: str) -> str`
- `GoldPriceMetadata(price_per_chi: int, provider: str, fetched_at: datetime)`
- `read_gold_price_metadata(session, account_id) -> GoldPriceMetadata | None`
- `write_gold_price_metadata(session, account_id, metadata) -> None`

- [ ] Write failing tests that use actualpy’s existing standard preference/metadata APIs to serialize a record under `gold-price:gold-account`, round-trip it, reject zero/negative price, and leave an unrelated key untouched.
- [ ] Run `cd personal_finance && .venv/bin/python -m pytest tests/test_gold_price_metadata.py -q`; expect failure because the adapter does not exist.
- [ ] Implement the adapter against actualpy’s supported synced preference model/API discovered from its installed package tests; do not define a second `accounts` SQLModel and do not execute direct SQLite updates.
- [ ] Re-run the focused test; expect pass.
- [ ] Commit: `git commit -m "feat(gold): store price in synced metadata"`.

### Task 2: Implement bank-webhook refresh service and persistence

**Files:**
- Create: `personal_finance/src/finance_common/gold_refresh.py`
- Modify: `personal_finance/src/finance_common/gold_models.py`
- Test: `personal_finance/tests/test_gold_refresh.py`

**Interfaces:**
- `refresh_gold_prices(settings) -> GoldRefreshResult`
- `GoldRefreshResult(provider, sell_price_per_chi, fetched_at, updated_account_ids)`

- [ ] Write failing tests for a valid SJC response updating metadata for each open Gold account, provider failure preserving existing metadata, and absence of transaction writes.
- [ ] Run `cd personal_finance && .venv/bin/python -m pytest tests/test_gold_refresh.py -q`; expect failure.
- [ ] Implement a short-lived `open_actual` session: enumerate Gold account IDs with Actual’s existing account API, write metadata for eligible accounts, and call `actual.commit()` only after all writes succeed.
- [ ] Persist refresh result/error metadata in bank-webhook’s durable store for observability.
- [ ] Re-run focused tests; expect pass.
- [ ] Commit: `git commit -m "feat(gold): refresh synced price metadata"`.

### Task 3: Add protected manual endpoint and daily scheduler

**Files:**
- Create: `personal_finance/src/bank_webhook/gold_scheduler.py`
- Modify: `personal_finance/src/bank_webhook/app.py`
- Test: `personal_finance/tests/test_gold_api.py`
- Test: `personal_finance/tests/test_gold_scheduler.py`

- [ ] Write failing endpoint tests for 401 without the shared secret, 200 with a valid manual refresh, and 502 on provider failure.
- [ ] Write failing scheduler tests using injected clock/sleep/refresh functions, proving exactly one run at 09:00 `Asia/Ho_Chi_Minh`.
- [ ] Run focused tests; expect failure.
- [ ] Implement `POST /gold/refresh` using existing secret/Cloudflare checks, returning only `GoldRefreshResult` data.
- [ ] Implement the scheduler as a lifespan-managed async task that calls the same refresh service, survives individual failures, and exits cleanly with the app stop event.
- [ ] Re-run focused tests; expect pass.
- [ ] Commit: `git commit -m "feat(gold): schedule and expose metadata refresh"`.

### Task 4: Add Android manual refresh action

**Files:**
- Modify: `personal_finance/android/app/src/main/java/vn/id/xpbach/banklistener/net/Dtos.kt`
- Modify: `personal_finance/android/app/src/main/java/vn/id/xpbach/banklistener/net/WebhookClient.kt`
- Modify: `personal_finance/android/app/src/main/java/vn/id/xpbach/banklistener/ui/AppUi.kt`
- Test: `personal_finance/android/app/src/test/java/vn/id/xpbach/banklistener/net/WebhookClientTest.kt`

- [ ] Write failing MockWebServer tests for authenticated `POST /gold/refresh`, successful metadata result decoding, and 401/non-2xx result mapping.
- [ ] Run with `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ./gradlew :app:testDebugUnitTest --tests '*WebhookClientTest'`; expect failure.
- [ ] Add `GoldRefreshBody` and `GoldRefreshResult`, then `WebhookClient.refreshGoldPrice()` using configured base URL and existing authentication headers.
- [ ] Add a Compose `Refresh gold price` action with loading state and snackbar response showing SJC price/timestamp or safe failure text.
- [ ] Re-run Android focused tests; expect pass.
- [ ] Commit: `git commit -m "feat(android): trigger gold metadata refresh"`.

### Task 5: Resolve Gold prices from synced metadata in Actual

**Files:**
- Create: `actual-budget/packages/loot-core/src/shared/gold-price-metadata.ts`
- Create: `actual-budget/packages/loot-core/src/shared/gold-price-metadata.test.ts`
- Modify: `actual-budget/packages/desktop-client/src/hooks/useGoldVirtualAdjustment.ts`
- Modify: `actual-budget/packages/desktop-client/src/components/accounts/GoldAccountPanel.tsx`

- [ ] Write failing resolver tests proving valid metadata price takes precedence over legacy `gold_current_price_per_chi`, invalid/absent metadata falls back to legacy value, and no value resolves to zero.
- [ ] Run targeted Vitest; expect failure.
- [ ] Implement parsing/validation for the JSON metadata record and integrate a live preferences query into Gold display and virtual adjustment hook.
- [ ] Re-run tests; expect pass.
- [ ] Commit: `git commit -m "feat(gold): resolve valuation from synced metadata"`.

### Task 6: Full verification

- [ ] Run `cd personal_finance && .venv/bin/python -m pytest -q`.
- [ ] Run Android tests with `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`.
- [ ] Run Actual Gold-focused Vitest tests and browser build.
- [ ] Run `git diff --check` and inspect statuses in both repositories.
