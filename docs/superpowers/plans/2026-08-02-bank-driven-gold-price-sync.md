# Bank-Driven Gold Price Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh SJC price daily at 09:00 Vietnam time and on an Android Bank Listener button press, then sync only Actual’s Gold account price metadata.

**Architecture:** `personal_finance` owns quote fetch, validation, durable refresh metadata, scheduling, and Actual account-field mutation. The Android app calls one authenticated manual-refresh endpoint and renders its result. Actual Budget does not fetch prices; it consumes `gold_current_price_per_chi` through normal account sync and virtual valuation.

**Tech Stack:** Python/FastAPI/SQLModel/actualpy, Kotlin/Compose/OkHttp, TypeScript/Vitest.

## Global Constraints

- No price update may create, alter, or tombstone a transaction.
- Price data requires a positive numeric parsed SJC sell price.
- Scheduled refresh runs at 09:00 `Asia/Ho_Chi_Minh` once per calendar day.
- Manual refresh endpoint requires existing shared-secret and Cloudflare Access checks.
- A failed refresh preserves the prior Actual account price and records the error.

---

### Task 1: Support Actual custom Gold account price field in actualpy

**Files:**
- Modify: `personal_finance/src/finance_common/actual_client.py`
- Test: `personal_finance/tests/test_finance_common_actual_client.py`

**Interfaces:**
- Add `GoldAccountPrice` SQLModel mapped to `accounts` with `id` and `gold_current_price_per_chi`.
- Extend `_register_custom_models()` so actualpy’s table-column map includes this custom accounts column.

- [ ] Write a failing test that asserts the registered account mapping includes `gold_current_price_per_chi` and the model declares that column.
- [ ] Run `cd personal_finance && .venv/bin/python -m pytest tests/test_finance_common_actual_client.py -q`; expect failure.
- [ ] Implement the model and mapping registration using `Integer` nullable column semantics.
- [ ] Re-run the focused test; expect pass.
- [ ] Commit: `git commit -m "feat(actual): map gold account price metadata"`.

### Task 2: Build a reusable bank-webhook Gold refresh service

**Files:**
- Create: `personal_finance/src/finance_common/gold_refresh.py`
- Modify: `personal_finance/src/finance_common/gold_models.py`
- Test: `personal_finance/tests/test_gold_refresh.py`

**Interfaces:**
- `refresh_gold_prices(settings) -> GoldRefreshResult`
- `GoldRefreshResult(provider: str, sell_price_per_chi: int, fetched_at: datetime, updated_account_ids: list[str])`
- Persist durable latest refresh metadata and last error in a `gold_price_refreshes` model/table or the existing service SQLite store.

- [ ] Write failing tests for: valid SJC refresh updates only open Gold accounts; closed/non-Gold accounts are unchanged; provider failure raises and leaves accounts unchanged; no transaction APIs are called.
- [ ] Run `cd personal_finance && .venv/bin/python -m pytest tests/test_gold_refresh.py -q`; expect failure.
- [ ] Implement a short-lived `open_actual` session, query `GoldAccountPrice` rows, select the SJC sell price from `fetch_latest_gold_prices`, set only `gold_current_price_per_chi`, then call `actual.commit()` once.
- [ ] Persist success metadata after commit; persist an error record when fetching or committing fails without overwriting the prior successful record.
- [ ] Re-run focused tests; expect pass.
- [ ] Commit: `git commit -m "feat(gold): refresh Actual account price metadata"`.

### Task 3: Expose authenticated manual refresh and daily scheduler

**Files:**
- Modify: `personal_finance/src/bank_webhook/app.py`
- Create: `personal_finance/src/bank_webhook/gold_scheduler.py`
- Test: `personal_finance/tests/test_gold_api.py`
- Test: `personal_finance/tests/test_gold_scheduler.py`

**Interfaces:**
- `POST /gold/refresh` returns `{provider, sell_price_per_chi, fetched_at, updated_account_ids}`.
- `run_daily_gold_refresh(settings, stop_event)` waits for the next 09:00 `Asia/Ho_Chi_Minh`, runs refresh once, and reschedules after success or failure.

