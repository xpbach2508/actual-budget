# Review Queue hardening

## Goal

Finish the existing `/review` prototype in the Actual Budget fork so bank-webhook transactions can be reviewed quickly and manual transactions can be added from the same page. This is a hardening pass, not a new workflow.

## Scope

- Keep the existing `/review` route and sidebar item.
- Keep the inline Quick Add form at the top of the page. Required fields are amount, account, and date; manually added transactions are created with `cleared=true`. Replace its free-text date field with Actual’s `DateSelect`, defaulted to the current day. Replace the Payee dropdown with Actual’s `PayeeAutocomplete`: it filters existing payees as the user types and requires an explicit “Create payee” selection before creating a missing payee.
- List transactions where `cleared=false`, including date, account, amount, payee, category, and raw notification notes. Load the newest 50 initially; load the next 50 when scrolling near the end; after approval or deletion, refill the visible list to 50 when more queued transactions exist.
- Per queued transaction: edit category, set a transfer payee, approve by only setting `cleared=true`, or delete.
- Replace prototype-specific UI, Vietnamese literals, emoji icons, browser alerts, and ad-hoc mutation handling with Actual’s established components, translation, validation, async feedback, and responsive layout patterns. Use the fork’s existing SVG icon set for a Lucide/shadcn-like visual style; do not add shadcn as a dependency.
- Add focused automated coverage for the transaction mutations and review-page behaviors that can be tested within the project’s conventions.
- Configure the Actual Docker Compose service with `TZ=Asia/Ho_Chi_Minh` so container-rendered time is GMT+7. Do not change the image-wide default timezone or mount the host timezone file.

## Non-goals

- No gold, credit-card, stock, installment, or other asset-management logic.
- No new review workflow, bulk-review operation, automatic category assignment, or forced edit-before-approve flow.
- The Android spending widget is separate follow-up work; it will eventually deep-link to `/review`.

## Data flow

1. The personal-finance webhook creates bank transactions with `cleared=false`.
2. The Review Queue queries the newest 50 queued transactions and appends batches of 50 as the user scrolls near the end.
3. Category and transfer selections issue supported transaction updates immediately.
4. Approve only sets `cleared=true`; delete removes the transaction. The query refills the visible list to 50 when a row disappears and more queued transactions remain.
5. Quick Add opens Actual’s date picker from its date field, validates its fields, creates a cleared transaction, then resets its form to the current day while preserving the page.
6. Docker Compose supplies `TZ=Asia/Ho_Chi_Minh` to the Actual service; redeploying the service changes its runtime timezone from UTC to GMT+7.

## Error handling and testing

Mutation controls are disabled while their request is pending and show inline failure feedback. Quick Add reports validation and submission errors inline. After a successful Quick Add or approval mutation resolves, Actual shows a success toast so the user knows the server accepted the update. Tests will cover payload construction and the principal success/error states, alongside typecheck and relevant package tests.
