import React from 'react';

import {
  SvgAirplane, SvgCreditCard, SvgEducation, SvgFilm, SvgGift, SvgHeart,
  SvgHome, SvgLocationFood, SvgLocationGasStation, SvgLocationHotel,
  SvgLocationShopping, SvgMoneyBag, SvgMusicNotes, SvgPhone, SvgPiggyBank,
  SvgShoppingCart, SvgTravel, SvgTravelCar, SvgUserGroup, SvgCoffee, SvgBolt,
  SvgToolsCopy, SvgWallet, SvgChart,
} from '@actual-app/components/icons/v1';
import { resolveCategoryIconKey } from '@actual-app/core/shared/category-icons';

export function CategoryIcon({ icon, size = 16 }: { icon?: string | null; size?: number }) {
  const props = { width: size, height: size, 'aria-label': `Category icon: ${resolveCategoryIconKey(icon)}` };
  switch (resolveCategoryIconKey(icon)) {
    case 'restaurant': case 'local_grocery_store': return <SvgLocationFood {...props} />;
    case 'coffee': case 'local_cafe': return <SvgCoffee {...props} />;
    case 'shopping_cart': return <SvgShoppingCart {...props} />;
    case 'shopping_bag': case 'shopping_basket': return <SvgLocationShopping {...props} />;
    case 'checkroom': case 'clothing': case 'cosmetics': return <SvgLocationShopping {...props} />;
    case 'home': case 'cleaning_services': return <SvgHome {...props} />;
    case 'directions_car': case 'local_gas_station': return icon === 'local_gas_station' ? <SvgLocationGasStation {...props} /> : <SvgTravelCar {...props} />;
    case 'medical_services': case 'local_hospital': return <SvgHeart {...props} />;
    case 'volunteer_activism': case 'people': case 'heart': case 'elderly': return <SvgUserGroup {...props} />;
    case 'school': case 'child_care': return <SvgEducation {...props} />;
    case 'repair': case 'build': return <SvgToolsCopy {...props} />;
    case 'flight': case 'public': return <SvgAirplane {...props} />;
    case 'subscriptions': case 'payments': case 'receipt_long': case 'security': return <SvgCreditCard {...props} />;
    case 'savings': return <SvgPiggyBank {...props} />;
    case 'account_balance': return <SvgWallet {...props} />;
    case 'income': return <SvgMoneyBag {...props} />;
    case 'profit': return <SvgChart {...props} />;
    case 'phone_iphone': case 'wifi': return <SvgPhone {...props} />;
    case 'electric_bolt': return <SvgBolt {...props} />;
    case 'water_drop': return <SvgTravel {...props} />;
    case 'fitness_center': case 'sports_soccer': return <SvgTravel {...props} />;
    case 'movie': return <SvgFilm {...props} />;
    case 'music_note': return <SvgMusicNotes {...props} />;
    case 'celebration': case 'card_giftcard': return <SvgGift {...props} />;
    case 'work': return <SvgWallet {...props} />;
    case 'hotel': return <SvgLocationHotel {...props} />;
    case 'category': return <SvgChart {...props} />;
    default: return <SvgChart {...props} />;
  }
}
