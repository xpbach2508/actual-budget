# Synced Category Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store one custom Material icon key per Actual category and display it in Budget, transaction category selection, and Android widget category rows.

**Architecture:** Actual category records own the nullable semantic icon key and sync it through the existing CRDT category table. A shared allowlist resolves keys to web SVGs and Android vector drawables. The widget summary sends the category key alongside each aggregate category.

**Tech Stack:** TypeScript, Actual AQL/SQLite/CRDT, React, Pydantic/actualpy, Kotlin RemoteViews, Robolectric.

## Global Constraints

- Category `icon` is nullable; missing/unknown values render the `category` fallback.
- Persist only allowlisted semantic Material keys; never store emoji or SVG markup in the database.
- v1 UI scope is `/budget`, Category menu picker, `CategoryAutocomplete`, and Android widget Categories page.
- Do not expose transactions or credentials in the widget API.

---

### Task 1: Add a synced, validated category icon field

**Repository:** `actual-budget`

**Files:**
- Modify: `packages/loot-core/src/types/models/category.ts`
- Modify: `packages/loot-core/src/server/db/types/index.ts`
- Modify: `packages/loot-core/src/server/aql/schema/index.ts`
- Modify: `packages/loot-core/src/server/api-models.ts`
- Modify: `packages/loot-core/src/server/budget/app.ts`
- Modify: category database migration/schema files identified by `rg "CREATE TABLE categories|categories.*ALTER" packages/loot-core/migrations`
- Create: `packages/loot-core/src/shared/category-icons.ts`
- Create: `packages/loot-core/src/shared/category-icons.test.ts`

**Interfaces:**
- Produces `CATEGORY_ICON_KEYS`, `CategoryIconKey`, `DEFAULT_CATEGORY_ICON_KEY = 'category'`, and `isCategoryIconKey(value: unknown): value is CategoryIconKey`.
- Adds `icon?: CategoryIconKey | null` to `CategoryEntity` and `icon?: string | null` to `DbCategory`.

- [ ] **Step 1: Write failing allowlist tests**

```ts
expect(isCategoryIconKey('restaurant')).toBe(true);
expect(isCategoryIconKey('home')).toBe(true);
expect(isCategoryIconKey('not-a-real-icon')).toBe(false);
expect(resolveCategoryIconKey(undefined)).toBe('category');
```

- [ ] **Step 2: Run test and verify failure**

```bash
yarn workspace @actual-app/loot-core test category-icons
```

Expected: module does not exist.

- [ ] **Step 3: Add the finite key set and schema/migration**

Create a shared allowlist of 40–60 finance/common keys, including `category`, `restaurant`, `shopping_cart`, `home`, `directions_car`, `local_gas_station`, `medical_services`, `school`, `pets`, `flight`, `subscriptions`, `savings`, and `payments`. Add nullable `icon` to category Entity, DB type, AQL schema, API external model conversions, and a forward SQLite migration using `ALTER TABLE categories ADD COLUMN icon TEXT` guarded by the migration framework.

Before `db.updateCategory` in `updateCategory`, reject non-null icons failing `isCategoryIconKey` with `APIError('Invalid category icon')`.

- [ ] **Step 4: Run focused tests**

```bash
yarn workspace @actual-app/loot-core test category-icons
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/loot-core
git commit -m "feat: add synced category icon keys"
```

### Task 2: Build reusable web icon resolution and category picker

**Repository:** `actual-budget`

**Files:**
- Create: `packages/desktop-client/src/components/categories/CategoryIcon.tsx`
- Create: `packages/desktop-client/src/components/categories/CategoryIconPicker.tsx`
- Create: `packages/desktop-client/src/components/categories/categoryIcons.test.tsx`
- Modify: `packages/desktop-client/src/components/budget/SidebarCategory.tsx`
- Modify: category-menu component opened from the SidebarCategory context menu
- Modify: `packages/desktop-client/src/budget/mutations.ts`

