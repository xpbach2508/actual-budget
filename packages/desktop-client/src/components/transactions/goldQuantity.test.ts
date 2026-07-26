import { describe, expect, test } from 'vitest';

import {
  formatGoldQuantity,
  getGoldQuantityByTransaction,
} from './goldQuantity';

describe('getGoldQuantityByTransaction', () => {
  test('keeps only active lots linked to transactions', () => {
    expect(
      getGoldQuantityByTransaction([
        { transfer_id: 'purchase', quantity_chi: 1.5, tombstone: false },
        { transfer_id: 'deleted', quantity_chi: 2, tombstone: true },
        { transfer_id: null, quantity_chi: 3, tombstone: 0 },
      ]),
    ).toEqual(new Map([['purchase', 1.5]]));
  });
});

describe('formatGoldQuantity', () => {
  test('formats Vietnamese chi quantities and empty values', () => {
    expect(formatGoldQuantity(1.5)).toBe('1,5 chỉ');
    expect(formatGoldQuantity(undefined)).toBe('');
  });
});
