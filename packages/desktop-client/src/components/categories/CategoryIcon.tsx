import React from 'react';

import { SvgHome, SvgLocationShopping, SvgShoppingCart } from '@actual-app/components/icons/v1';
import { resolveCategoryIconKey } from '@actual-app/core/shared/category-icons';

export function CategoryIcon({ icon, size = 16 }: { icon?: string | null; size?: number }) {
  const props = { width: size, height: size, 'aria-label': `Category icon: ${resolveCategoryIconKey(icon)}` };
  switch (resolveCategoryIconKey(icon)) {
    case 'home': return <SvgHome {...props} />;
    case 'shopping_cart': return <SvgShoppingCart {...props} />;
    case 'shopping_bag': return <SvgLocationShopping {...props} />;
    default: return <SvgLocationShopping {...props} />;
  }
}
