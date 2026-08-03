export type GoldPriceMetadata = {
  price_per_chi: number;
  provider: string;
  fetched_at: string;
};

export function goldPricePreferenceKey(accountId: string): string {
  return `gold-price:${accountId}`;
}

export function parseGoldPriceMetadata(
  value: string | null | undefined,
): GoldPriceMetadata | null {
  try {
    const parsed = JSON.parse(value ?? '') as Partial<GoldPriceMetadata>;
    if (
      typeof parsed.price_per_chi !== 'number' ||
      !Number.isFinite(parsed.price_per_chi) ||
      parsed.price_per_chi <= 0 ||
      typeof parsed.provider !== 'string' ||
      typeof parsed.fetched_at !== 'string'
    ) {
      return null;
    }
    return parsed as GoldPriceMetadata;
  } catch {
    return null;
  }
}

export function resolveGoldPrice(
  metadataValue: string | null | undefined,
  legacyPrice: number | null | undefined,
): number {
  return (
    parseGoldPriceMetadata(metadataValue)?.price_per_chi ?? legacyPrice ?? 0
  );
}
