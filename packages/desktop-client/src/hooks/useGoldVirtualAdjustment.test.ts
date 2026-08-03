import { describe, expect, it } from 'vitest';

import { getGoldLedgerBalances } from './useGoldVirtualAdjustment';

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
