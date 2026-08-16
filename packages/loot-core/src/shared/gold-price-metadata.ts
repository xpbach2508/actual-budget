export type GoldPriceMetadata = {
  price_per_chi: number;
  provider: string;
  fetched_at: string;
};

export type GoldPriceMetadataState = {
  price: number | null;
  metadata: GoldPriceMetadata | null;
  stale: boolean;
  source: 'synced' | 'manual' | 'unavailable';
};

export const GOLD_PRICE_MAX_AGE_MS = 36 * 60 * 60 * 1000;

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

export function getGoldPriceMetadataState(
  metadataValue: string | null | undefined,
  legacyPrice: number | null | undefined,
  now = new Date(),
): GoldPriceMetadataState {
  const metadata = parseGoldPriceMetadata(metadataValue);
  if (metadata) {
    const fetchedAt = new Date(metadata.fetched_at);
    const stale =
      !Number.isFinite(fetchedAt.getTime()) ||
      now.getTime() - fetchedAt.getTime() > GOLD_PRICE_MAX_AGE_MS;
    return {
      price: stale ? null : metadata.price_per_chi,
      metadata,
      stale,
      source: 'synced',
    };
  }
  if (metadataValue != null) {
    return { price: null, metadata: null, stale: false, source: 'unavailable' };
  }
  if (typeof legacyPrice === 'number' && Number.isFinite(legacyPrice) && legacyPrice > 0) {
    return {
      price: legacyPrice,
      metadata: null,
      stale: false,
      source: 'manual',
    };
  }
  return { price: null, metadata: null, stale: false, source: 'unavailable' };
}

export function resolveGoldPrice(
  metadataValue: string | null | undefined,
  legacyPrice: number | null | undefined,
): number {
  return getGoldPriceMetadataState(metadataValue, legacyPrice).price ?? 0;
}
