// @ts-strict-ignore
import { expectSnapshotWithDiffer } from '#mocks/util';
import * as db from '#server/db';

import * as transfer from './transfer';

beforeEach(global.emptyDatabase());

function getAllTransactions() {
  return db.all<db.DbViewTransaction & { payee_name: db.DbPayee['name'] }>(
    `SELECT t.*, p.name as payee_name
       FROM v_transactions t
       LEFT JOIN payees p ON p.id = t.payee
       ORDER BY date DESC, amount DESC, id
     `,
  );
}

async function prepareDatabase() {
  await db.insertCategoryGroup({ id: 'group1', name: 'group1', is_income: 0 });
  await db.insertCategory({
    id: '1',
    name: 'cat1',
    cat_group: 'group1',
    is_income: 0,
  });
  await db.insertAccount({ id: 'one', name: 'one' });
  await db.insertAccount({ id: 'two', name: 'two' });
  await db.insertAccount({ id: 'three', name: 'three', offbudget: 1 });
  await db.insertPayee({ name: '', transfer_acct: 'one' });
  await db.insertPayee({ name: '', transfer_acct: 'two' });
  await db.insertPayee({
    name: '',
    transfer_acct: 'three',
  });
}

type Transaction = {
  account: string;
  amount: number;
  category?: string;
  date: string;
  id?: string;
  notes?: string;
  payee: string;
  transfer_id?: string;
  is_parent?: boolean;
  is_child?: boolean;
  parent_id?: string;
};

