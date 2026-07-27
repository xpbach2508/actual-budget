export const DEFAULT_CATEGORY_ICON_KEY = 'category' as const;

export const CATEGORY_ICON_KEYS = [
  'category', 'restaurant', 'shopping_cart', 'home', 'directions_car',
  'local_gas_station', 'medical_services', 'school', 'pets', 'flight',
  'subscriptions', 'savings', 'payments', 'local_cafe', 'local_grocery_store',
  'shopping_bag', 'checkroom', 'phone_iphone', 'wifi', 'electric_bolt',
  'water_drop', 'fitness_center', 'sports_soccer', 'movie', 'music_note',
  'celebration', 'redeem', 'child_care', 'elderly', 'volunteer_activism',
  'card_giftcard', 'heart', 'work', 'account_balance', 'receipt_long', 'security',
  'build', 'cleaning_services', 'hotel', 'public', 'local_hospital',
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

export function isCategoryIconKey(value: unknown): value is CategoryIconKey {
  return typeof value === 'string' && (CATEGORY_ICON_KEYS as readonly string[]).includes(value);
}

export function resolveCategoryIconKey(value: unknown): CategoryIconKey {
  return isCategoryIconKey(value) ? value : DEFAULT_CATEGORY_ICON_KEY;
}
