export default async function run(db) {
  const columns = db.runQuery('PRAGMA table_info(accounts)', [], true);
  const hasColumn = columns.some(c => c.name === 'exclude_from_totals');
  if (!hasColumn) {
    db.runQuery(
      'ALTER TABLE accounts ADD COLUMN exclude_from_totals INTEGER DEFAULT 0',
    );
  }
}
