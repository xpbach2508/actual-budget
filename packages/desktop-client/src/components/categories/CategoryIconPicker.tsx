import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { View } from '@actual-app/components/view';
import { CATEGORY_ICON_KEYS, type CategoryIconKey } from '@actual-app/core/shared/category-icons';
import { CATEGORY_COLOR_KEYS, type CategoryColorKey } from '@actual-app/core/shared/category-colors';


export function CategoryIconPicker({ value, color, onSave, onClose }: { value?: string | null; color?: string | null; onSave: (icon: CategoryIconKey | null, color: CategoryColorKey | null) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<CategoryIconKey | null>((value as CategoryIconKey) ?? null);
  const [selectedColor, setSelectedColor] = useState<CategoryColorKey | null>((color as CategoryColorKey) ?? null);
  const icons = useMemo(() => CATEGORY_ICON_KEYS.filter(icon => icon.includes(query.toLowerCase())), [query]);
  return createPortal(<View role="dialog" aria-label="Choose category icon" style={{ position: 'fixed', zIndex: 100000, top: '20%', left: '50%', transform: 'translateX(-50%)', width: 300, padding: 14, backgroundColor: '#003336', color: 'white', borderRadius: 10, boxShadow: '0 8px 28px #0008' }}>
    <input autoFocus aria-label="Search icons" placeholder="Search icons" value={query} onChange={e => setQuery(e.target.value)} style={{ width: '100%', marginBottom: 8, padding: 8, color: '#003336', backgroundColor: 'white', borderRadius: 4 }} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, maxHeight: 240, overflow: 'auto' }}>{icons.map(icon => <button key={icon} type="button" aria-label={icon} onClick={() => setSelectedIcon(icon)} style={{ minWidth: 88, minHeight: 34, padding: 5, color: 'white', background: selectedIcon === icon ? '#8f43e8' : '#14565a', border: '1px solid #6fa9a8', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>{icon.replaceAll('_', ' ')}</button>)}</View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>{CATEGORY_COLOR_KEYS.map(colorKey => <button type="button" key={colorKey} aria-label={colorKey} onClick={() => setSelectedColor(colorKey)} style={{ width: 24, height: 24, borderRadius: 12, border: selectedColor === colorKey ? '3px solid white' : '1px solid #6fa9a8', background: colorKey === 'purple' ? '#7654D6' : colorKey === 'orange' ? '#E87032' : colorKey === 'yellow' ? '#D39B12' : colorKey === 'blue' ? '#3C8FD8' : colorKey === 'pink' ? '#D94891' : colorKey === 'green' ? '#3AA66B' : colorKey === 'red' ? '#D95656' : '#087C7D' }} />)}</View>
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}><button type="button" onClick={() => { setSelectedIcon(null); setSelectedColor(null); }} style={{ padding: 6, color: 'white', background: 'transparent', border: '1px solid #6fa9a8', borderRadius: 5 }}>Default</button><button type="button" onClick={() => { onSave(selectedIcon, selectedColor); onClose(); }} style={{ padding: 6, color: '#003336', background: '#E1F4F1', border: 'none', borderRadius: 5, fontWeight: 700 }}>Save</button><button type="button" onClick={onClose} style={{ padding: 6, color: 'white', background: 'transparent', border: '1px solid #6fa9a8', borderRadius: 5 }}>Cancel</button></View>
  </View>, document.body);
}
