# Review Queue Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing `/review` prototype into a reliable, translated, responsive queue for approving webhook transactions and adding cleared transactions inline.

**Architecture:** Keep the `/review` route and sidebar entry already wired in `FinancesApp.tsx` and `PrimaryButtons.tsx`. Keep UI state and rendering in `ReviewQueue.tsx`; isolate deterministic Quick Add validation and transaction-payload construction in a small utility so it has direct unit coverage. UI actions send the existing `transactions-batch-update` diff protocol and rely on the live AQL query to refresh the queue.

**Tech Stack:** React, TypeScript, React Query, Actual component library, Actual SVG icons, i18next, Vitest.

## Global Constraints

- Preserve the route `/review`, its sidebar entry, and the inline Quick Add form.
- Quick Add requires amount, account, and date and creates `cleared=true` transactions.
- Queue items are transactions whose `cleared` value is `false`; approve only sets `cleared=true`.
- Do not add shadcn or another icon dependency; use `@actual-app/components/icons`.
- All visible copy uses `Trans` or `t`; generate `packages/desktop-client/locale/en.json` with `yarn generate:i18n`.
- Do not implement automatic categorization, bulk review, gold, credit-card, stock, installment, or Android-widget logic.

---

## File structure

- Create `packages/desktop-client/src/components/review/reviewQueueUtils.ts`: typed Quick Add input validation and transaction payload construction.
- Create `packages/desktop-client/src/components/review/reviewQueueUtils.test.ts`: unit coverage for valid payloads and each required-field failure.
- Modify `packages/desktop-client/src/components/review/ReviewQueue.tsx`: replace the prototype UI and direct handlers with translated, responsive controls, pending/error state, and existing SVG icons.
- Modify `packages/desktop-client/src/components/FinancesApp.tsx` and `packages/desktop-client/src/components/sidebar/PrimaryButtons.tsx` only if lint/typecheck requires route or icon-import cleanup; preserve their existing behavior.
- Modify `packages/desktop-client/locale/en.json`: generated extraction output for Review Queue strings.

### Task 1: Test and implement Quick Add payload construction

**Files:**

- Create: `packages/desktop-client/src/components/review/reviewQueueUtils.ts`
- Create: `packages/desktop-client/src/components/review/reviewQueueUtils.test.ts`

**Interfaces:**

- Produces `buildQuickAddTransaction(input): { transaction: TransactionEntity } | { error: 'amount' | 'account' | 'date' }`.
- `ReviewQueue.tsx` consumes this function after converting the amount input with `formatAmount.fromEdit`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import { buildQuickAddTransaction } from './reviewQueueUtils';

const input = {
  id: 'transaction-id',
  amount: -125000,
  account: 'account-id',
  date: '2026-07-25',
  payee: 'payee-id',
  category: 'category-id',
};

