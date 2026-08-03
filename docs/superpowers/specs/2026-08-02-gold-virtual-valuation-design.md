# Gold Virtual Valuation Design

## Goal
Include current gold market value in Off-Budget totals and current Net Worth without creating gold revaluation transactions.

## Constraints
- Gold purchases and manual additions remain the only gold-account ledger transactions.
- The latest gold price remains stored in `accounts.gold_current_price_per_chi`.
- No synthetic price-adjustment transaction is created or retained.
- Historical Net Worth stays ledger-based; only the current/latest point receives virtual market valuation.

## Architecture

### Gold valuation
For every open, non-excluded Gold account, calculate:

```text
virtual adjustment = (sum of active gold_lots.quantity_chi × gold_current_price_per_chi) − ledger balance
```

If no current price is set, the virtual adjustment is zero. Active lots exclude `tombstone = true`.

This adjustment is presentation-only. It is not written to `transactions`, does not affect budget categories, and does not sync as a ledger mutation.

### Sidebar totals
Create a reusable client-side gold-valuation hook/helper that reads active gold lots, combines them with loaded account metadata and ledger balances, and exposes the aggregate virtual adjustment.

- The Off-Budget summary displays normal Off-Budget ledger balance plus the aggregate virtual adjustment for eligible Gold accounts.
- Individual Gold account rows display market value in VND alongside quantity, rather than substituting a synthetic transaction balance.
- Excluded and closed accounts do not contribute.

### Net Worth
The Net Worth report obtains the current virtual adjustment and adds it to the final/current total only. Historical graph points and period-change values remain derived solely from ledger transactions because no historical price snapshot is available. The UI must not imply that old points were valued at today’s price.

## Error handling
- No latest price means gold keeps its ledger value.
- Empty or unavailable lot data produces zero virtual adjustment.
- Tombstoned lots and closed/excluded accounts are ignored.

## Tests
- Unit-test virtual adjustment calculation for active lots, no price, tombstoned lots, excluded accounts, and ledger-balance offsets.
- Component tests cover adjusted Off-Budget summary and latest Net Worth total.
- Existing gold transaction and summary tests remain green.
