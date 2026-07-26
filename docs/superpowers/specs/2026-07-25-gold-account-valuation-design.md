# Gold Account Lots and Valuation Design

## Goal

Track physical gold held in an off-budget account as individual purchase lots. Support purchases funded by real account transfers or manual additions, show current VND value and unrealized gain/loss from a manually entered price, and preserve the existing budget model.

## Scope

This applies only to off-budget accounts with `account_subtype = 'gold'`.

Included:

- gold purchase lots in `chỉ` or `cây`, with `chỉ` as the default;
- true VND transfers from a source account when buying gold;
- manual gold additions with a VND cost basis adjustment;
- manual current price updates and unrealized gain/loss.

Excluded:

- selling gold and realized gain/loss;
- automatic external price retrieval;
- commodity support for non-gold asset types.

## Data Model

Create a synced `gold_lots` table with:

- `id` — unique lot identifier;
- `account_id` — required reference to the gold account;
- `date` — purchase or manual-addition date;
- `quantity_chi` — non-negative quantity normalized to chỉ;
- `cost_per_chi` — non-negative VND cost basis per chỉ;
- `transfer_id` — nullable identifier of the linked Actual transfer for purchases funded from another account;
- `tombstone` — standard synced-record deletion field.

Add nullable field `gold_current_price_per_chi` to `accounts`. It is valid only for a gold account and is a non-negative VND price.

Quantity entered as `cây` is normalized before persistence: `1 cây = 10 chỉ`. Cost basis is `quantity_chi * cost_per_chi`. Account-level totals are derived from non-tombstoned lots:

- total quantity = sum of `quantity_chi`;
- total cost basis = sum of `quantity_chi * cost_per_chi`;
- current value = total quantity * `gold_current_price_per_chi`;
- unrealized gain/loss = current value − total cost basis.

## Purchase Flow

The Gold account page exposes **Mua vàng**. The form collects source account, date, quantity, unit, and total VND purchase amount. It derives `cost_per_chi` from normalized quantity and total amount.

Submitting performs one atomic logical action:

1. create a true Actual transfer: source-account transaction `-total VND` and Gold-account transaction `+total VND`, linked by the standard transfer identifier and without a category;
2. create a `gold_lots` record linked to that transfer;
3. if a manual current price already exists, create a no-category Gold-account revaluation adjustment equal to current value minus resulting account balance.

The transfer does not affect budget categories or budget spending.

## Manual Addition Flow

The Gold account page exposes **Thêm vàng thủ công**. It collects date, quantity, unit, and total VND cost basis, then derives `cost_per_chi`.

It creates a lot with no transfer identifier and a positive no-category adjustment in the Gold account equal to the cost basis. No other account is modified. If a current price exists, it then revalues the account as in the purchase flow.

## Valuation and Gain/Loss

The Gold account page exposes **Cập nhật giá vàng** for a manually entered VND/chỉ price. The update stores `gold_current_price_per_chi`, calculates current value, and creates a no-category revaluation adjustment in the Gold account for the difference from the account’s current monetary balance.

Thus the existing Account sidebar and total-balance paths show current VND value, while the Gold account summary shows total quantity, total cost basis, current value, and signed unrealized gain/loss. Revaluation never creates a budget category transaction or affects budget spending.

## Validation and Error Handling

- Quantity must be finite and greater than zero.
- Total purchase cost and current price must be finite and greater than or equal to zero.
- Unit is restricted to `chi` or `cay`; the UI defaults to `chi`.
- A transfer-funded purchase requires a source account distinct from the Gold account.
- A source-account transfer failure prevents lot creation; a lot is never persisted without its required transfer.
- Manual additions never require a source account.

## User Interface

The local-account creation modal continues to select `gold` as an off-budget subtype and creates an empty Gold account. It does not collect an initial balance; users add holdings through the Gold account page.

Gold account pages show three focused actions: **Mua vàng**, **Thêm vàng thủ công**, and **Cập nhật giá vàng**. They also show the calculated summary and a list of current purchase lots. Non-gold accounts retain all existing UI and behavior.

## Tests

1. Calculation tests cover chỉ/cây normalization, aggregate quantity, cost basis, current value, and signed gain/loss.
2. Database and query tests cover gold-lot persistence, account references, tombstones, and current-price metadata.
3. Purchase tests verify a category-free linked transfer and its linked lot; source and gold account balances move by the purchase total.
4. Manual-addition tests verify a lot plus only a positive Gold-account adjustment.
5. Price-update tests verify current-value adjustment, gain/loss display, and no category on adjustment transactions.
6. UI tests verify Gold-only actions, default unit, validation, and that normal accounts are unchanged.

## Compatibility

Existing accounts and all non-gold accounts receive nullable new fields or no gold-lot records and retain current behavior. Existing account balance and reporting paths remain monetary because Gold account balance is maintained through transfer, manual-addition, and revaluation transactions.
