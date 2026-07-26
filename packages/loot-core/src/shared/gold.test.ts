import { describe, expect, it } from 'vitest';

import { calculateGoldSummary, normalizeGoldQuantity } from './gold';

describe('gold calculations', () => {
  it('normalizes cây to chỉ', () => {
    expect(normalizeGoldQuantity(2, 'cay')).toBe(20);
  });

  it('calculates cost basis, current value, and gain/loss', () => {
    expect(
      calculateGoldSummary(
        [{ quantity_chi: 3, cost_per_chi: 7_000_000 }],
        8_000_000,
      ),
    ).toEqual({
      quantityChi: 3,
      costBasis: 21_000_000,
      currentValue: 24_000_000,
      gainLoss: 3_000_000,
    });
  });
});
