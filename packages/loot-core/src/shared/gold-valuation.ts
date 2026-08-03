type GoldAccount = {
  id: string;
  account_subtype?: string | null;
  closed: boolean | number;
  exclude_from_totals?: boolean | number | null;
  gold_current_price_per_chi?: number | null;
};

type GoldLot = {
  account_id: string;
  quantity_chi: number;
  tombstone: boolean | number;
};

export function calculateGoldVirtualAdjustment(
  accounts: readonly GoldAccount[],
  lots: readonly GoldLot[],
  ledgerBalances: ReadonlyMap<string, number>,
): number {
  const quantityByAccount = new Map<string, number>();
  for (const lot of lots) {
    if (!lot.tombstone) {
      quantityByAccount.set(
        lot.account_id,
        (quantityByAccount.get(lot.account_id) ?? 0) + lot.quantity_chi,
      );
    }
  }

  return accounts.reduce((adjustment, account) => {
    const price = account.gold_current_price_per_chi ?? 0;
    if (
      account.account_subtype !== 'gold' ||
      account.closed ||
      account.exclude_from_totals ||
      price <= 0
    ) {
      return adjustment;
    }

    const marketValue = (quantityByAccount.get(account.id) ?? 0) * price;
    return adjustment + marketValue - (ledgerBalances.get(account.id) ?? 0);
  }, 0);
}
