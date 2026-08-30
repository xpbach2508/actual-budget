import { describe, expect, it } from 'vitest';

import {
  getGoldLedgerBalances,
  goldVirtualAdjustmentOrZero,
  shouldApplyGoldVirtualAdjustment,
} from './useGoldVirtualAdjustment';

const goldAccount = {
  id: 'gold',
  account_subtype: 'gold' as const,
  closed: 0,
  exclude_from_totals: 0,
  gold_current_price_per_chi: 800_000_000,
};

describe('shouldApplyGoldVirtualAdjustment', () => {
  it.each([
    [undefined, true],
    ['all', true],
    ['offbudget', true],
    ['onbudget', false],
    ['closed', false],
    ['gold-account', false],
  ] as const)('view %s -> %s', (view, expected) => {
    expect(shouldApplyGoldVirtualAdjustment(view)).toBe(expected);
  });
});

describe('getGoldLedgerBalances', () => {
  it('sums ledger transactions by gold account', () => {
    expect(
      getGoldLedgerBalances([
        { account: 'gold-a', amount: 8_000_000 },
        { account: 'gold-a', amount: 6_000_000 },
        { account: 'gold-b', amount: 20_000_000 },
      ]),
    ).toEqual(
      new Map([
        ['gold-a', 14_000_000],
        ['gold-b', 20_000_000],
      ]),
    );
  });
});

describe('goldVirtualAdjustmentOrZero', () => {
  const lots = [{ account_id: 'gold', quantity_chi: 2, tombstone: false }];
  const transactions = [{ account: 'gold', amount: 1_400_000_000 }];

  it('returns 0 until both lots and transactions have loaded', () => {
    expect(
      goldVirtualAdjustmentOrZero({
        accounts: [goldAccount],
        lots: null,
        transactions,
        preferences: [],
      }),
    ).toBe(0);
    expect(
      goldVirtualAdjustmentOrZero({
        accounts: [goldAccount],
        lots,
        transactions: null,
        preferences: [],
      }),
    ).toBe(0);
  });

  it('treats price as 0 until preferences have loaded', () => {
    expect(
      goldVirtualAdjustmentOrZero({
        accounts: [goldAccount],
        lots,
        transactions,
        preferences: null,
      }),
    ).toBe(0);
  });

  it('computes the mark-to-market adjustment once lots and ledger are loaded', () => {
    expect(
      goldVirtualAdjustmentOrZero({
        accounts: [goldAccount],
        lots,
        transactions,
        preferences: [],
      }),
    ).toBe(200_000_000);
  });
});
