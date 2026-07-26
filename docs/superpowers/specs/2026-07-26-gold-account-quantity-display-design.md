# Gold Account Quantity Display Design

## Goal
Display total Gold quantity in chỉ instead of a VND balance wherever the account's primary balance is shown.

## Behavior
- Applies only to accounts with `account_subtype === 'gold'`.
- Query active `gold_lots` for the account and sum `quantity_chi`.
- Format as a Vietnamese decimal followed by `chỉ`, for example `8.5 chỉ`.
- Non-Gold accounts retain their existing currency-balance display.
- The Gold panel continues to show current value and unrealized gain/loss separately; this change does not alter transactions or valuation.

## Tests
- Gold account display renders summed quantity with `chỉ`.
- Standard account display remains currency-based.
