# Gold Transaction Quantity Column Design

## Goal
Show the quantity of gold in the standard transaction list when viewing a Gold account.

## Scope
- Add a read-only `Số chỉ` column next to the amount column only for accounts whose subtype is `gold`.
- Show a formatted `x chỉ` value for transactions linked to a gold lot.
- Leave the cell blank for transactions without a linked lot, including price/revaluation entries.
- Do not change the transaction list for non-Gold accounts.

## Data linkage
`gold_lots.transfer_id` is the transaction identifier used by the transaction list.

- Gold purchases already retain the transfer transaction ID in the lot.
- Manual additions must retain the newly created Gold-account transaction ID in the same field.
- The client queries the active Gold account's lots and creates a transaction-ID-to-quantity map.

## UI behavior
When the selected account is Gold:
1. Load non-tombstoned lots for that account.
2. Render the `Số chỉ` column beside `Số tiền`.
3. Render `quantity_chi` as a Vietnamese decimal followed by `chỉ` when a map entry exists.
4. Render an empty cell if no associated lot exists.

The column is display-only: it cannot be edited in the generic transaction table.

## Testing
- Unit test the lot-to-transaction quantity mapping and formatting.
- Transaction-table test verifies that the column appears for a Gold account and is absent otherwise.
- Verify a linked purchase/manual-add row displays its quantity and an unlinked row displays an empty value.
