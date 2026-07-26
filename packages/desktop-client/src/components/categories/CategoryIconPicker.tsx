import React, { useMemo, useState } from 'react';

import { Button } from '@actual-app/components/button';
import { View } from '@actual-app/components/view';
import { CATEGORY_ICON_KEYS, type CategoryIconKey } from '@actual-app/core/shared/category-icons';

import { CategoryIcon } from './CategoryIcon';

export function CategoryIconPicker({ value, onSelect, onClear }: { value?: string | null; onSelect: (icon: CategoryIconKey) => void; onClear: () => void }) {
  const [query, setQuery] = useState('');
  const icons = useMemo(() => CATEGORY_ICON_KEYS.filter(icon => icon.includes(query.toLowerCase())), [query]);
  return <View role="dialog" aria-label="Choose category icon" style={{ position: 'absolute', zIndex: 10, top: 24, left: 0, width: 260, padding: 8, backgroundColor: 'white', borderRadius: 6, boxShadow: '0 4px 16px #0004' }}>
    <input aria-label="Search icons" value={query} onChange={e => setQuery(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, maxHeight: 180, overflow: 'auto' }}>{icons.map(icon => <Button key={icon} aria-label={icon} variant={value === icon ? 'primary' : 'bare'} onPress={() => onSelect(icon)}><CategoryIcon icon={icon} /></Button>)}</View>
    <Button variant="bare" onPress={onClear}>Default</Button>
  </View>;
}
