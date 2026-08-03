# VCB Sync Balance Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make imported transactions refresh their affected account balance, remain unreconciled, and normalize the VCB reconciliation history.

**Architecture:** The Actual sync handler recomputes spreadsheet cells after receiving remote transaction messages. The webhook sink explicitly resets reconciliation state after upserting an import. A separate, backed-up local data migration consolidates only known synthetic VCB adjustments.

**Tech Stack:** TypeScript, Vitest, Python 3.11, actualpy, Docker Compose.

## Global Constraints
- Do not remove the Actual named `/data` volume.
- Back up production finance rows outside repositories before mutation.
- Import rows must be `cleared=false` and `reconciled=false`.
- Only local commits and local deployment are in scope.

---

### Task 1: Recompute per-account spreadsheet balances after remote sync

**Files:**
- Modify: `packages/loot-core/src/server/sync/index.ts`
- Test: existing sync test adjacent to the handler, or a new `packages/loot-core/src/server/sync/index.test.ts`

- [ ] Write a failing test that applies a remote transaction for account `a1` and asserts `sheet.recompute(resolveName('__global', 'balance-a1'))` is called.
- [ ] Run the targeted test and confirm it fails because only global aggregate cells are recomputed.
- [ ] Derive changed account ids from old/new transaction records and recompute each existing `balance-<id>` cell after `triggerDatabaseChanges`.
- [ ] Run the targeted test and the sync test suite.

### Task 2: Keep bank imports unreconciled

**Files:**
- Modify: `../personal_finance/src/bank_webhook/sink.py`
- Test: `../personal_finance/tests/test_bank_sink.py`

- [ ] Write a failing test whose `reconcile_transaction` return value starts `reconciled=True`, then assert it is `False` before commit.
- [ ] Run the focused pytest case and confirm it fails.
- [ ] Set `txn.reconciled = False` immediately after each upsert.
- [ ] Run the focused and full sink test files.

### Task 3: Deploy and normalize VCB data

**Files:**
- Create outside repositories: `/tmp/vcb-reconciliation-backup-2026-08-03.json`

- [ ] Export the two VCB reconciliation rows and current VCB total to the recovery JSON.
- [ ] Replace the two synthetic rows with one +200,991 VND baseline adjustment, preserving the current bank balance anchor.
- [ ] Re-query Actual and assert the total is 1,150,473 VND, the 3 Aug row is unreconciled, and one reconciliation adjustment remains.
- [ ] Rebuild `docker-compose.local.yml` and verify HTTP 200 from port 5006.
