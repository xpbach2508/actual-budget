import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addMonths, format } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';

import {
  applyMonthFilterChange,
  MonthPicker,
  parseYearMonth,
} from './MonthPicker';

const now = new Date();
const currentMonthValue = format(now, 'yyyy-MM');
const currentMonthLabel = `Tháng ${format(now, 'M')} năm ${format(now, 'yyyy')}`;
const firstMonthLabel = `Tháng 1 năm ${format(now, 'yyyy')}`;
const lastMonthLabel = `Tháng 12 năm ${format(now, 'yyyy')}`;
const oldestMonth = addMonths(now, -23);

describe('MonthPicker', () => {
  it('shows a 12-month grid for the current year without a scrolling menu', async () => {
    const user = userEvent.setup();
    render(
      <MonthPicker activeMonthValue={null} onApplyMonthFilter={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /tất cả/i }));

    expect(screen.getByRole('button', { name: firstMonthLabel })).toBeVisible();
    expect(screen.getByRole('button', { name: lastMonthLabel })).toBeVisible();
    expect(
      screen.getAllByRole('button', { name: /tháng \d+ năm \d{4}/i }),
    ).toHaveLength(12);
  });

  it('lays out year navigation controls horizontally', async () => {
    const user = userEvent.setup();
    render(
      <MonthPicker activeMonthValue={null} onApplyMonthFilter={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /tất cả/i }));

    expect(
      screen.getByRole('button', { name: 'Năm trước' }).parentElement,
    ).toHaveStyle({ flexDirection: 'row' });
  });

  it('applies an enabled month and closes the popover', async () => {
    const user = userEvent.setup();
    const onApplyMonthFilter = vi.fn();
    render(
      <MonthPicker
        activeMonthValue={null}
        onApplyMonthFilter={onApplyMonthFilter}
      />,
    );

    await user.click(screen.getByRole('button', { name: /tất cả/i }));
    await user.click(screen.getByRole('button', { name: currentMonthLabel }));

    expect(onApplyMonthFilter).toHaveBeenCalledWith(currentMonthValue);
    expect(
      screen.queryByRole('button', { name: firstMonthLabel }),
    ).not.toBeInTheDocument();
  });

  it('clears the filter with Tất cả', async () => {
    const user = userEvent.setup();
    const onApplyMonthFilter = vi.fn();
    render(
      <MonthPicker
        activeMonthValue={currentMonthValue}
        onApplyMonthFilter={onApplyMonthFilter}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: new RegExp(`T${format(now, 'M/yyyy')}`, 'i'),
      }),
    );
    await user.click(screen.getByRole('button', { name: /^tất cả$/i }));

    expect(onApplyMonthFilter).toHaveBeenCalledWith(null);
  });

  it('navigates to the prior year and disables navigation outside the 24-month range', async () => {
    const user = userEvent.setup();
    render(
      <MonthPicker activeMonthValue={null} onApplyMonthFilter={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /tất cả/i }));

    const oldestYear = Number(format(oldestMonth, 'yyyy'));
    for (let year = now.getFullYear(); year > oldestYear; year--) {
      await user.click(screen.getByRole('button', { name: 'Năm trước' }));
    }

    expect(
      screen.getByRole('button', {
        name: `Tháng ${format(oldestMonth, 'M')} năm ${format(oldestMonth, 'yyyy')}`,
      }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Năm trước' })).toBeDisabled();
  });

  it('parses yyyy-MM as the first of the month so the 31st does not overflow', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 31));

    expect(format(parseYearMonth('2026-02'), 'yyyy-MM')).toBe('2026-02');
    expect(parseYearMonth('2026-02').getMonth()).toBe(1);

    vi.useRealTimers();
  });
});

describe('applyMonthFilterChange', () => {
  const activeFilter = {
    field: 'date',
    op: 'is',
    value: '2026-01',
    options: { month: true },
  } as const;

  it('updates an existing month filter instead of delete-then-add', () => {
    const onApplyFilter = vi.fn();
    const onUpdateFilter = vi.fn();
    const onDeleteFilter = vi.fn();

    applyMonthFilterChange({
      value: '2026-02',
      activeFilter,
      onApplyFilter,
      onUpdateFilter,
      onDeleteFilter,
    });

    expect(onDeleteFilter).not.toHaveBeenCalled();
    expect(onApplyFilter).not.toHaveBeenCalled();
    expect(onUpdateFilter).toHaveBeenCalledWith(
      activeFilter,
      expect.objectContaining({
        field: 'date',
        op: 'is',
        value: '2026-02',
        options: { month: true },
      }),
    );
  });

  it('applies a month filter when none exists', () => {
    const onApplyFilter = vi.fn();
    const onUpdateFilter = vi.fn();
    const onDeleteFilter = vi.fn();

    applyMonthFilterChange({
      value: '2026-02',
      activeFilter: undefined,
      onApplyFilter,
      onUpdateFilter,
      onDeleteFilter,
    });

    expect(onDeleteFilter).not.toHaveBeenCalled();
    expect(onUpdateFilter).not.toHaveBeenCalled();
    expect(onApplyFilter).toHaveBeenCalledWith(
      expect.objectContaining({ value: '2026-02', options: { month: true } }),
    );
  });

  it('deletes the month filter only when clearing to Tất cả', () => {
    const onApplyFilter = vi.fn();
    const onUpdateFilter = vi.fn();
    const onDeleteFilter = vi.fn();

    applyMonthFilterChange({
      value: null,
      activeFilter,
      onApplyFilter,
      onUpdateFilter,
      onDeleteFilter,
    });

    expect(onDeleteFilter).toHaveBeenCalledWith(activeFilter);
    expect(onApplyFilter).not.toHaveBeenCalled();
    expect(onUpdateFilter).not.toHaveBeenCalled();
  });
});
