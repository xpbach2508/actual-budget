import type { AccountEntity } from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import {
  computeAccountValuations,
  computeAssetAllocationSlices,
} from './useAssetAllocation';

const t = (key: string) => key;

describe('computeAccountValuations', () => {
  const bankAccount: AccountEntity = {
    id: 'bank-1',
    name: 'Vietcombank',
    offbudget: 0,
    closed: 0,
    sort_order: 1,
    last_reconciled: null,
    tombstone: 0,
    account_group_id: null,
    account_id: null,
    bank: null,
    bankName: null,
    bankId: null,
    mask: null,
    official_name: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null,
    last_sync: null,
    bank_sync_status: null,
  };

  const savingsAccount: AccountEntity = {
    ...bankAccount,
    id: 'savings-1',
    name: 'Sổ SCB 6 tháng',
    offbudget: 1,
    account_subtype: 'savings',
  };

  const goldAccount: AccountEntity = {
    ...bankAccount,
    id: 'gold-1',
    name: 'Vàng SJC',
    offbudget: 1,
    account_subtype: 'gold',
  };

  const creditCardAccount: AccountEntity = {
    ...bankAccount,
    id: 'cc-1',
    name: 'Thẻ tín dụng HSBC',
    offbudget: 0,
  };

  it('computes standard ledger balances correctly for cash and savings', () => {
    const valuations = computeAccountValuations({
      accounts: [bankAccount, savingsAccount],
      lots: [],
      transactions: [
        { account: 'bank-1', amount: 50_000_000_00 },
        { account: 'savings-1', amount: 200_000_000_00 },
      ],
      preferences: [],
      t,
    });

    expect(valuations).toHaveLength(2);
    expect(valuations[0].effectiveBalance).toBe(50_000_000_00);
    expect(valuations[0].subtype).toBe('cash');
    expect(valuations[1].effectiveBalance).toBe(200_000_000_00);
    expect(valuations[1].subtype).toBe('savings');
  });

  it('computes gold market valuation with lots and price metadata', () => {
    const valuations = computeAccountValuations({
      accounts: [goldAccount],
      lots: [
        { account_id: 'gold-1', quantity_chi: 10, tombstone: false },
        { account_id: 'gold-1', quantity_chi: 5, tombstone: true }, // tombstoned, should be ignored
      ],
      transactions: [{ account: 'gold-1', amount: 75_000_000_00 }], // cost was 75M
      preferences: [
        {
          id: 'gold-price:gold-1',
          value: JSON.stringify({
            price_per_chi: 8_500_000,
            provider: 'manual',
            fetched_at: new Date().toISOString(),
          }),
        },
      ],
      t,
    });

    expect(valuations).toHaveLength(1);
    // 10 chi * 8,500,000 = 85,000,000 VND -> in minor units: 85_000_000_00
    expect(valuations[0].effectiveBalance).toBe(85_000_000_00);
    expect(valuations[0].ledgerBalance).toBe(75_000_000_00);
    expect(valuations[0].virtualAdjustment).toBe(10_000_000_00);
    expect(valuations[0].subtype).toBe('gold');
  });

  it('computes slices and percentages correctly', () => {
    const valuations = computeAccountValuations({
      accounts: [bankAccount, savingsAccount, goldAccount],
      lots: [{ account_id: 'gold-1', quantity_chi: 10, tombstone: false }],
      transactions: [
        { account: 'bank-1', amount: 15_000_000_00 },
        { account: 'savings-1', amount: 50_000_000_00 },
        { account: 'gold-1', amount: 35_000_000_00 },
      ],
      preferences: [
        {
          id: 'gold-price:gold-1',
          value: JSON.stringify({
            price_per_chi: 3_500_000,
            provider: 'manual',
            fetched_at: new Date().toISOString(),
          }),
        },
      ],
      t,
    });

    const { slices, totalAssets } = computeAssetAllocationSlices({
      valuations,
      groupBy: 'subtype',
    });

    // Total: 15M (cash) + 50M (savings) + 35M (gold) = 100M in minor units
    expect(totalAssets).toBe(100_000_000_00);
    expect(slices).toHaveLength(3);

    const savingsSlice = slices.find(s => s.id === 'savings');
    expect(savingsSlice?.value).toBe(50_000_000_00);
    expect(savingsSlice?.percent).toBe(50);

    const goldSlice = slices.find(s => s.id === 'gold');
    expect(goldSlice?.value).toBe(35_000_000_00);
    expect(goldSlice?.percent).toBe(35);

    const cashSlice = slices.find(s => s.id === 'cash');
    expect(cashSlice?.value).toBe(15_000_000_00);
    expect(cashSlice?.percent).toBe(15);
  });

  it('handles grouping by account and debts correctly', () => {
    const valuations = computeAccountValuations({
      accounts: [bankAccount, savingsAccount, creditCardAccount],
      lots: [],
      transactions: [
        { account: 'bank-1', amount: 40_000_000_00 },
        { account: 'savings-1', amount: 60_000_000_00 },
        { account: 'cc-1', amount: -10_000_000_00 },
      ],
      preferences: [],
      t,
    });

    // When showDebts is false, credit card is excluded from slices
    const { slices: assetSlices, totalAssets, totalDebts, netWorth } =
      computeAssetAllocationSlices({
        valuations,
        groupBy: 'account',
        showDebts: false,
      });

    expect(totalAssets).toBe(100_000_000_00);
    expect(totalDebts).toBe(-10_000_000_00);
    expect(netWorth).toBe(90_000_000_00);
    expect(assetSlices).toHaveLength(2);
    expect(assetSlices[0].name).toBe('Sổ SCB 6 tháng');
    expect(assetSlices[0].percent).toBe(60);
    expect(assetSlices[1].name).toBe('Vietcombank');
    expect(assetSlices[1].percent).toBe(40);

    // When showDebts is true, debt slice is included
    const { slices: allSlices } = computeAssetAllocationSlices({
      valuations,
      groupBy: 'account',
      showDebts: true,
    });

    expect(allSlices).toHaveLength(3);
  });
});