**Interfaces:**
- `CategoryIcon({ icon, size?: number })` renders an allowlisted SVG or generic fallback.
- `CategoryIconPicker({ value, onSelect, onClear, onClose })` provides accessible search/grid selection.

- [ ] **Step 1: Write failing render and picker tests**

```tsx
render(<CategoryIcon icon="restaurant" />);
expect(screen.getByLabelText('Category icon: restaurant')).toBeVisible();

render(<CategoryIconPicker value="home" onSelect={onSelect} onClear={onClear} onClose={vi.fn()} />);
await user.click(screen.getByRole('button', { name: 'shopping_cart' }));
expect(onSelect).toHaveBeenCalledWith('shopping_cart');
```

- [ ] **Step 2: Run focused test and verify failure**

```bash
yarn workspace @actual-app/desktop-client test categoryIcons
```

Expected: missing components.

- [ ] **Step 3: Implement resolver and picker**

Use the project SVG icon component conventions. The resolver imports only allowlisted icons and maps unknown/null keys to the generic category icon. The picker is a modal with a searchable icon grid, keyboard-accessible buttons labelled by key, and a Default button invoking `onClear`.

Wire SidebarCategory to render `CategoryIcon` before `category.name`; add an Icon menu item/button that opens the picker. Selection calls `useUpdateCategoryMutation` with `{ ...category, icon }`; Default uses `{ ...category, icon: null }`.

- [ ] **Step 4: Run tests**

```bash
yarn workspace @actual-app/desktop-client test categoryIcons
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop-client/src/components/categories packages/desktop-client/src/components/budget packages/desktop-client/src/budget/mutations.ts
git commit -m "feat: select category icons in budget"
```

### Task 3: Render icons in transaction category autocomplete

**Repository:** `actual-budget`

**Files:**
- Modify: `packages/desktop-client/src/components/autocomplete/CategoryAutocomplete.tsx`
- Modify: `packages/desktop-client/src/components/transactions/TransactionsTable.test.tsx` or add `CategoryAutocomplete.test.tsx`

**Interfaces:**
- `CategoryItem` consumes `item.icon` and renders `CategoryIcon` before the category name.
- Split and `to-budget` pseudo-items keep their current special UI.

- [ ] **Step 1: Add a failing autocomplete test**

```tsx
render(<CategoryAutocomplete categoryGroups={[groupWith({ name: 'Ăn uống', icon: 'restaurant' })]} />);
expect(screen.getByLabelText('Category icon: restaurant')).toBeVisible();
```

- [ ] **Step 2: Run test and verify failure**

```bash
yarn workspace @actual-app/desktop-client test CategoryAutocomplete
```

Expected: icon is absent.

- [ ] **Step 3: Add the icon to CategoryItem layout**

Place `CategoryIcon icon={item.icon}` in the left name row with a fixed 18px width and 5px gap. Do not render it for `split` or `to-budget` pseudo-items.

- [ ] **Step 4: Run relevant tests**

```bash
yarn workspace @actual-app/desktop-client test CategoryAutocomplete TransactionsTable
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add packages/desktop-client/src/components/autocomplete packages/desktop-client/src/components/transactions
git commit -m "feat: show icons in category selection"
```

Additional completed UI work: category colors are synced and rendered as pastel icon backgrounds plus matching text colors in Budget, CategoryAutocomplete, Review Queue transaction cards, and account transaction rows. Review uses CategoryAutocomplete rather than a native Select so category suggestions retain icon/color rendering. Commits include `cabbab8b8`, `f886db804`, `becc7a100`, and `c60cf49be`.

### Task 4: Extend widget summary with the persisted category icon

**Repository:** `personal_finance`

**Files:**
- Modify: `src/bank_webhook/models.py`
- Modify: `src/bank_webhook/widget_summary.py`
- Modify: `tests/test_widget_summary.py`

**Interfaces:**
- `WidgetCategory.icon_key: str | None` serializes the Actual category `icon` field.

- [ ] **Step 1: Add a failing server test**

```python
assert summary.top_categories[0].icon_key == "restaurant"
```

