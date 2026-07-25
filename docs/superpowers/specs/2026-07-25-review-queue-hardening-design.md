# Review Queue hardening

## Goal
Finish the existing `/review` prototype in the Actual Budget fork so bank-webhook transactions can be reviewed quickly and manual transactions can be added from the same page. This is a hardening pass, not a new workflow.

## Scope
- Keep the existing `/review` route and sidebar item.
- Keep the inline Quick Add form at the top of the page. Required fields are amount, account, and date; manually added transactions are created with `cleared=true`.
- List all transactions where `cleared=false`, including date, account, amount, payee, category, and raw notification notes.
- Per queued transaction: edit category, set a transfer payee, approve by only setting `cleared=true`, or delete.
- Replace prototype-specific UI, Vietnamese literals, browser alerts, and ad-hoc mutation handling with Actual’s established components, translation, validation, async feedback, and responsive layout patterns.
- Add focused automated coverage for the transaction mutations and review-page behaviors that can be tested within the project’s conventions.

## Non-goals
- No gold, credit-card, stock, installment, or other asset-management logic.
- No new review workflow, bulk-review operation, automatic category assignment, or forced edit-before-approve flow.
- The Android spending widget is separate follow-up work; it will eventually deep-link to `/review`.

## Data flow
1. The personal-finance webhook creates bank transactions with `cleared=false`.
2. The Review Queue queries and displays those transactions.
3. Category and transfer selections issue supported transaction updates immediately.
4. Approve only sets `cleared=true`; delete removes the transaction.
5. Quick Add validates its fields, creates a cleared transaction, then resets its form while preserving the page.

## Error handling and testing
Mutation controls are disabled while their request is pending and show inline failure feedback. Quick Add reports validation and submission errors inline. Tests will cover payload construction and the principal success/error states, alongside typecheck and relevant package tests.
