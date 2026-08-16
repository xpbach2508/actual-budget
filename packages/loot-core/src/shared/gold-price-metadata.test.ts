import { describe, expect, it } from 'vitest';

import {
  getGoldPriceMetadataState,
  GOLD_PRICE_MAX_AGE_MS,
} from './gold-price-metadata';

const metadata = (fetchedAt: string) =>
  JSON.stringify({
    price_per_chi: 7_900_000,
    provider: 'SJC',
    fetched_at: fetchedAt,
  });

describe('getGoldPriceMetadataState', () => {
  it('accepts a quote exactly 36 hours old and rejects it one millisecond later', () => {
    const fetchedAt = '2026-08-14T09:00:00.000Z';
    const freshNow = new Date(
      new Date(fetchedAt).getTime() + GOLD_PRICE_MAX_AGE_MS,
    );
    const staleNow = new Date(freshNow.getTime() + 1);

    expect(getGoldPriceMetadataState(metadata(fetchedAt), null, freshNow)).toMatchObject({
      price: 7_900_000,
      stale: false,
      source: 'synced',
    });
    expect(getGoldPriceMetadataState(metadata(fetchedAt), 7_800_000, staleNow)).toMatchObject({
      price: null,
      stale: true,
      source: 'synced',
    });
  });

  it('uses a positive legacy price only when synced metadata is absent', () => {
    expect(getGoldPriceMetadataState(null, 7_900_000)).toMatchObject({
      price: 7_900_000,
      metadata: null,
      stale: false,
      source: 'manual',
    });
    expect(getGoldPriceMetadataState('{not-json', 7_900_000)).toMatchObject({
      price: null,
      metadata: null,
      stale: false,
      source: 'unavailable',
    });
  });
});
