import type { PayeeEntity, TransactionEntity } from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import {
  buildQuickAddTransaction,
  convertReviewTransactionToTransfer,
  transferPayeesForReview,
} from './reviewQueueUtils';

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

const checkingPayee: PayeeEntity = {
  id: 'payee-checking',
  name: 'Checking',
  transfer_acct: 'checking',
};
const goldPayee: PayeeEntity = {
  id: 'payee-gold',
  name: 'Gold',
  transfer_acct: 'gold',
};
const source: TransactionEntity = {
  id: 'src',
  account: 'checking',
  amount: -7_000_000,
  date: '2026-07-26',
  cleared: false,
};
const opposite: TransactionEntity = {
  id: 'opp',
  account: 'gold',
  amount: 7_000_000,
  date: '2026-07-26',
  cleared: false,
};

describe('transferPayeesForReview', () => {
  it('excludes the current account from transfer options', () => {
    expect(
      transferPayeesForReview([checkingPayee, goldPayee], 'checking'),
    ).toEqual([goldPayee]);
  });
});

describe('convertReviewTransactionToTransfer', () => {
  it('links an unmatched opposite uncleared transaction without inserting', () => {
    expect(
      convertReviewTransactionToTransfer({
        transaction: source,
        payeeId: goldPayee.id,
        payees: [checkingPayee, goldPayee],
        candidates: [opposite],
      }),
    ).toEqual({
      updated: [
        {
          id: 'src',
          category: null,
          payee: goldPayee.id,
          transfer_id: 'opp',
        },
        {
          id: 'opp',
          category: null,
          payee: checkingPayee.id,
          transfer_id: 'src',
        },
      ],
      runTransfers: false,
    });
  });

  it('falls back to a payee patch that may insert a counterpart', () => {
    expect(
      convertReviewTransactionToTransfer({
        transaction: source,
        payeeId: goldPayee.id,
        payees: [checkingPayee, goldPayee],
        candidates: [],
      }),
    ).toEqual({
      updated: [{ id: 'src', payee: goldPayee.id }],
    });
  });
});
