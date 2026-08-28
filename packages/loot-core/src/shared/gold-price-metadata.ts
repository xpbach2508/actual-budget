import { integerToAmount } from './util';

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

function displayPriceFromStoredInteger(
  legacyPrice: number | null | undefined,
): number | null {
  if (
    typeof legacyPrice !== 'number' ||
    !Number.isFinite(legacyPrice) ||
    legacyPrice <= 0
  ) {
    return null;
  }
  const displayPrice = integerToAmount(legacyPrice);
  return displayPrice > 0 ? displayPrice : null;
}

function isManualProvider(provider: string): boolean {
  return provider.toLowerCase() === 'manual';
}

export function getGoldPriceMetadataState(
  metadataValue: string | null | undefined,
  legacyPrice: number | null | undefined,
  now = new Date(),
): GoldPriceMetadataState {
  const metadata = parseGoldPriceMetadata(metadataValue);
  const manualPrice = displayPriceFromStoredInteger(legacyPrice);

  if (metadata) {
    const fetchedAt = new Date(metadata.fetched_at);
    const manualQuote = isManualProvider(metadata.provider);
    const stale =
      !manualQuote &&
      (!Number.isFinite(fetchedAt.getTime()) ||
        now.getTime() - fetchedAt.getTime() > GOLD_PRICE_MAX_AGE_MS);

    if (!stale) {
      return {
        price: metadata.price_per_chi,
        metadata,
        stale: false,
        source: manualQuote ? 'manual' : 'synced',
      };
    }

    if (manualPrice != null) {
      return {
        price: manualPrice,
        metadata,
        stale: true,
        source: 'manual',
      };
    }

    return {
      price: null,
      metadata,
      stale: true,
      source: 'synced',
    };
  }
  if (metadataValue != null) {
    return { price: null, metadata: null, stale: false, source: 'unavailable' };
  }
  if (manualPrice != null) {
    return {
      price: manualPrice,
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
