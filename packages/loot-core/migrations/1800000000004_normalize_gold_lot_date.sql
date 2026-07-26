CREATE TABLE gold_lots_date_repair (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  date INTEGER,
  quantity_chi REAL,
  cost_per_chi INTEGER,
  transfer_id TEXT DEFAULT NULL,
  tombstone INTEGER NOT NULL DEFAULT 0
);

INSERT INTO gold_lots_date_repair (
  id, account_id, date, quantity_chi, cost_per_chi, transfer_id, tombstone
)
SELECT id, account_id, CAST(date AS INTEGER), quantity_chi, cost_per_chi, transfer_id, tombstone
FROM gold_lots;

DROP TABLE gold_lots;
ALTER TABLE gold_lots_date_repair RENAME TO gold_lots;
CREATE INDEX gold_lots_account_id ON gold_lots(account_id, tombstone);
