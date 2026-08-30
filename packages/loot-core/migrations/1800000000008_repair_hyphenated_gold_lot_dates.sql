-- Repair hyphenated gold_lot dates (YYYY-MM-DD) to YYYYMMDD integers.
-- Already-YYYYMMDD integers are left alone.
-- Year-only integers (e.g. 2026 from CAST('2026-07-26' AS INTEGER)) cannot be recovered.

UPDATE gold_lots
SET date = CAST(replace(date, '-', '') AS INTEGER)
WHERE instr(CAST(date AS TEXT), '-') > 0;
