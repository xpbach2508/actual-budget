// @ts-strict-ignore
import * as db from '#server/db';

import {
  getAppliedMigrations,
  getMigrationsDir,
  getMigrationList,
  getPending,
  migrate,
  withMigrationsDir,
} from './migrations';

beforeEach(global.emptyDatabase(true));

describe('Migrations', () => {
  test('gets the latest migrations', async () => {
    const applied = await getAppliedMigrations(db.getDatabase());
    const available = await getMigrationList(
      __dirname + '/../../mocks/migrations',
    );

    expect(applied.length).toBe(0);
    expect(available).toMatchSnapshot();
    expect(getPending(applied, available)).toMatchSnapshot();
  });

  test('applied migrations are returned in order', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        await migrate(db.getDatabase());

        const migrations = await getAppliedMigrations(db.getDatabase());
        const last = 0;
        for (const migration of migrations) {
          if (migration <= last) {
            throw new Error('Found older migration out of order');
          }
        }
      },
    );
  });

  test('repairs the known prior-fork history missing schedule sort order', async () => {
    const scheduleSortOrderMigration = 1783004650757;
    const migrationIds = (await getMigrationList(getMigrationsDir()))
      .map(name => Number.parseInt(name, 10))
      .filter(id => id !== scheduleSortOrderMigration);

    db.runQuery(
      'CREATE TABLE schedules (id TEXT PRIMARY KEY, rule TEXT NOT NULL)',
    );
    for (const id of migrationIds) {
      db.runQuery('INSERT INTO __migrations__ (id) VALUES (?)', [id]);
    }

    await expect(migrate(db.getDatabase())).resolves.toBeUndefined();

    expect(
      await db.first<{ name: string }>(
        "SELECT name FROM pragma_table_info('schedules') WHERE name = 'sort_order'",
      ),
    ).toEqual({ name: 'sort_order' });
    expect(await getAppliedMigrations(db.getDatabase())).toContain(
      scheduleSortOrderMigration,
    );

    await expect(migrate(db.getDatabase())).resolves.toBeUndefined();
  });

  test('checks if there are unknown migrations', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        // Insert a random migration id
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (1000)');

        try {
          await migrate(db.getDatabase());
        } catch (e) {
          expect(e.message).toBe('out-of-sync-migrations');
          return;
        }
        expect('should never reach here').toBe(null);
      },
    );
  });

  test('app runs database migrations', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        let desc = await db.first<{ sql: string }>(
          "SELECT * FROM sqlite_master WHERE name = 'poop'",
        );
        expect(desc).toBe(null);

        await migrate(db.getDatabase());

        desc = await db.first<{ sql: string }>(
          "SELECT * FROM sqlite_master WHERE name = 'poop'",
        );
        expect(desc).toBeDefined();
        expect(desc.sql.indexOf('is_income')).toBe(-1);
        expect(desc.sql.indexOf('is_expense')).not.toBe(-1);
      },
    );
  });
});