describe('Transfer', () => {
  test('transfers are properly inserted/updated/deleted', async () => {
    await prepareDatabase();

    let transaction: Transaction = {
      account: 'one',
      amount: 5000,
      payee: await db.insertPayee({ name: 'Non-transfer' }),
      date: '2017-01-01',
    };
    await db.insertTransaction(transaction);
    await transfer.onInsert(transaction);

    const differ = expectSnapshotWithDiffer(await getAllTransactions());

    const transferTwo = await db.first<db.DbPayee>(
      "SELECT * FROM payees WHERE transfer_acct = 'two'",
    );
    const transferThree = await db.first<db.DbPayee>(
      "SELECT * FROM payees WHERE transfer_acct = 'three'",
    );

    transaction = {
      account: 'one',
      amount: 5000,
      payee: transferTwo.id,
      date: '2017-01-01',
    };
    transaction.id = await db.insertTransaction(transaction);
    await transfer.onInsert(transaction);
    differ.expectToMatchDiff(await getAllTransactions());

    // Fill the transaction out
    transaction = await db.getTransaction(transaction.id);
    expect(transaction.transfer_id).toBeDefined();

    transaction = {
      ...transaction,
      date: '2017-01-05',
      notes: 'This is a note',
    };
    await db.updateTransaction(transaction);
    await transfer.onUpdate(transaction);
    differ.expectToMatchDiff(await getAllTransactions());

    transaction = {
      ...transaction,
      payee: transferThree.id,
    };
    await db.updateTransaction(transaction);
    await transfer.onUpdate(transaction);
    differ.expectToMatchDiff(await getAllTransactions());

    transaction = {
      ...transaction,
      payee: await db.insertPayee({ name: 'Not transferred anymore' }),
    };
    await db.updateTransaction(transaction);
    await transfer.onUpdate(transaction);
    differ.expectToMatchDiff(await getAllTransactions());

    // Make sure it's not a linked transaction anymore
    transaction = await db.getTransaction(transaction.id);
    expect(transaction.transfer_id).toBeNull();

    // Re-transfer it
    transaction = {
      ...transaction,
      payee: transferTwo.id,
    };
    await db.updateTransaction(transaction);
    await transfer.onUpdate(transaction);
    differ.expectToMatchDiff(await getAllTransactions());

    transaction = await db.getTransaction(transaction.id);
    expect(transaction.transfer_id).toBeDefined();

    await db.deleteTransaction(transaction);
    await transfer.onDelete(transaction);
    differ.expectToMatchDiff(await getAllTransactions());
  });

  test('transfers are properly de-categorized', async () => {
    await prepareDatabase();

    const transferTwo = await db.first<db.DbPayee>(
      "SELECT * FROM payees WHERE transfer_acct = 'two'",
    );
    const transferThree = await db.first<db.DbPayee>(
      "SELECT * FROM payees WHERE transfer_acct = 'three'",
    );

    let transaction: Transaction = {
      account: 'one',
      amount: 5000,
      payee: await db.insertPayee({ name: 'Non-transfer' }),
      date: '2017-01-01',
      category: '1',
    };
    transaction.id = await db.insertTransaction(transaction);
    await transfer.onInsert(transaction);

    const differ = expectSnapshotWithDiffer(await getAllTransactions());

    transaction = {
      ...(await db.getTransaction(transaction.id)),
      payee: transferThree.id,
      notes: 'hi',
    };
    await db.updateTransaction(transaction);
    await transfer.onUpdate(transaction);
    differ.expectToMatchDiff(await getAllTransactions());

    transaction = {
      ...(await db.getTransaction(transaction.id)),
      payee: transferTwo.id,
    };
    await db.updateTransaction(transaction);
    await transfer.onUpdate(transaction);
    differ.expectToMatchDiff(await getAllTransactions());
  });

  test('split transfers are retained on child transactions', async () => {
    // test: first add a txn having a transfer acct payee
    // then mark it as `is_parent` and add a child txn
    // the child txn should have a different transfer acct payee
    // and `is_child` set to true
    await prepareDatabase();

    const [transferOne, transferTwo] = await Promise.all([
      db.first<db.DbPayee>("SELECT * FROM payees WHERE transfer_acct = 'one'"),
      db.first<db.DbPayee>("SELECT * FROM payees WHERE transfer_acct = 'two'"),
    ]);

    let parent: Transaction = {
      account: 'one',
      amount: 5000,
      payee: transferTwo.id,
      date: '2017-01-01',
    };
    parent.id = await db.insertTransaction(parent);
    await transfer.onInsert(parent);
    parent = await db.getTransaction(parent.id);

    const differ = expectSnapshotWithDiffer(await getAllTransactions());

    // mark the txn as parent
    await db.updateTransaction({ id: parent.id, is_parent: true });
    await transfer.onUpdate(parent);
    differ.expectToMatchDiff(await getAllTransactions());

    // add a child txn
    let child: Transaction = {
      account: 'one',
      amount: 2000,
      payee: transferOne.id,
      date: '2017-01-01',
      is_child: true,
      parent_id: parent.id,
    };
    child.id = await db.insertTransaction(child);
    await transfer.onInsert(child);
    differ.expectToMatchDiff(await getAllTransactions());

    // ensure that the child txn has the correct transfer acct payee
    child = await db.getTransaction(child.id);
    expect(child.transfer_id).not.toBe(parent.transfer_id);
    expect(child.payee).toBe(transferOne.id);
  });

  test('copies cleared from the source transaction onto the counterpart', async () => {
    await prepareDatabase();
    const transferTwo = await db.first<db.DbPayee>(
      "SELECT * FROM payees WHERE transfer_acct = 'two'",
    );

    const clearedId = await db.insertTransaction({
      account: 'one',
      amount: 5000,
      payee: transferTwo.id,
      date: '2017-01-01',
      cleared: true,
    });
    await transfer.onInsert(await db.getTransaction(clearedId));
    const linkedCleared = await db.getTransaction(clearedId);
    const clearedCounterpart = await db.getTransaction(
      linkedCleared.transfer_id,
    );
    expect(Boolean(clearedCounterpart.cleared)).toBe(true);

    const unclearedId = await db.insertTransaction({
      account: 'one',
      amount: 3000,
      payee: transferTwo.id,
      date: '2017-01-01',
      cleared: false,
    });
    await transfer.onInsert(await db.getTransaction(unclearedId));
    const linkedUncleared = await db.getTransaction(unclearedId);
    const unclearedCounterpart = await db.getTransaction(
      linkedUncleared.transfer_id,
    );
    expect(Boolean(unclearedCounterpart.cleared)).toBe(false);
  });

  test('tombstones gold lots linked to a deleted gold-side or source transfer', async () => {
    await prepareDatabase();
    const transferTwo = await db.first<db.DbPayee>(
      "SELECT * FROM payees WHERE transfer_acct = 'two'",
    );

    const sourceId = await db.insertTransaction({
      account: 'one',
      amount: -5000,
      payee: transferTwo.id,
      date: '2017-01-01',
      cleared: true,
    });
    const source = await db.getTransaction(sourceId);
    await transfer.onInsert(source);
    const linked = await db.getTransaction(sourceId);

    await db.insertWithSchema('gold_lots', {
      account_id: 'two',
      date: '2017-01-01',
      quantity_chi: 1,
      cost_per_chi: 5000,
      transfer_id: linked.transfer_id,
      tombstone: 0,
    });

    await transfer.onDelete(linked);

    const lot = await db.first<{ tombstone: number }>(
      'SELECT tombstone FROM gold_lots WHERE account_id = ?',
      ['two'],
    );
    expect(lot?.tombstone).toBe(1);
  });

  test('tombstones gold lots whose transfer_id is the deleted transaction id', async () => {
    await prepareDatabase();
    const transactionId = await db.insertTransaction({
      account: 'one',
      amount: 5000,
      date: '2017-01-01',
      cleared: true,
    });

    await db.insertWithSchema('gold_lots', {
      account_id: 'one',
      date: '2017-01-01',
      quantity_chi: 1.5,
      cost_per_chi: 5000,
      transfer_id: transactionId,
      tombstone: 0,
    });

    await transfer.onDelete({
      id: transactionId,
      account: 'one',
      amount: 5000,
      date: '2017-01-01',
    });

    const lot = await db.first<{ tombstone: number }>(
      'SELECT tombstone FROM gold_lots WHERE transfer_id = ?',
      [transactionId],
    );
    expect(lot?.tombstone).toBe(1);
  });
});
