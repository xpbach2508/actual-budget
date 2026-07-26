export type GoldLotQuantity = {
  transfer_id: string | null;
  quantity_chi: number;
  tombstone: number;
};

export function getGoldQuantityByTransaction(
  lots: readonly GoldLotQuantity[],
): ReadonlyMap<string, number> {
  return new Map(
    lots
      .filter(lot => lot.tombstone === 0 && lot.transfer_id != null)
      .map(lot => [lot.transfer_id!, lot.quantity_chi]),
  );
}

export function formatGoldQuantity(quantityChi: number | undefined): string {
  return quantityChi == null
    ? ''
    : `${new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: 4,
      }).format(quantityChi)} chỉ`;
}
