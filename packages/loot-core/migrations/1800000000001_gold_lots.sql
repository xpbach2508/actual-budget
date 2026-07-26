ALTER TABLE accounts ADD COLUMN gold_current_price_per_chi INTEGER DEFAULT NULL;

CREATE TABLE gold_lots (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  date TEXT NOT NULL,
  quantity_chi REAL NOT NULL,
  cost_per_chi INTEGER NOT NULL,
  transfer_id TEXT DEFAULT NULL,
  tombstone INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX gold_lots_account_id ON gold_lots(account_id, tombstone);
