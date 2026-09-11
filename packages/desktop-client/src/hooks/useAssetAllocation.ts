import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getGoldPriceMetadataState,
  goldPricePreferenceKey,
} from '@actual-app/core/shared/gold-price-metadata';
import { q } from '@actual-app/core/shared/query';
import { amountToInteger } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useAccounts } from '#hooks/useAccounts';
import { useQuery } from '#hooks/useQuery';

export type GoldLot = {
  account_id: string;
  quantity_chi: number;
  tombstone: boolean;
};

export type TransactionAmount = {
  account: string;
  amount: number;
};

export type Preference = {
  id: string;
  value: string | null;
};

export type AssetSubtype =
  | 'cash'
  | 'savings'
  | 'gold'
  | 'investment'
  | 'family'
  | 'other'
  | 'debt';

export type AccountValuation = {
  id: string;
  name: string;
  account: AccountEntity;
  ledgerBalance: number;
  virtualAdjustment: number;
  effectiveBalance: number;
  subtype: AssetSubtype;
  subtypeName: string;
  icon: string;
};

export type AssetAllocationSlice = {
  id: string;
  name: string;
  icon?: string;
  value: number;
  percent: number;
  color: string;
  accounts: AccountValuation[];
};

export const SUBTYPE_COLORS: Record<AssetSubtype, string> = {
  cash: '#0284c7', // Sky blue
  savings: '#10b981', // Emerald green
  gold: '#f59e0b', // Amber / Gold
  investment: '#8b5cf6', // Violet
  family: '#ec4899', // Pink
  other: '#64748b', // Slate
  debt: '#ef4444', // Red
};

export const ACCOUNT_PALETTE = [
  '#0284c7',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
  '#d946ef',
  '#64748b',
];

export function getSubtypeInfo(
  account: AccountEntity,
  effectiveBalance: number,
  t: (key: string) => string,
): { subtype: AssetSubtype; subtypeName: string; icon: string } {
  if (account.offbudget) {
    switch (account.account_subtype) {
      case 'gold':
        return { subtype: 'gold', subtypeName: t('Gold'), icon: '🪙' };
      case 'savings':
        return { subtype: 'savings', subtypeName: t('Savings'), icon: '🏦' };
      case 'investment':
        return {
          subtype: 'investment',
          subtypeName: t('Investment'),
          icon: '📈',
        };
      case 'family':
        return { subtype: 'family', subtypeName: t('Family'), icon: '👨‍👩‍👧' };
      default:
        if (effectiveBalance < 0) {
          return { subtype: 'debt', subtypeName: t('Debts'), icon: '💳' };
        }
        return {
          subtype: 'other',
          subtypeName: t('Other assets'),
          icon: '📦',
        };
    }
  }

  if (effectiveBalance < 0) {
    return {
      subtype: 'debt',
      subtypeName: t('Credit & Debts'),
      icon: '💳',
    };
  }

  return {
    subtype: 'cash',
    subtypeName: t('Cash & Bank'),
    icon: '💵',
  };
}

export function computeAccountValuations({
  accounts,
  lots,
  transactions,
  preferences,
  t,
}: {
  accounts: readonly AccountEntity[];
  lots: readonly GoldLot[] | null;
  transactions: readonly TransactionAmount[] | null;
  preferences: readonly Preference[] | null;
  t: (key: string) => string;
}): AccountValuation[] {
  const ledgerBalances = new Map<string, number>();
  if (transactions) {
    for (const trans of transactions) {
      ledgerBalances.set(
        trans.account,
        (ledgerBalances.get(trans.account) ?? 0) + trans.amount,
      );
    }
  }

  const quantityByAccount = new Map<string, number>();
  if (lots) {
    for (const lot of lots) {
      if (!lot.tombstone) {
        quantityByAccount.set(
          lot.account_id,
          (quantityByAccount.get(lot.account_id) ?? 0) + lot.quantity_chi,
        );
      }
    }
  }

  const preferenceValues = new Map(
    (preferences ?? []).map(p => [p.id, p.value]),
  );

  return accounts
    .filter(
      account => !account.closed && !account.tombstone && !account.exclude_from_totals,
    )
    .map(account => {
      const ledgerBalance = ledgerBalances.get(account.id) ?? 0;
      let virtualAdjustment = 0;
      let effectiveBalance = ledgerBalance;

      if (account.account_subtype === 'gold') {
        const prefKey = goldPricePreferenceKey(account.id);
        const metaState = getGoldPriceMetadataState(
          preferenceValues.get(prefKey),
          account.gold_current_price_per_chi,
        );
        const price = metaState.price ?? 0;
        const quantity = quantityByAccount.get(account.id) ?? 0;

        if (price > 0 && quantity > 0) {
          const marketValue = amountToInteger(quantity * price);
          virtualAdjustment = marketValue - ledgerBalance;
          effectiveBalance = marketValue;
        }
      }

      const { subtype, subtypeName, icon } = getSubtypeInfo(
        account,
        effectiveBalance,
        t,
      );

      return {
        id: account.id,
        name: account.name,
        account,
        ledgerBalance,
        virtualAdjustment,
        effectiveBalance,
        subtype,
        subtypeName,
        icon,
      };
    });
}

