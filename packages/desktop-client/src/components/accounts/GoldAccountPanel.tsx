import { useState } from 'react';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import {
  calculateGoldSummary,
  normalizeGoldQuantity,
} from '@actual-app/core/shared/gold';
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
  const { data } = useQuery<GoldLot>(
    () => q('gold_lots').filter({ account_id: account.id }).select('*'),
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
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const manualAdd = useGoldManualAddMutation();
  const purchase = useGoldPurchaseMutation();
  const updatePrice = useGoldPriceMutation();
  const currentPrice = account.gold_current_price_per_chi ?? 0;
  const summary = calculateGoldSummary(lots, currentPrice);

  const fetchLivePrice = async () => {
    setIsFetchingPrice(true);
    try {
      const urls = ['http://localhost:8080/gold/prices/latest', '/gold/prices/latest'];
      let res: Response | null = null;
      for (const url of urls) {
        try {
          res = await fetch(url);
          if (res.ok) break;
        } catch {
          // try next URL
        }
      }
      if (!res || !res.ok) throw new Error('Failed to fetch live price');
      const data = await res.json();
      const prices = data.prices || [];
      const sjcPrice =
        prices.find((p: { provider: string }) => p.provider === 'SJC') ||
        prices[0];
      if (sjcPrice?.sell_price_per_chi) {
        setPrice(String(sjcPrice.sell_price_per_chi));
      }
    } catch (err) {
      console.warn('Could not fetch live gold price:', err);
    } finally {
      setIsFetchingPrice(false);
    }
  };

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
      date: new Date().toISOString().slice(0, 10),
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
      date: new Date().toISOString().slice(0, 10),
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
          <Text style={{ color: '#888', fontSize: 12 }}>Tổng vàng</Text>
          <strong>{summary.quantityChi} chỉ</strong>
        </View>
        <View>
          <Text style={{ color: '#888', fontSize: 12 }}>Tổng vốn đầu tư</Text>
          <strong>{formatVnd.format(summary.costBasis)}</strong>
        </View>
        <View>
          <Text style={{ color: '#888', fontSize: 12 }}>Giá trị hiện tại</Text>
          <strong>{formatVnd.format(summary.currentValue)}</strong>
          {currentPrice > 0 && (
            <Text style={{ fontSize: 11, color: '#aaa', marginLeft: 4 }}>
              ({formatVnd.format(currentPrice)}/chỉ)
            </Text>
          )}
        </View>
        <View>
          <Text style={{ color: '#888', fontSize: 12 }}>Lãi/lỗ chưa thực hiện</Text>
          <strong style={{ color: glColor }}>
            {sign}
            {formatVnd.format(summary.gainLoss)} ({sign}
            {summary.gainLossPercentage.toFixed(2)}%)
          </strong>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button onPress={() => setMode('purchase')}>Mua vàng</Button>
        <Button onPress={() => setMode('manual')}>Thêm vàng thủ công</Button>
        <Button onPress={() => setMode('price')}>Cập nhật giá vàng</Button>
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
            placeholder="Số lượng"
            onChangeValue={setQuantity}
          />
          <Select
            value={unit}
            onChange={value => setUnit(value as 'chi' | 'cay')}
            options={[
              ['chi', 'Chỉ'],
              ['cay', 'Cây'],
            ]}
          />
          <Input
            value={totalCost}
            inputMode="decimal"
            placeholder="Tổng tiền mua"
            onChangeValue={setTotalCost}
          />
          <Button onPress={mode === 'purchase' ? buy : addManual}>Lưu</Button>
          <Button variant="bare" onPress={reset}>
            Hủy
          </Button>
        </View>
      )}
      {mode === 'price' && (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Input
            value={price}
            inputMode="decimal"
            placeholder="Giá VND/chỉ"
            onChangeValue={setPrice}
          />
          <Button onPress={fetchLivePrice} isLoading={isFetchingPrice}>
            Lấy giá thị trường (SJC)
          </Button>
          <Button onPress={savePrice}>Lưu giá</Button>
          <Button variant="bare" onPress={reset}>
            Hủy
          </Button>
        </View>
      )}
    </View>
  );
}
