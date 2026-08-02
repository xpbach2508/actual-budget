export type GoldUnit = 'chi' | 'cay';

type GoldLot = {
  quantity_chi: number;
  cost_per_chi: number;
};

export function normalizeGoldQuantity(quantity: number, unit: GoldUnit) {
  return unit === 'cay' ? quantity * 10 : quantity;
}

export function calculateGoldSummary(
  lots: ReadonlyArray<GoldLot>,
  currentPricePerChi: number,
) {
  const { quantityChi, costBasis } = lots.reduce(
    (summary, lot) => ({
      quantityChi: summary.quantityChi + lot.quantity_chi,
      costBasis: summary.costBasis + lot.quantity_chi * lot.cost_per_chi,
    }),
    { quantityChi: 0, costBasis: 0 },
  );
  const currentValue = quantityChi * currentPricePerChi;

  const gainLoss = currentValue - costBasis;
  const gainLossPercentage = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

  return {
    quantityChi,
    costBasis,
    currentValue,
    gainLoss,
    gainLossPercentage,
  };
}
