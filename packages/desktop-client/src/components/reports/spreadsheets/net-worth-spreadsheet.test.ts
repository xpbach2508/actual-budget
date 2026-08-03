import { enUS } from 'date-fns/locale';
import { describe, expect, it } from 'vitest';

import { recalculate } from './net-worth-spreadsheet';

const format = (value: unknown) => String(value);
const data = [
  {
    id: 'gold',
    name: 'Gold',
    starting: 10_000_000,
    balances: {
      '2026-07': { date: '2026-07', amount: 1_000_000 },
      '2026-08': { date: '2026-08', amount: 1_000_000 },
    },
  },
];

describe('net worth virtual gold valuation', () => {
  it('adds virtual value only to the latest current point', () => {
    const result = recalculate(
      data,
      '2026-07-01',
      '2026-08-31',
      enUS,
      'Monthly',
      '0',
      format,
      2_000_000,
      true,
    );

    expect(result.graphData.data.map(point => point.y)).toEqual([
      11_000_000,
      14_000_000,
    ]);
    expect(result.netWorth).toBe(14_000_000);
  });

  it('leaves all points ledger-based for a historical report', () => {
    const result = recalculate(
      data,
      '2026-07-01',
      '2026-08-31',
      enUS,
      'Monthly',
      '0',
      format,
      2_000_000,
      false,
    );

    expect(result.graphData.data.map(point => point.y)).toEqual([
      11_000_000,
      12_000_000,
    ]);
    expect(result.netWorth).toBe(12_000_000);
  });
});
