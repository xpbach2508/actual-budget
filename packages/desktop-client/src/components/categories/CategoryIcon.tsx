import React from 'react';

import {
  SvgAirplane, SvgCreditCard, SvgEducation, SvgFilm, SvgGift, SvgHeart,
  SvgHome, SvgLocationFood, SvgLocationGasStation, SvgLocationHotel,
  SvgLocationShopping, SvgMoneyBag, SvgMusicNotes, SvgPhone, SvgPiggyBank,
  SvgShoppingCart, SvgTravel, SvgTravelCar,
} from '@actual-app/components/icons/v1';
import { resolveCategoryIconKey } from '@actual-app/core/shared/category-icons';

export function CategoryIcon({ icon, size = 16 }: { icon?: string | null; size?: number }) {
  const props = { width: size, height: size, 'aria-label': `Category icon: ${resolveCategoryIconKey(icon)}` };
  switch (resolveCategoryIconKey(icon)) {
    case 'restaurant': case 'local_cafe': case 'local_grocery_store': return <SvgLocationFood {...props} />;
    case 'shopping_cart': return <SvgShoppingCart {...props} />;
    case 'shopping_bag': case 'checkroom': case 'redeem': return <SvgLocationShopping {...props} />;
    case 'home': case 'cleaning_services': return <SvgHome {...props} />;
    case 'directions_car': case 'local_gas_station': return icon === 'local_gas_station' ? <SvgLocationGasStation {...props} /> : <SvgTravelCar {...props} />;
    case 'medical_services': case 'local_hospital': case 'volunteer_activism': return <SvgHeart {...props} />;
    case 'school': case 'child_care': return <SvgEducation {...props} />;
    case 'pets': case 'elderly': return <SvgHeart {...props} />;
    case 'flight': case 'public': return <SvgAirplane {...props} />;
    case 'subscriptions': case 'payments': case 'receipt_long': case 'security': return <SvgCreditCard {...props} />;
    case 'savings': case 'account_balance': return <SvgPiggyBank {...props} />;
    case 'phone_iphone': case 'wifi': return <SvgPhone {...props} />;
    case 'electric_bolt': case 'water_drop': return <SvgMoneyBag {...props} />;
    case 'fitness_center': case 'sports_soccer': return <SvgTravel {...props} />;
    case 'movie': return <SvgFilm {...props} />;
    case 'music_note': return <SvgMusicNotes {...props} />;
    case 'celebration': case 'card_giftcard': return <SvgGift {...props} />;
    case 'work': case 'build': return <SvgMoneyBag {...props} />;
    case 'hotel': return <SvgLocationHotel {...props} />;
    default: return <SvgMoneyBag {...props} />;
  }
}
