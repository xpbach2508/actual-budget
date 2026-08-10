# Fork Migration Reconciliation Design

## Goal

Allow budgets created by the prior fork to load after upstream is merged, without weakening migration validation for unknown database histories.

## Problem

The fork previously shipped migrations `1800000000000` through `1800000000007`. Upstream later shipped `1783004650757_schedule_sort_order.sql`. Because Actual validates the applied migration IDs as a strictly ordered sequence, a prior-fork database has the later fork IDs but not the earlier upstream ID and is rejected before pending migrations can run.

## Design

Extend the existing pre-validation compatibility repair step in `packages/loot-core/src/server/migrate/migrations.ts`.

When a database has the known fork migration history and is missing migration `1783004650757`:

1. Inspect the `schedules` table for the `sort_order` column.
2. Add `sort_order REAL DEFAULT 0` only when absent.
3. Insert `1783004650757` into `__migrations__` only when absent.
4. Continue normal ordered migration validation and pending-migration execution.

The repair is idempotent, so retrying a failed load cannot duplicate the column or migration record.

## Safety Boundary

The repair applies only to the known prior-fork signature: the fork-specific migration IDs are present and the upstream schedule-sort-order ID is absent. Other migration mismatches remain errors. The repair does not alter financial records; it only reconciles database schema metadata and the required empty/defaulted schema column.

## Testing

Add a regression test using an in-memory database with the prior fork migration sequence and a `schedules` table without `sort_order`. Verify migration succeeds, adds the column, records `1783004650757`, and remains successful on a second run. Retain the existing test that rejects unknown out-of-sync migration sequences.