describe('buildQuickAddTransaction', () => {
  it('creates a cleared transaction and omits optional blank values', () => {
    expect(
      buildQuickAddTransaction({ ...input, payee: '', category: '' }),
    ).toEqual({
      transaction: {
        id: 'transaction-id',
        amount: -125000,
        account: 'account-id',
        date: '2026-07-25',
        cleared: true,
      },
    });
  });

  it.each([
    [{ ...input, amount: 0 }, 'amount'],
    [{ ...input, account: '' }, 'account'],
    [{ ...input, date: '' }, 'date'],
  ] as const)('reports a missing required %s', (invalidInput, error) => {
    expect(buildQuickAddTransaction(invalidInput)).toEqual({ error });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn workspace @actual-app/web test src/components/review/reviewQueueUtils.test.ts`

Expected: FAIL because `./reviewQueueUtils` does not exist.

- [ ] **Step 3: Implement the utility**

```ts
import type { TransactionEntity } from '@actual-app/core/types/models';

type QuickAddInput = Pick<
  TransactionEntity,
  'id' | 'amount' | 'account' | 'date'
> & {
  payee: string;
  category: string;
};

type QuickAddResult =
  { transaction: TransactionEntity } | { error: 'amount' | 'account' | 'date' };

export function buildQuickAddTransaction(input: QuickAddInput): QuickAddResult {
  if (!input.amount) return { error: 'amount' };
  if (!input.account) return { error: 'account' };
  if (!input.date) return { error: 'date' };

  return {
    transaction: {
      id: input.id,
      amount: input.amount,
      account: input.account,
      date: input.date,
      cleared: true,
      ...(input.payee ? { payee: input.payee } : {}),
      ...(input.category ? { category: input.category } : {}),
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn workspace @actual-app/web test src/components/review/reviewQueueUtils.test.ts`

Expected: PASS with four passing assertions.

- [ ] **Step 5: Commit the tested utility**

```bash
git add packages/desktop-client/src/components/review/reviewQueueUtils.ts \
  packages/desktop-client/src/components/review/reviewQueueUtils.test.ts
git commit -m "test: cover review quick add payload"
```

### Task 2: Harden the Review Queue UI and mutations

**Files:**

- Modify: `packages/desktop-client/src/components/review/ReviewQueue.tsx`

**Interfaces:**

- Consumes `buildQuickAddTransaction` from `./reviewQueueUtils`.
- Sends `{ added: TransactionEntity[] }`, `{ updated: Array<Pick<TransactionEntity, 'id' | 'cleared'>> }`, or `{ deleted: Array<Pick<TransactionEntity, 'id'>> }` to `transactions-batch-update`.
- Produces a live, translated `/review` page that refreshes from `useQuery(q('transactions').filter({ cleared: false }).select('*'))`.

- [ ] **Step 1: Confirm the Quick Add validation baseline**

Keep the zero-amount test from Task 1. It proves that an empty or invalid amount cannot produce an `added` transaction diff while the component is rewritten.

- [ ] **Step 2: Run the focused test**

Run: `yarn workspace @actual-app/web test src/components/review/reviewQueueUtils.test.ts`

Expected: PASS with the valid payload and all required-field validation assertions passing.

- [ ] **Step 3: Replace the prototype implementation in `ReviewQueue.tsx`

Implement these concrete changes:

```ts
// Use translation and the existing SVG icon library.
import { Trans, useTranslation } from 'react-i18next';
import {
  SvgCheckCircle1,
  SvgNotesPaper,
  SvgArrowsSynchronize,
} from '@actual-app/components/icons/v2';
import { SvgInboxCheck, SvgTrash } from '@actual-app/components/icons/v1';

// Keep independent state for the Quick Add values, a form error string,
// and a Set<TransactionEntity['id']> of queue rows with a mutation in flight.
// Before every send(), clear the relevant error; on rejection, set a translated
// error and finally remove the id from the pending set.
```

Apply the following behavior while preserving the existing `useAccounts`, `useCategories`, `usePayeesById`, `useFormat`, and AQL query:

1. Wrap the page title in `t('Review')` and every label/button/empty/loading/error message in `Trans` or `t`; remove Vietnamese literals and all `alert()` calls.
2. Replace the emoji section labels with `SvgNotesPaper` for Quick Add, `SvgInboxCheck` for pending transactions, `SvgArrowsSynchronize` for transfer, `SvgCheckCircle1` for approve, and `SvgTrash` for delete. Give icon-only destructive controls an accessible translated `aria-label`.
3. Build Quick Add’s transaction by calling `buildQuickAddTransaction` with `uuidv4()`, `formatAmount.fromEdit(amount) ?? 0`, and the form values. Show an inline translated required-field error for the returned error key. On `send('transactions-batch-update', { added: [transaction] })` success, reset the form to blank amount/payee/category/account and `monthUtils.currentDay()`.
4. For category and transfer, send one `updated` item containing the queue transaction id and the selected `category` or `payee`. For approval, send `{ id, cleared: true }` only. For deletion, send `{ id }` only.
5. Disable the form submit while it is pending. Disable a queued row’s controls while its mutation is pending, without blocking other rows. Render the inline error above the affected form or below the affected row.
6. Use `Page`, `View`, `Button`, `Input`, `Select`, `Text`, theme tokens, flex wrapping, and minimum control widths so the layout remains usable at narrow mobile widths. Keep raw `notes` visibly associated with each queued transaction.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
yarn workspace @actual-app/web test src/components/review/reviewQueueUtils.test.ts
yarn workspace @actual-app/web typecheck
```

Expected: the utility test passes and the web workspace reports no TypeScript errors from `ReviewQueue.tsx`.

- [ ] **Step 5: Commit the hardened UI**

```bash
git add packages/desktop-client/src/components/review/ReviewQueue.tsx \
  packages/desktop-client/src/components/review/reviewQueueUtils.test.ts
git commit -m "feat: harden transaction review queue"
```

### Task 3: Generate translations and verify the integrated route

**Files:**

- Modify: `packages/desktop-client/locale/en.json`
- Verify: `packages/desktop-client/src/components/FinancesApp.tsx`
- Verify: `packages/desktop-client/src/components/sidebar/PrimaryButtons.tsx`

**Interfaces:**

- `FinancesApp.tsx` continues to render `<ReviewQueue />` at `/review`.
- `PrimaryButtons.tsx` continues to expose the translated Review navigation item with `SvgInboxCheck`.

- [ ] **Step 1: Generate the translation catalog**

Run: `yarn generate:i18n`

Expected: `packages/desktop-client/locale/en.json` contains the new Review Queue strings and no hand-maintained Vietnamese UI copy is introduced.

- [ ] **Step 2: Run code-quality verification**

Run:

```bash
yarn workspace @actual-app/web test src/components/review/reviewQueueUtils.test.ts
yarn workspace @actual-app/web typecheck
yarn lint
```

Expected: all commands exit 0. If unrelated existing working-tree failures occur, record their file paths separately and do not alter them in this task.

- [ ] **Step 3: Manually verify the mobile-first workflow**

Run: `yarn workspace @actual-app/web start:browser`

Verify in the browser:

1. `/review` is reachable from the Review sidebar item.
2. A `cleared=false` transaction shows account, amount, payee, category, raw note, SVG icons, and no emoji.
3. Changing category or transfer immediately updates its transaction.
4. Approve removes only that queue item; delete removes only that queue item.
5. Quick Add rejects blank amount/account/date inline; a valid submission creates a cleared transaction and resets the form.
6. At a narrow viewport the form and each row wrap without clipped controls.

- [ ] **Step 4: Commit translation output and integration verification changes**

```bash
git add packages/desktop-client/locale/en.json \
  packages/desktop-client/src/components/FinancesApp.tsx \
  packages/desktop-client/src/components/sidebar/PrimaryButtons.tsx
git commit -m "chore: localize review queue"
```

## Plan self-review

- Spec coverage: Tasks 1–2 cover inline Quick Add, cleared queue, category/transfer/approve/delete behavior, SVG icons, validation, pending state, errors, responsive layout, and unit coverage. Task 3 covers translation generation, route/sidebar verification, and manual mobile verification.
- Placeholder scan: no incomplete or unspecified implementation steps remain.
- Type consistency: `buildQuickAddTransaction` accepts the exact transaction fields constructed by `ReviewQueue` and returns either a `TransactionEntity` payload or one of three explicit validation keys.
