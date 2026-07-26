# Month Picker Grid Design

## Goal

Replace the tall, scrollable month menu in the transaction list with a compact calendar popover. It must retain the existing “All” filter and the existing 24-month filtering range.

## Interaction

- The trigger remains a bare button with the calendar icon and current selection (`T7/2026` or `Tất cả`).
- Opening it displays a fixed-width popover containing:
  1. a `Tất cả` action;
  2. a header with previous-year button, displayed year, and next-year button;
  3. a 3-column by 4-row grid of month buttons.
- Month labels are `Tháng 1` through `Tháng 12`.
- The selected month has the existing selected/primary visual treatment.
- Months outside the existing rolling 24-month window, including future months, are disabled and cannot be selected.
- Year navigation is disabled when the adjacent year contains no selectable month. The initial displayed year is the selected month’s year, or the current year when the filter is `Tất cả`.
- Selecting `Tất cả` clears the filter; selecting an enabled month applies `yyyy-MM`. Both close the popover.
- The popover has no internal vertical scrollbar.

## Implementation

`MonthPicker.tsx` will replace the `Menu` and generated menu-item list with local month-grid state. Date-fns continues to provide month/year formatting and rolling-range calculations. The public props and the transaction-list filtering contract stay unchanged.

The component derives an allowed `yyyy-MM` set from the current month and preceding 23 months. It uses that set to determine month enabled state and valid year-navigation bounds. This keeps behavior equivalent to the current picker without querying transactions or changing persistence.

## Error Handling and Accessibility

- Disabled month and year-navigation buttons cannot invoke `onApplyMonthFilter`.
- Buttons receive explicit accessible labels, including the displayed year for each month and labels for prior/next year.
- `onOpenChange` continues to close the popover when focus leaves or Escape is pressed.

## Tests

Component tests will verify:

1. the popover shows `Tất cả`, year navigation, and all 12 month buttons without a scrolling menu;
2. an enabled month emits its `yyyy-MM` value and closes the popover;
3. `Tất cả` emits `null` and closes the popover;
4. months outside the rolling 24-month range are disabled;
5. year navigation changes the displayed grid and respects range boundaries.

## Scope

This only changes the Month Picker used by transaction-list filtering. It does not change filter semantics, the backend query, account month filtering, or date selection elsewhere.
