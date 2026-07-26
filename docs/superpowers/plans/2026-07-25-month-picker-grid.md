# Month Picker Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the transaction-list month dropdown with a compact, accessible 12-month grid popover with bounded year navigation.

**Architecture:** Keep `MonthPicker` as the only public component and preserve its `activeMonthValue` / `onApplyMonthFilter` contract. It derives a rolling set of the current month plus the preceding 23 months, and renders only enabled values from that set in a year-grid popover. Component-local state controls popover visibility and displayed year.

**Tech Stack:** React, TypeScript, date-fns, React Aria components, Vitest, Testing Library.

## Global Constraints

- Preserve the existing 24-month filter range and `yyyy-MM` values.
- Keep the existing `Tất cả` behavior: it emits `null`.
- Use existing Actual component-library primitives; add no dependency.
- Use accessible Vietnamese labels for navigation and month buttons.
- Do not alter transaction filtering, server queries, or other date pickers.

---

## File Structure

- Modify: `packages/desktop-client/src/components/filters/MonthPicker.tsx` — replace `Menu` with a bounded year/month grid while retaining the existing props.
- Create: `packages/desktop-client/src/components/filters/MonthPicker.test.tsx` — tests observable open, selection, disabled-state, and year-navigation behavior.

### Task 1: Grid month picker

**Files:**
- Create: `packages/desktop-client/src/components/filters/MonthPicker.test.tsx`
- Modify: `packages/desktop-client/src/components/filters/MonthPicker.tsx`

**Interfaces:**
- Consumes: `MonthPickerProps = { activeMonthValue: string | null; onApplyMonthFilter: (value: string | null) => void }`.
- Produces: unchanged `MonthPicker` export; calls `onApplyMonthFilter('yyyy-MM')` only for enabled months and `onApplyMonthFilter(null)` for `Tất cả`.

- [ ] **Step 1: Write failing component tests**

Create `MonthPicker.test.tsx`. Freeze time at `2026-07-25`, then test interaction through public button labels:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MonthPicker } from './MonthPicker';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-25T12:00:00Z'));
});

afterEach(() => vi.useRealTimers());

describe('MonthPicker', () => {
  it('shows a 12-month grid for the current year without a scrolling menu', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MonthPicker activeMonthValue={null} onApplyMonthFilter={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /tất cả/i }));

    expect(screen.getByRole('button', { name: 'Tháng 1 năm 2026' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tháng 12 năm 2026' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tháng 1 năm 2025' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tháng 8 năm 2026' })).toBeDisabled();
  });

  it('applies an enabled month and closes the popover', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onApplyMonthFilter = vi.fn();
    render(<MonthPicker activeMonthValue={null} onApplyMonthFilter={onApplyMonthFilter} />);

    await user.click(screen.getByRole('button', { name: /tất cả/i }));
    await user.click(screen.getByRole('button', { name: 'Tháng 7 năm 2026' }));

    expect(onApplyMonthFilter).toHaveBeenCalledWith('2026-07');
    expect(screen.queryByRole('button', { name: 'Tháng 1 năm 2026' })).not.toBeInTheDocument();
  });

  it('clears the filter with Tất cả', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onApplyMonthFilter = vi.fn();
    render(
      <MonthPicker activeMonthValue="2026-07" onApplyMonthFilter={onApplyMonthFilter} />,
    );

    await user.click(screen.getByRole('button', { name: /t7\/2026/i }));
    await user.click(screen.getByRole('button', { name: /^tất cả$/i }));

    expect(onApplyMonthFilter).toHaveBeenCalledWith(null);
  });

  it('navigates to the prior year and disables navigation outside the 24-month range', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MonthPicker activeMonthValue={null} onApplyMonthFilter={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /tất cả/i }));
    await user.click(screen.getByRole('button', { name: 'Năm trước' }));

    expect(screen.getByRole('button', { name: 'Tháng 8 năm 2025' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tháng 7 năm 2025' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Năm trước' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web test src/components/filters/MonthPicker.test.tsx
```

Expected: FAIL because the existing `Menu` does not expose year navigation or labelled month-grid buttons.

- [ ] **Step 3: Replace the menu with the bounded grid implementation**

In `MonthPicker.tsx`:

1. Remove `Menu`, `MenuItem`, `subMonths`, and `parse` imports. Import `addMonths`, `format`, and `startOfMonth` from `date-fns`.
2. Define constants and pure helpers above the component:

```tsx
const MONTHS_IN_FILTER_RANGE = 24;
const monthNames = Array.from({ length: 12 }, (_, monthIndex) =>
  format(new Date(2000, monthIndex, 1), 'MMMM'),
);

function getAllowedMonths(now: Date) {
  return new Set(
    Array.from({ length: MONTHS_IN_FILTER_RANGE }, (_, index) =>
      format(addMonths(startOfMonth(now), -index), 'yyyy-MM'),
    ),
  );
}
```

3. Initialize `displayedYear` from `activeMonthValue` when present, otherwise the current year. On trigger press, reset it using that same rule before setting `isOpen` to true.
4. Derive `allowedMonths`, `allowedYears`, `canShowPreviousYear`, and `canShowNextYear`; a target year is navigable only when `allowedYears` includes it.
5. Replace `Menu` with `View` content: a `bare` `Tất cả` button; a header containing `bare` buttons labelled `Năm trước` and `Năm sau` with text chevrons `‹` / `›`; and a `View` styled with `display: 'grid'`, `gridTemplateColumns: 'repeat(3, 1fr)'`, and a small `gap`.
6. Render all 12 months as `Button` instances. Give each `aria-label` `Tháng ${monthIndex + 1} năm ${displayedYear}`, `isDisabled={!allowedMonths.has(value)}`, and `variant={activeMonthValue === value ? 'menuSelected' : 'menu'}`. Its press handler must call `onApplyMonthFilter(value)` and close only when enabled.
7. Set popover dimensions to a fixed compact width with padding and no `maxHeight` or `overflowY`.

The selected-grid button must use the existing `menuSelected` variant; all other enabled month buttons use `menu`. The `Tất cả` button calls `onApplyMonthFilter(null)` then closes. Keep `onOpenChange={setIsOpen}` so Escape and outside interaction work normally.

- [ ] **Step 4: Run targeted tests to verify the implementation passes**

Run:

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web test src/components/filters/MonthPicker.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Format and typecheck**

Run:

```bash
node .yarn/releases/yarn-4.17.1.cjs oxfmt packages/desktop-client/src/components/filters/MonthPicker.tsx packages/desktop-client/src/components/filters/MonthPicker.test.tsx
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web typecheck
```

Expected: formatter succeeds and strict typecheck reports all files passed.

- [ ] **Step 6: Commit the implementation**

```bash
git add packages/desktop-client/src/components/filters/MonthPicker.tsx packages/desktop-client/src/components/filters/MonthPicker.test.tsx
git commit -m "feat: replace month menu with grid picker"
```

- [ ] **Step 7: Run final web verification**

Run:

```bash
node .yarn/releases/yarn-4.17.1.cjs workspace @actual-app/web test
node .yarn/releases/yarn-4.17.1.cjs build:browser
```

Expected: web test suite has zero failures and browser production build succeeds.
