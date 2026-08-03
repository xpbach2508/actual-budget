import { describe, expect, it } from 'vitest';

import { calculateGoldVirtualAdjustment } from './gold-valuation';

describe('calculateGoldVirtualAdjustment', () => {
  it('replaces an eligible gold account ledger balance with market value', () => {
    expect(
      calculateGoldVirtualAdjustment(
        [
          {
            id: 'gold',
            account_subtype: 'gold',
            closed: 0,
            exclude_from_totals: 0,
            gold_current_price_per_chi: 8_000_000,
          },
        ],
        [
          { account_id: 'gold', quantity_chi: 2, tombstone: false },
          { account_id: 'gold', quantity_chi: 1, tombstone: true },
        ],
        new Map([['gold', 14_000_000]]),
      ),
    ).toBe(2_000_000);
  });

  it.each([
    { account_subtype: null },
    { closed: 1 },
    { exclude_from_totals: 1 },
    { gold_current_price_per_chi: null },
  ])('ignores ineligible accounts: %o', overrides => {
    expect(
      calculateGoldVirtualAdjustment(
        [
          {
            id: 'gold',
            account_subtype: 'gold',
            closed: 0,
            exclude_from_totals: 0,
            gold_current_price_per_chi: 8_000_000,
            ...overrides,
          },
        ],
        [{ account_id: 'gold', quantity_chi: 2, tombstone: false }],
        new Map([['gold', 14_000_000]]),
      ),
    ).toBe(0);
  });
});