- [ ] Write failing API tests for missing/wrong secret (401), valid refresh (200 and sanitized result), and refresh failure (502 with safe detail).
- [ ] Write failing scheduler tests using an injected clock/sleep/refresh function, proving one run at 09:00 and no duplicate concurrent execution.
- [ ] Run `cd personal_finance && .venv/bin/python -m pytest tests/test_gold_api.py tests/test_gold_scheduler.py -q`; expect failure.
- [ ] Implement `gold_scheduler.py` using `zoneinfo.ZoneInfo('Asia/Ho_Chi_Minh')`, an async wait loop, and `asyncio.to_thread(refresh_gold_prices, settings)`.
- [ ] Start/cancel this task in the existing FastAPI lifespan with the worker task; log errors but keep the scheduler alive.
- [ ] Add the protected endpoint using the existing `_authorize`/secret and Cloudflare checks, call the service in a thread, and map expected refresh failure to HTTP 502.
- [ ] Re-run focused tests; expect pass.
- [ ] Commit: `git commit -m "feat(gold): add scheduled and manual price refresh"`.

### Task 4: Add Android manual refresh action

**Files:**
- Modify: `personal_finance/android/app/src/main/java/vn/id/xpbach/banklistener/net/Dtos.kt`
- Modify: `personal_finance/android/app/src/main/java/vn/id/xpbach/banklistener/net/WebhookClient.kt`
- Modify: `personal_finance/android/app/src/main/java/vn/id/xpbach/banklistener/ui/AppUi.kt`
- Test: `personal_finance/android/app/src/test/java/vn/id/xpbach/banklistener/net/WebhookClientTest.kt`

**Interfaces:**
- Add serializable `GoldRefreshBody(provider, sell_price_per_chi, fetched_at, updated_account_ids)`.
- Add sealed `GoldRefreshResult` with `Success(body)`, `Retryable`, and `NonRetryable(code)`.
- Add `WebhookClient.refreshGoldPrice(): GoldRefreshResult` that POSTs `/gold/refresh` with existing authentication headers.

- [ ] Write failing OkHttp MockWebServer tests verifying POST path, secret header, successful response parsing, and 401 mapping.
- [ ] Run `cd personal_finance/android && ./gradlew :app:testDebugUnitTest --tests '*WebhookClientTest'`; expect failure.
- [ ] Implement DTO/result/client method using the existing longer-lived client only if the 20-second default is insufficient; otherwise preserve normal timeout behavior.
- [ ] Add a Compose `Refresh gold price` button beside listener actions. During request disable the button, then show provider, formatted VND/chỉ price, and fetch time in a snackbar; show a safe retry/auth error otherwise.
- [ ] Re-run Android focused tests; expect pass.
- [ ] Commit: `git commit -m "feat(android): add manual gold price refresh"`.

### Task 5: Remove Actual browser price fetching

**Files:**
- Modify: `actual-budget/packages/loot-core/src/server/accounts/app.ts`
- Modify: `actual-budget/packages/desktop-client/src/accounts/mutations.ts`
- Modify: `actual-budget/packages/desktop-client/src/components/accounts/GoldAccountPanel.tsx`
- Test: `actual-budget/packages/loot-core/src/server/accounts/app-bank-sync.test.ts`

**Interfaces:**
- Remove `gold-fetch-live-price` handler and browser URL candidate logic.
- Keep explicit manual `gold-update-price` metadata override and no-transaction behavior.

- [ ] Write a failing handler-registration test asserting `gold-fetch-live-price` is absent while `gold-update-price` persists price metadata without an additional transaction.
- [ ] Run the focused Vitest test; expect failure while the fetch handler remains registered.
- [ ] Delete IPC mutation, fetch button, logging, URL fallbacks, and handler. Update UI copy so the displayed current price is read-only synced metadata with the existing explicit manual override if retained.
- [ ] Run targeted Actual tests and browser build; expect pass.
- [ ] Commit: `git commit -m "refactor(gold): remove browser price fetch"`.

### Task 6: End-to-end verification

- [ ] Run `cd personal_finance && .venv/bin/python -m pytest -q`.
- [ ] Run `cd personal_finance/android && ./gradlew :app:testDebugUnitTest`.
- [ ] Run Actual Gold-targeted Vitest tests and `packages/desktop-client` browser build.
- [ ] Check both repositories with `git diff --check` and `git status --short`; ensure only intended changes exist.
