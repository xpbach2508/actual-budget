# Gold Data Integrity Fixes Design

## Goal
Correct gold lot date persistence, exclude tombstoned lots from summaries, prevent the scraper from presenting fabricated prices as live data, and remove the non-functional `/gold/revalue` API.

## Scope
This change spans the `actual-budget` TypeScript application and the `personal_finance` Python service. It does not add a replacement revaluation endpoint; Actual Budget's authenticated IPC mutation remains the sole revaluation path.

## Design

### 1. Gold lot dates
Actual stores date values as integer `YYYYMMDD`. The UI currently sends `YYYY-MM-DD` strings to the account handlers. Add a shared conversion at the handler boundary that validates the date and converts it to the integer representation before inserting `gold_lots`. Existing transaction dates continue using the existing transaction API behavior.

Add tests covering a normal ISO date and invalid input, ensuring the persisted lot receives an integer `YYYYMMDD` value.

### 2. Tombstone filtering
All UI queries used for gold quantity and P&L summaries will request only active lots (`tombstone = 0`). The shared summary calculation remains a pure arithmetic function. Add regression coverage for the query/filter behavior or summary input contract so deleted lots cannot affect displayed totals.

### 3. Gold price failure behavior
The scraper will continue trying its supported providers, but will no longer synthesize `7,800,000/7,900,000` values when providers fail or merely contain provider names. Provider parsing must produce actual extracted values. If no valid price is available, `fetch_latest_gold_prices` raises a clear error. The API should return an appropriate server error rather than a successful price response. Tests cover valid provider data and total provider failure.

### 4. Revaluation endpoint removal
Remove `/gold/revalue` from `personal_finance`. Remove its obsolete test. The Actual Budget `gold-update-price` mutation remains responsible for storing the price and creating the revaluation transaction, and the live-price endpoint remains read-only.

## Error handling
- Invalid gold dates fail before database mutation.
- Scraper failure is explicit and must not silently change an account valuation.
- The live-price UI mutation displays its existing error path when the read-only price endpoint fails.

## Verification
Run the full Python test suite from `personal_finance`, targeted Actual tests using the repository's configured Vitest environment, and available formatting/type/lint checks. Confirm no gold revaluation endpoint remains and inspect the final diffs in both repositories.
