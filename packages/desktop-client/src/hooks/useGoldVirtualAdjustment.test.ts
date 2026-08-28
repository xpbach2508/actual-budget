import { describe, expect, it } from 'vitest';

import {
  getGoldLedgerBalances,
  shouldApplyGoldVirtualAdjustment,
} from './useGoldVirtualAdjustment';

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
