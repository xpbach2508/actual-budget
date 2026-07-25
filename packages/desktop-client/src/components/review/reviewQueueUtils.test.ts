import { describe, expect, it } from 'vitest';

import { buildQuickAddTransaction } from './reviewQueueUtils';

const input = {
  id: 'transaction-id',
  amount: -125000,
  account: 'account-id',
  date: '2026-07-25',
  payee: 'payee-id',
  category: 'category-id',
};

describe('buildQuickAddTransaction', () => {
  it('creates a cleared transaction without blank optional values', () => {
    expect(
      buildQuickAddTransaction({ ...input, payee: '', category: '' }),
    ).toEqual({
      transaction: {
        id: 'transaction-id',
        amount: -125000,
        account: 'account-id',
        date: '2026-07-25',
        cleared: true,
      },
    });
  });

  it.each([
    [{ ...input, amount: 0 }, 'amount'],
    [{ ...input, account: '' }, 'account'],
    [{ ...input, date: '' }, 'date'],
  ] as const)('reports a missing required field', (invalidInput, error) => {
    expect(buildQuickAddTransaction(invalidInput)).toEqual({ error });
  });
});
