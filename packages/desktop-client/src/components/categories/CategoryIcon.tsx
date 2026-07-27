import React from 'react';

import { SvgCreditCard, SvgHome, SvgLocationFood, SvgLocationGasStation, SvgPiggyBank, SvgShoppingCart, SvgTravelCar } from '@actual-app/components/icons/v1';
import { resolveCategoryIconKey } from '@actual-app/core/shared/category-icons';

export function CategoryIcon({ icon, size = 16 }: { icon?: string | null; size?: number }) {
  const props = { width: size, height: size, 'aria-label': `Category icon: ${resolveCategoryIconKey(icon)}` };
  switch (resolveCategoryIconKey(icon)) {
    case 'restaurant':
    case 'local_cafe':
    case 'local_grocery_store': return <SvgLocationFood {...props} />;
    case 'home': return <SvgHome {...props} />;
    case 'directions_car':
    case 'flight': return <SvgTravelCar {...props} />;
    case 'local_gas_station': return <SvgLocationGasStation {...props} />;
    case 'shopping_cart':
    case 'shopping_bag': return <SvgShoppingCart {...props} />;
    case 'savings': return <SvgPiggyBank {...props} />;
    case 'payments': return <SvgCreditCard {...props} />;
    default: return <SvgHome {...props} />;
  }
}
