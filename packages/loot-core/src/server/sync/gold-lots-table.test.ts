import { Timestamp } from '@actual-app/crdt';

import * as db from '#server/db';

import { applyMessages, setSyncingMode } from './index';

beforeEach(() => {
  setSyncingMode('enabled');
  return global.emptyDatabase()();
});

afterEach(() => {
  global.resetTime();
  setSyncingMode('disabled');
});

describe('ensureGoldLotsTable', () => {
  it('converts hyphenated lot dates to YYYYMMDD instead of truncating to the year', async () => {
    db.execQuery(`
      DROP TABLE IF EXISTS gold_lots;
      CREATE TABLE gold_lots (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        date TEXT,
        quantity_chi REAL,
        cost_per_chi INTEGER,
        transfer_id TEXT DEFAULT NULL,
        tombstone INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO gold_lots (id, account_id, date, quantity_chi, cost_per_chi, transfer_id, tombstone)
      VALUES ('lot1', 'gold', '2026-07-26', 1, 700000000, NULL, 0);
    `);

    await applyMessages([
      {
        dataset: 'gold_lots',
        row: 'lot1',
        column: 'quantity_chi',
        value: 1,
        timestamp: Timestamp.send(),
      },
    ]);

    const lot = await db.first<{ date: number }>(
      'SELECT date FROM gold_lots WHERE id = ?',
      ['lot1'],
    );
    expect(lot?.date).toBe(20260726);
  });

  it('drops a leftover gold_lots_sync_repair table before rebuilding', async () => {
    db.execQuery(`
      CREATE TABLE gold_lots_sync_repair (
        id TEXT PRIMARY KEY
      );
    `);

    await applyMessages([
      {
        dataset: 'gold_lots',
        row: 'lot-repair',
        column: 'quantity_chi',
        value: 1,
        timestamp: Timestamp.send(),
      },
    ]);
  });
});
