# Gold Account Valuation Design

## Goal

Allow off-budget accounts with subtype `gold` to track physical gold in Vietnamese units, calculate current VND value, and show unrealized gain or loss from manually entered prices.

## Scope

This applies only to off-budget accounts whose `account_subtype` is `gold`. It does not add a currency, external price feed, transaction commodity support, or changes to any other account subtype.

## Data Model

Add nullable fields to `accounts`:

- `gold_quantity` — non-negative physical quantity entered by the user.
- `gold_unit` — `chi` or `cay`; default `chi` when a new gold account is created.
- `gold_cost_per_chi` — non-negative VND cost basis per chỉ.
- `gold_current_price_per_chi` — non-negative VND current market price per chỉ.

The calculation normalizes quantity to chỉ:

- `chi`: quantity in chỉ equals `gold_quantity`.
- `cay`: quantity in chỉ equals `gold_quantity * 10`.

Derived VND amounts are:

- cost basis = normalized quantity × `gold_cost_per_chi`;
- current value = normalized quantity × `gold_current_price_per_chi`;
- unrealized gain/loss = current value − cost basis.

`balance` is set to the current VND value at account creation so existing Actual account-balance and report paths keep their monetary contract. Updating the current gold price or quantity updates `balance` to the newly derived current value.

## User Interface

When the user selects off-budget subtype `gold` in the local-account creation modal, replace the generic Balance input with:

1. Quantity;
2. Unit selector with `Chỉ` selected by default and `Cây` available;
3. Cost basis per chỉ (VND);
4. Current market price per chỉ (VND).

Non-gold accounts retain the existing Balance input without changes. Gold-account fields accept decimal quantity and non-negative VND prices. A zero price is valid to represent an asset not yet valued.

In the account sidebar, a gold account continues to use the gold icon and its existing monetary balance display, which now represents current VND value. The account page adds a compact gold summary with normalized quantity, cost basis, current value, and signed gain/loss.

## Updates and Compatibility

Account-create and account-update payloads carry the four optional gold fields. Server-side account persistence accepts the fields only as account metadata and keeps normal account behavior intact. Existing accounts receive null values from the migration and render exactly as before.

Changing a gold account’s quantity, unit, or current price recomputes and persists balance. Changing cost basis affects only the gain/loss calculation.

## Validation and Error Handling

- Quantity and both prices must parse as finite numbers greater than or equal to zero.
- Unit must be either `chi` or `cay`.
- A gold payload with invalid values is rejected before mutation dispatch.
- The generic Balance field is never submitted for a gold account; its derived current VND value is submitted instead.

## Tests

1. Pure calculation tests cover chỉ, cây, zero valuation, current value, and signed gain/loss.
2. Creation-modal tests verify default `Chỉ`, gold-only inputs, derived balance payload, and that normal accounts retain Balance.
3. Mutation tests verify derived balance is sent with the gold metadata.
4. Account-summary tests verify quantity, VND values, and positive/negative gain-loss display.

## Non-goals

- Automatic gold price retrieval.
- Gold purchase/sale transaction workflow.
- Historical price tracking or realized gains.
- Commodity support for other asset types.
