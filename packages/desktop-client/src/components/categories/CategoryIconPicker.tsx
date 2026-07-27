import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { View } from '@actual-app/components/view';
import { CATEGORY_ICON_KEYS, type CategoryIconKey } from '@actual-app/core/shared/category-icons';


export function CategoryIconPicker({ value, onSelect, onClear }: { value?: string | null; onSelect: (icon: CategoryIconKey) => void; onClear: () => void }) {
  const [query, setQuery] = useState('');
  const icons = useMemo(() => CATEGORY_ICON_KEYS.filter(icon => icon.includes(query.toLowerCase())), [query]);
  return createPortal(<View role="dialog" aria-label="Choose category icon" style={{ position: 'fixed', zIndex: 100000, top: '20%', left: '50%', transform: 'translateX(-50%)', width: 300, padding: 14, backgroundColor: '#003336', color: 'white', borderRadius: 10, boxShadow: '0 8px 28px #0008' }}>
    <input autoFocus aria-label="Search icons" placeholder="Search icons" value={query} onChange={e => setQuery(e.target.value)} style={{ width: '100%', marginBottom: 8, padding: 8, color: '#003336', backgroundColor: 'white', borderRadius: 4 }} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, maxHeight: 240, overflow: 'auto' }}>{icons.map(icon => <button key={icon} type="button" aria-label={icon} onClick={() => onSelect(icon)} style={{ minWidth: 88, minHeight: 34, padding: 5, color: 'white', background: value === icon ? '#8f43e8' : '#14565a', border: '1px solid #6fa9a8', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>{icon.replaceAll('_', ' ')}</button>)}</View>
    <button type="button" onClick={onClear} style={{ marginTop: 10, padding: 6, color: 'white', background: 'transparent', border: '1px solid #6fa9a8', borderRadius: 5 }}>Default</button>
  </View>, document.body);
}
