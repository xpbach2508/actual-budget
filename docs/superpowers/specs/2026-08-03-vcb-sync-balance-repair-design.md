# VCB Sync Balance Repair Design

## Goal
Remote bank imports must immediately refresh the affected Actual account balance and must never be marked reconciled. The VCB ledger must contain one auditable baseline reconciliation correction rather than stale compensating adjustments.

## Cause
Remote CRDT transaction messages refresh the list, but the explicit post-sync spreadsheet recomputation refreshes only global aggregate cells. Per-account balance bindings (`balance-<account-id>`) can remain stale. The webhook importer sets `cleared=False` but does not explicitly reset a matched record's `reconciled` flag.

## Design
When a sync batch changes transactions, derive the affected account ids from both the pre-sync and post-sync transaction records. Recompute each existing `balance-<account-id>` spreadsheet cell, alongside existing global aggregate recomputations. This is local-client derived state only; no transaction data is altered.

After each `reconcile_transaction` call, set the returned transaction's `reconciled` property to `False` before committing. This preserves the documented workflow: bank imports are un-cleared and available for user review.

For VCB, preserve a JSON backup outside both repositories. Replace the two existing synthetic reconciliation rows (`+270,991` and `-50,000`) with a single dated baseline adjustment of `+200,991` VND. This is the exact net adjustment needed for the all-transaction total to equal the latest VCB notification balance of `1,150,473` VND. It does not invent a bank transaction; it explicitly represents the unresolved historical opening discrepancy.

## Verification
- Sync unit test proves an applied remote transaction recomputes its account balance cell.
- Bank sink test proves the reconciled flag is reset before commit.
- Relevant unit tests and browser build pass.
- Local service rebuild retains named `/data` volume.
- Post-repair ledger total equals 1,150,473 VND, the 3 Aug debit is unreconciled, and exactly one VCB reconciliation adjustment remains.
