import { describe, expect, test } from 'vitest';

import {
  DEFAULT_CATEGORY_ICON_KEY,
  isCategoryIconKey,
  resolveCategoryIconKey,
} from './category-icons';

describe('category icons', () => {
  test('accepts supported semantic keys', () => {
    expect(isCategoryIconKey('restaurant')).toBe(true);
    expect(isCategoryIconKey('home')).toBe(true);
  });

  test('rejects unsupported keys and resolves fallback', () => {
    expect(isCategoryIconKey('not-a-real-icon')).toBe(false);
    expect(resolveCategoryIconKey(undefined)).toBe(DEFAULT_CATEGORY_ICON_KEY);
  });
});
