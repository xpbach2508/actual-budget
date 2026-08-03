import {
  goldPricePreferenceKey,
  resolveGoldPrice,
} from '@actual-app/core/shared/gold-price-metadata';
import { calculateGoldVirtualAdjustment } from '@actual-app/core/shared/gold-valuation';
import { q } from '@actual-app/core/shared/query';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useQuery } from '#hooks/useQuery';

type GoldLot = {
  account_id: string;
  quantity_chi: number;
  tombstone: boolean;
};

type TransactionAmount = {
  account: string;
  amount: number;
};

type Preference = {
  id: string;
  value: string | null;
};

export function getGoldLedgerBalances(
  transactions: readonly TransactionAmount[],
): ReadonlyMap<string, number> {
  return transactions.reduce((balances, transaction) => {
    balances.set(
      transaction.account,
      (balances.get(transaction.account) ?? 0) + transaction.amount,
    );
    return balances;
  }, new Map<string, number>());
}

export function useGoldVirtualAdjustment(
  accounts: readonly AccountEntity[],
): number {
  const { data: lots } = useQuery<GoldLot>(
    () =>
      q('gold_lots')
        .filter({ tombstone: false })
        .select(['account_id', 'quantity_chi', 'tombstone']),
    [],
  );
  const { data: transactions } = useQuery<TransactionAmount>(
    () =>
      q('transactions')
        .filter({ 'account.account_subtype': 'gold' })
        .select(['account', 'amount']),
    [],
  );
  const { data: preferences } = useQuery<Preference>(
    () => q('preferences').select(['id', 'value']),
    [],
  );
  const preferenceValues = new Map(
    (preferences ?? []).map(preference => [preference.id, preference.value]),
  );

  return calculateGoldVirtualAdjustment(
    accounts.map(account => ({
      ...account,
      gold_current_price_per_chi: resolveGoldPrice(
        preferenceValues.get(goldPricePreferenceKey(account.id)),
        account.gold_current_price_per_chi,
      ),
    })),
    lots ?? [],
    getGoldLedgerBalances(transactions ?? []),
  );
}