export function computeAssetAllocationSlices({
  valuations,
  groupBy = 'subtype',
  showDebts = false,
}: {
  valuations: AccountValuation[];
  groupBy?: 'subtype' | 'account';
  showDebts?: boolean;
}): {
  slices: AssetAllocationSlice[];
  totalAssets: number;
  totalDebts: number;
  netWorth: number;
} {
  let totalAssets = 0;
  let totalDebts = 0;

  for (const v of valuations) {
    if (v.effectiveBalance > 0) {
      totalAssets += v.effectiveBalance;
    } else if (v.effectiveBalance < 0) {
      totalDebts += v.effectiveBalance;
    }
  }

  const netWorth = totalAssets + totalDebts;

  if (groupBy === 'account') {
    const activeValuations = valuations.filter(v =>
      showDebts ? v.effectiveBalance !== 0 : v.effectiveBalance > 0,
    );

    activeValuations.sort((a, b) => b.effectiveBalance - a.effectiveBalance);

    const slices: AssetAllocationSlice[] = activeValuations.map((v, index) => {
      const val = Math.abs(v.effectiveBalance);
      const percent = totalAssets > 0 ? (val / totalAssets) * 100 : 0;
      return {
        id: v.id,
        name: v.name,
        icon: v.icon,
        value: val,
        percent,
        color:
          v.effectiveBalance < 0
            ? SUBTYPE_COLORS.debt
            : ACCOUNT_PALETTE[index % ACCOUNT_PALETTE.length],
        accounts: [v],
      };
    });

    return { slices, totalAssets, totalDebts, netWorth };
  }

  // Group by subtype
  const groups = new Map<
    AssetSubtype,
    {
      subtype: AssetSubtype;
      name: string;
      icon: string;
      value: number;
      accounts: AccountValuation[];
    }
  >();

  for (const v of valuations) {
    if (!showDebts && v.effectiveBalance <= 0) {
      continue;
    }
    if (showDebts && v.effectiveBalance === 0) {
      continue;
    }

    const existing = groups.get(v.subtype);
    if (existing) {
      existing.value += Math.abs(v.effectiveBalance);
      existing.accounts.push(v);
    } else {
      groups.set(v.subtype, {
        subtype: v.subtype,
        name: v.subtypeName,
        icon: v.icon,
        value: Math.abs(v.effectiveBalance),
        accounts: [v],
      });
    }
  }

  const groupList = Array.from(groups.values());
  groupList.sort((a, b) => b.value - a.value);

  const slices: AssetAllocationSlice[] = groupList.map(g => ({
    id: g.subtype,
    name: g.name,
    icon: g.icon,
    value: g.value,
    percent: totalAssets > 0 ? (g.value / totalAssets) * 100 : 0,
    color: SUBTYPE_COLORS[g.subtype] || '#64748b',
    accounts: g.accounts,
  }));

  return { slices, totalAssets, totalDebts, netWorth };
}

export function useAssetAllocation({
  accounts: propAccounts,
  groupBy = 'subtype',
  showDebts = false,
}: {
  accounts?: readonly AccountEntity[];
  groupBy?: 'subtype' | 'account';
  showDebts?: boolean;
} = {}) {
  const { t } = useTranslation();
  const { data: fetchedAccounts = [] } = useAccounts();
  const accounts = propAccounts || fetchedAccounts;

  const { data: transactions, isLoading: isTransLoading } =
    useQuery<TransactionAmount>(
      () =>
        q('transactions')
          .filter({ 'account.closed': false })
          .select(['account', 'amount']),
      [],
    );

  const { data: lots, isLoading: isLotsLoading } = useQuery<GoldLot>(
    () =>
      q('gold_lots')
        .filter({ tombstone: false })
        .select(['account_id', 'quantity_chi', 'tombstone']),
    [],
  );

  const { data: preferences, isLoading: isPrefsLoading } =
    useQuery<Preference>(() => q('preferences').select(['id', 'value']), []);

  const isLoading = isTransLoading || isLotsLoading || isPrefsLoading;

  const valuations = useMemo(
    () =>
      computeAccountValuations({
        accounts,
        lots,
        transactions,
        preferences,
        t,
      }),
    [accounts, lots, transactions, preferences, t],
  );

  const { slices, totalAssets, totalDebts, netWorth } = useMemo(
    () =>
      computeAssetAllocationSlices({
        valuations,
        groupBy,
        showDebts,
      }),
    [valuations, groupBy, showDebts],
  );

  return {
    valuations,
    slices,
    totalAssets,
    totalDebts,
    netWorth,
    isLoading,
  };
}
