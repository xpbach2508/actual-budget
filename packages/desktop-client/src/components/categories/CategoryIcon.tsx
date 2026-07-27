import React from 'react';

import {
  SvgAirplane, SvgCreditCard, SvgEducation, SvgFilm, SvgGift, SvgHeart,
  SvgHome, SvgLocationFood, SvgLocationGasStation, SvgLocationHotel,
  SvgLocationShopping, SvgMoneyBag, SvgMusicNotes, SvgPhone, SvgPiggyBank,
  SvgShoppingCart, SvgTravel, SvgTravelCar, SvgUserGroup, SvgCoffee, SvgBolt,
  SvgToolsCopy, SvgWallet, SvgChart,
} from '@actual-app/components/icons/v1';
import { resolveCategoryIconKey } from '@actual-app/core/shared/category-icons';
import { resolveCategoryColorKey, type CategoryColorKey } from '@actual-app/core/shared/category-colors';

const COLORS: Record<CategoryColorKey, { icon: string; background: string }> = {
  teal: { icon: '#087C7D', background: '#E1F4F1' }, purple: { icon: '#7654D6', background: '#F0EAFE' },
  orange: { icon: '#E87032', background: '#FFF0E8' }, yellow: { icon: '#D39B12', background: '#FFF8DD' },
  blue: { icon: '#3C8FD8', background: '#E8F3FF' }, pink: { icon: '#D94891', background: '#FDEBF5' },
  green: { icon: '#3AA66B', background: '#E8F7EE' }, red: { icon: '#D95656', background: '#FDECEC' },
};

export function CategoryIcon({ icon, color, size = 16 }: { icon?: string | null; color?: string | null; size?: number }) {
  const key = resolveCategoryIconKey(icon);
  const palette = COLORS[resolveCategoryColorKey(color)];
  const props = { width: size, height: size, 'aria-label': `Category icon: ${key}`, style: { color: palette.icon } };
  let glyph: React.ReactNode;
  switch (key) {
    case 'restaurant': case 'local_grocery_store': glyph = <SvgLocationFood {...props} />; break;
    case 'coffee': case 'local_cafe': glyph = <SvgCoffee {...props} />; break;
    case 'shopping_cart': glyph = <SvgShoppingCart {...props} />; break;
    case 'shopping_bag': case 'shopping_basket': case 'checkroom': case 'clothing': case 'cosmetics': glyph = <SvgLocationShopping {...props} />; break;
    case 'home': case 'cleaning_services': glyph = <SvgHome {...props} />; break;
    case 'directions_car': case 'flight': case 'public': glyph = <SvgTravelCar {...props} />; break;
    case 'local_gas_station': glyph = <SvgLocationGasStation {...props} />; break;
    case 'medical_services': case 'local_hospital': glyph = <SvgHeart {...props} />; break;
    case 'volunteer_activism': case 'people': case 'heart': case 'elderly': glyph = <SvgUserGroup {...props} />; break;
    case 'school': case 'child_care': glyph = <SvgEducation {...props} />; break;
    case 'repair': case 'build': glyph = <SvgToolsCopy {...props} />; break;
    case 'subscriptions': case 'payments': case 'receipt_long': case 'security': glyph = <SvgCreditCard {...props} />; break;
    case 'savings': glyph = <SvgPiggyBank {...props} />; break;
    case 'account_balance': case 'work': glyph = <SvgWallet {...props} />; break;
    case 'income': glyph = <SvgMoneyBag {...props} />; break;
    case 'profit': glyph = <SvgChart {...props} />; break;
    case 'phone_iphone': case 'wifi': glyph = <SvgPhone {...props} />; break;
    case 'electric_bolt': glyph = <SvgBolt {...props} />; break;
    case 'movie': glyph = <SvgFilm {...props} />; break;
    case 'music_note': glyph = <SvgMusicNotes {...props} />; break;
    case 'celebration': case 'card_giftcard': glyph = <SvgGift {...props} />; break;
    case 'hotel': glyph = <SvgLocationHotel {...props} />; break;
    default: glyph = <SvgChart {...props} />;
  }
  return <span aria-label={`Category color: ${resolveCategoryColorKey(color)}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size + 8, height: size + 8, borderRadius: 5, backgroundColor: palette.background }}>{glyph}</span>;
}
