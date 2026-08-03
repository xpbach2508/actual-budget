# All Accounts total consistency

## Goal
Make the `/accounts` header total match the sidebar’s **All accounts** total.

## Cause
The sidebar query excludes accounts with `exclude_from_totals=true`; the `/accounts` root transaction query does not.

## Design
When rendering the unfiltered All Accounts view, add `account.exclude_from_totals=false` to its root transaction query. Account-specific, On budget, Off budget, and filtered views retain their existing query behavior.

## Safety
This is a display/query correction only. It does not mutate any production budget data.

## Verification
Add a regression test that an excluded account does not contribute to the All Accounts header balance; run the applicable desktop-client test suite.
