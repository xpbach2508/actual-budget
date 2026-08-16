import React from 'react';

import type { AccountEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';

import { useGoldManualAddMutation, useGoldPriceMutation, useGoldPurchaseMutation } from '#accounts/mutations';
import { useQuery } from '#hooks/useQuery';
import { TestProviders } from '#mocks';

import { GoldAccountPanel } from './GoldAccountPanel';

vi.mock('#hooks/useQuery', () => ({ useQuery: vi.fn() }));
vi.mock('#accounts/mutations', () => ({
  useGoldManualAddMutation: vi.fn(),
  useGoldPriceMutation: vi.fn(),
  useGoldPurchaseMutation: vi.fn(),
}));

const account = {
  id: 'gold',
  name: 'Gold',
  account_subtype: 'gold',
  closed: false,
  tombstone: false,
  gold_current_price_per_chi: null,
} as AccountEntity;

function renderPanel(preference: string | null) {
  vi.mocked(useQuery)
    .mockReturnValueOnce({ data: [{ id: 'lot', date: '2026-08-01', quantity_chi: 1, cost_per_chi: 7_000_000 }] })
    .mockReturnValueOnce({ data: preference == null ? [] : [{ id: 'gold-price:gold', value: preference }] });
  return render(
    <TestProviders>
      <GoldAccountPanel account={account} accounts={[account]} />
    </TestProviders>,
  );
}

describe('GoldAccountPanel quote state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mutation = { mutate: vi.fn() };
    vi.mocked(useGoldManualAddMutation).mockReturnValue(mutation as never);
    vi.mocked(useGoldPurchaseMutation).mockReturnValue(mutation as never);
    vi.mocked(useGoldPriceMutation).mockReturnValue(mutation as never);
  });

  it('labels a stale synced quote and does not display a zero market value', () => {
    renderPanel(JSON.stringify({
      price_per_chi: 7_900_000,
      provider: 'SJC',
      fetched_at: '2020-01-01T00:00:00Z',
    }));

    expect(screen.getByText(/Last SJC quote is stale/i)).toBeInTheDocument();
    expect(screen.getByText(/Market quote unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('₫0')).not.toBeInTheDocument();
  });
});
