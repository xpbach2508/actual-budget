import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import {
  calculateGoldSummary,
  normalizeGoldQuantity,
} from '@actual-app/core/shared/gold';
import {
  getGoldPriceMetadataState,
  goldPricePreferenceKey,
} from '@actual-app/core/shared/gold-price-metadata';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { toRelaxedNumber } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';

import {
  useGoldManualAddMutation,
  useGoldPriceMutation,
  useGoldPurchaseMutation,
} from '#accounts/mutations';
import { useQuery } from '#hooks/useQuery';

const formatVnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

type GoldLot = {
  id: string;
  date: string;
  quantity_chi: number;
  cost_per_chi: number;
};

type GoldAccountPanelProps = {
  account: AccountEntity;
  accounts: ReadonlyArray<AccountEntity>;
};

export function GoldAccountPanel({ account, accounts }: GoldAccountPanelProps) {
  const { t } = useTranslation();
  const { data } = useQuery<GoldLot>(
    () =>
      q('gold_lots')
        .filter({ account_id: account.id, tombstone: false })
        .select('*'),
    [account.id],
  );
  const lots = data ?? [];
  const [mode, setMode] = useState<'manual' | 'purchase' | 'price' | null>(
    null,
  );
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'chi' | 'cay'>('chi');
  const [totalCost, setTotalCost] = useState('');
  const [price, setPrice] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const manualAdd = useGoldManualAddMutation();
  const purchase = useGoldPurchaseMutation();
  const updatePrice = useGoldPriceMutation();
  const { data: preferences } = useQuery<{ id: string; value: string | null }>(
    () =>
      q('preferences')
        .filter({ id: goldPricePreferenceKey(account.id) })
        .select('*'),
    [account.id],
  );
  const priceState = getGoldPriceMetadataState(
    preferences?.[0]?.value,
    account.gold_current_price_per_chi,
  );
  const currentPrice = priceState.price ?? 0;
  const hasCurrentQuote = priceState.price != null;
  const summary = calculateGoldSummary(lots, currentPrice);

  const quantityChi = normalizeGoldQuantity(
    toRelaxedNumber(quantity) || 0,
    unit,
  );
  const cost = toRelaxedNumber(totalCost) || 0;
  const reset = () => {
    setMode(null);
    setQuantity('');
    setTotalCost('');
    setPrice('');
    setSourceAccountId('');
    setUnit('chi');
  };
  const addManual = () => {
    if (quantityChi <= 0 || cost < 0) return;
    manualAdd.mutate({
      accountId: account.id,
      date: monthUtils.currentDay(),
      quantityChi,
      totalCost: cost,
    });
    reset();
  };
  const buy = () => {
    if (quantityChi <= 0 || cost < 0 || !sourceAccountId) return;
    purchase.mutate({
      accountId: account.id,
      sourceAccountId,
      date: monthUtils.currentDay(),
      quantityChi,
      totalCost: cost,
    });
    reset();
  };
  const savePrice = () => {
    const pricePerChi = toRelaxedNumber(price);
    if (pricePerChi == null || pricePerChi < 0) return;
    updatePrice.mutate({ accountId: account.id, pricePerChi });
    reset();
  };

  const sign = summary.gainLoss > 0 ? '+' : '';
  const glColor = summary.gainLoss >= 0 ? '#4caf50' : '#e57373';

  return (
    <View style={{ gap: 10, margin: '0 15px 12px' }}>
      <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
        <View>
          <Text style={{ color: '#888', fontSize: 12 }}>
            <Trans>Total gold</Trans>
          </Text>
          <strong>
            {t('{{quantity}} chi', { quantity: summary.quantityChi })}
          </strong>
        </View>
        <View>
          <Text style={{ color: '#888', fontSize: 12 }}>
            <Trans>Cost basis</Trans>
          </Text>
          <strong>{formatVnd.format(summary.costBasis)}</strong>
        </View>
        <View>
          <Text style={{ color: '#888', fontSize: 12 }}>
            <Trans>Current value</Trans>
          </Text>
          <strong>{hasCurrentQuote ? formatVnd.format(summary.currentValue) : '—'}</strong>
          {hasCurrentQuote ? (
            <Text style={{ fontSize: 11, color: '#aaa', marginLeft: 4 }}>
              ({formatVnd.format(currentPrice)}/{t('chi')}){' '}
              {priceState.source === 'synced' && priceState.metadata
                ? t('{{provider}} · updated {{when}}', {
                    provider: priceState.metadata.provider,
                    when: new Date(
                      priceState.metadata.fetched_at,
                    ).toLocaleString(),
                  })
                : t('Manual price')}
            </Text>
          ) : (
            <Text style={{ fontSize: 11, color: '#aaa', marginLeft: 4 }}>
              {priceState.stale && priceState.metadata
                ? t('Last {{provider}} quote is stale · ', {
                    provider: priceState.metadata.provider,
                  })
                : ''}
              <Trans>Market quote unavailable</Trans>
            </Text>
          )}
        </View>
        <View>
          <Text style={{ color: '#888', fontSize: 12 }}>
            <Trans>Unrealized gain/loss</Trans>
          </Text>
          <strong style={{ color: glColor }}>
            {hasCurrentQuote
              ? `${sign}${formatVnd.format(summary.gainLoss)} (${sign}${summary.gainLossPercentage.toFixed(2)}%)`
              : '—'}
          </strong>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button onPress={() => setMode('purchase')}>
          <Trans>Buy gold</Trans>
        </Button>
        <Button onPress={() => setMode('manual')}>
          <Trans>Add gold manually</Trans>
        </Button>
        <Button onPress={() => setMode('price')}>
          <Trans>Update gold price</Trans>
        </Button>
      </View>
      {(mode === 'manual' || mode === 'purchase') && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {mode === 'purchase' && (
            <Select
              value={sourceAccountId}
              onChange={setSourceAccountId}
              options={accounts
                .filter(item => item.id !== account.id && item.closed === 0)
                .map(item => [item.id, item.name])}
            />
          )}
          <Input
            value={quantity}
            inputMode="decimal"
            placeholder={t('Quantity')}
            onChangeValue={setQuantity}
          />
          <Select
            value={unit}
            onChange={value => setUnit(value as 'chi' | 'cay')}
            options={[
              ['chi', t('Chi')],
              ['cay', t('Cay')],
            ]}
          />
          <Input
            value={totalCost}
            inputMode="decimal"
            placeholder={t('Total purchase cost')}
            onChangeValue={setTotalCost}
          />
          <Button onPress={mode === 'purchase' ? buy : addManual}>
            <Trans>Save</Trans>
          </Button>
          <Button variant="bare" onPress={reset}>
            <Trans>Cancel</Trans>
          </Button>
        </View>
      )}
      {mode === 'price' && (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Input
            value={price}
            inputMode="decimal"
            placeholder={t('Price VND/chi')}
            onChangeValue={setPrice}
          />
          <Button onPress={savePrice}>
            <Trans>Save price</Trans>
          </Button>
          <Button variant="bare" onPress={reset}>
            <Trans>Cancel</Trans>
          </Button>
        </View>
      )}
    </View>
  );
}
