import * as sqlite from '../sqlite';

export default async function run(db) {
  const columns = sqlite.runQuery(
    db,
    'PRAGMA table_info(accounts)',
    [],
    true,
  );
  const hasColumn = columns.some(c => c.name === 'exclude_from_totals');
  if (!hasColumn) {
    sqlite.runQuery(
      db,
      'ALTER TABLE accounts ADD COLUMN exclude_from_totals INTEGER DEFAULT 0',
    );
  }
}
