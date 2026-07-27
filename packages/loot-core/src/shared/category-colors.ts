export const CATEGORY_COLOR_KEYS = [
  'teal', 'purple', 'orange', 'yellow', 'blue', 'pink', 'green', 'red',
] as const;

export type CategoryColorKey = (typeof CATEGORY_COLOR_KEYS)[number];
export const DEFAULT_CATEGORY_COLOR_KEY = 'teal' as const;

export function isCategoryColorKey(value: unknown): value is CategoryColorKey {
  return typeof value === 'string' && (CATEGORY_COLOR_KEYS as readonly string[]).includes(value);
}

export function resolveCategoryColorKey(value: unknown): CategoryColorKey {
  return isCategoryColorKey(value) ? value : DEFAULT_CATEGORY_COLOR_KEY;
}