Make the fake food category expose `icon="restaurant"`.

- [ ] **Step 2: Run test and verify failure**

```bash
uv run python -m pytest tests/test_widget_summary.py -v
```

Expected: `WidgetCategory` has no `icon_key`.

- [ ] **Step 3: Implement the response field**

Add `icon_key: str | None = None` to the Pydantic model and set it from `getattr(expense_categories[name], 'icon', None)`. Do not derive icons from the category name.

- [ ] **Step 4: Run tests and commit**

```bash
uv run python -m pytest tests/test_widget_summary.py -v
git add src/bank_webhook/models.py src/bank_webhook/widget_summary.py tests/test_widget_summary.py
git commit -m "feat(widget): include category icon keys"
```

### Task 5: Render widget category icon vectors

- [x] Android category icons, palette tinting, MIUI-safe progress bars, and trend/category bars are implemented and build-tested. Deployment/install remain intentionally separate.

**Repository:** `personal_finance`

**Files:**
- Modify: `android/app/src/main/java/vn/id/xpbach/banklistener/net/Dtos.kt`
- Create: `android/app/src/main/java/vn/id/xpbach/banklistener/widget/CategoryIconResolver.kt`
- Create: `android/app/src/main/res/drawable/ic_category_*.xml`
- Modify: `android/app/src/main/res/layout/widget_spending_categories.xml`
- Modify: `android/app/src/main/java/vn/id/xpbach/banklistener/widget/SpendingWidgetProvider.kt`
- Create: `android/app/src/test/java/vn/id/xpbach/banklistener/widget/CategoryIconResolverTest.kt`

**Interfaces:**
- `WidgetCategoryBody.iconKey: String?` reads JSON `icon_key`.
- `CategoryIconResolver.drawableFor(key: String?): Int` always returns a drawable resource ID.

- [ ] **Step 1: Add failing resolver/DTO tests**

```kotlin
assertEquals(R.drawable.ic_category_restaurant, CategoryIconResolver.drawableFor("restaurant"))
assertEquals(R.drawable.ic_category_default, CategoryIconResolver.drawableFor("unknown"))
```

- [ ] **Step 2: Run test and verify failure**

```bash
cd android && JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home" ./gradlew testDebugUnitTest --tests '*CategoryIconResolverTest'
```

Expected: missing DTO field/resolver.

- [ ] **Step 3: Implement Android mapping and RemoteViews rows**

Add nullable `@SerialName("icon_key") val iconKey: String?` to `WidgetCategoryBody`. Create vector drawables for every shared allowlist key (or grouped visual equivalent) plus `ic_category_default`. Update the category layout with three 20dp ImageViews (`widget_category_icon_1` through `_3`) and set each image resource through `RemoteViews.setImageViewResource` using the resolver.

- [ ] **Step 4: Run Android tests and build**

```bash
cd android && JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home" ./gradlew testDebugUnitTest assembleDebug
```

Expected: PASS and debug APK generated.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main
git commit -m "feat(android): show category icons in widget"
```

### Task 6: Cross-repo verification and deployment

- [ ] **Step 1: Run complete test suites**

```bash
cd actual-budget && yarn test
cd ../personal_finance && uv run python -m pytest -q
cd android && JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home" ./gradlew testDebugUnitTest assembleDebug
```

- [ ] **Step 2: Deploy in dependency order**

1. Push/build/deploy Actual fork so category schema and icon field exist.
2. Push/deploy `personal_finance` with the new summary field.
3. Install the generated Bank Listener APK over the existing app with `adb install -r`; it preserves settings and the cached widget snapshot.
4. Open Actual `/budget`, choose an icon, refresh the widget, and verify the same semantic icon appears in autocomplete and widget Categories.

- [ ] **Step 3: Update docs and commit**

Update the category-icon feature status and deployment notes in the relevant `TASK_BACKLOG.md`, `personal_finance/HANDOFF.md`, and deployment guide. Commit docs in their owning repositories.
