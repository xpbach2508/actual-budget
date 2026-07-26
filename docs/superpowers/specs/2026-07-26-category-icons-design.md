# Category Icons Design

## Goal
Give each Actual category an optional, user-selected semantic Material icon key. Render it before category names in the budget and transaction category selector, and carry the same icon into the Android Spending Widget category page.

## Stored data and sync

Add optional `icon` to the Actual category entity and CRDT schema. The value is a Material icon key from a finite allowlist, such as `restaurant`, `home`, and `shopping_cart`.

- Existing categories and unknown/missing keys render the `category` fallback icon.
- The field is nullable and migration-safe for existing budgets.
- Category updates validate the allowlist server-side before persisting, so all synced clients receive only known semantic keys.
- The category entity remains the source of truth; icons are not duplicated by category name or account.

## Actual UI

### Budget
Render an 18–20px icon before each category name on `/budget`, including expense and income categories.

### Category menu
The category menu exposes the current icon as an icon button. It opens an accessible modal with search, a compact grid of 40–60 finance/common Material icons, and a **Default** action that clears the stored icon. Selecting an icon persists it immediately.

### Transaction category selection
`CategoryAutocomplete` renders the resolved icon before every category suggestion and beside the selected category. Split, transfer, and unassigned pseudo-items retain their existing presentation.

The first release does not add icons to transaction history, reports, or other category-name occurrences.

## Android widget contract

`GET /widget/summary` extends each `top_categories` item with nullable `icon_key` sourced from the Actual category. The Android DTO and cached snapshot retain it.

The Android widget maps every allowlisted key to an app vector drawable. Missing/unknown keys use the generic category vector. On its Categories page, the icon appears before each top-category name.

## Validation and verification

- Actual migration/schema tests cover old categories, valid writes, rejected unknown keys, and sync.
- Desktop tests cover Budget, category-menu selection/default reset, and transaction autocomplete rendering.
- Widget server tests cover `icon_key` serialization; Android tests cover DTO/snapshot parsing and known/unknown drawable resolution.
- Manual test: choose an icon on `/budget`, verify it syncs, appears in transaction category selection, and appears after Android widget refresh.
