# Gold Price Synced Metadata Design

## Goal
Allow bank-webhook to update Gold market prices through Actual’s supported sync data without transactions or custom account-column writes.

## Data model
Each Gold account has a standard synced metadata/preference record keyed by account ID:

```text
gold-price:<account-id>
{
  "price_per_chi": 7900000,
  "provider": "SJC",
  "fetched_at": "2026-08-02T02:00:00Z"
}
```

Bank-webhook writes this standard supported metadata through actualpy and commits it as normal Actual sync data. It never writes `accounts.gold_current_price_per_chi` and never inserts a transaction.

## Refresh flow
- At 09:00 `Asia/Ho_Chi_Minh`, bank-webhook fetches and validates the SJC sell price, then writes metadata for every open Gold account.
- Android Bank Listener provides a manual refresh button that invokes the same authenticated webhook refresh operation and displays its result.
- A failed fetch or write preserves existing synced metadata and reports a safe error.

## Actual presentation
Actual resolves a Gold account price from synced metadata first, falling back to existing `gold_current_price_per_chi` only for legacy manual values. Gold panel, current Off-Budget virtual adjustment, and current Net Worth virtual adjustment use the resolved value. Historical Net Worth remains ledger-based.

## Security and verification
The Android-triggered webhook endpoint uses the existing shared-secret and optional Cloudflare Access checks. Tests cover metadata serialization/update, endpoint authentication, scheduler timing, Android request/result handling, metadata-first resolution, and absence of revaluation transactions.
