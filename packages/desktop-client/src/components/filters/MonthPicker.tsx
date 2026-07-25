import React, { useState, useRef } from 'react';

import { Button } from '@actual-app/components/button';
import { SvgCalendar } from '@actual-app/components/icons/v1';
import { Menu, type MenuItem } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { View } from '@actual-app/components/view';
import { format, subMonths, parse } from 'date-fns';

type MonthPickerProps = {
  activeMonthValue: string | null;
  onApplyMonthFilter: (value: string | null) => void;
};

export function MonthPicker({
  activeMonthValue,
  onApplyMonthFilter,
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Generate list of the last 12 months (up to current time)
  // For standard user preference, maybe generate 24 months? Let's do 24 to be safe.
  const currentDate = new Date();
  const months = [];
  for (let i = 0; i < 24; i++) {
    const d = subMonths(currentDate, i);
    months.push(format(d, 'yyyy-MM'));
  }

  const formatDisplay = (val: string) => {
    const d = parse(val, 'yyyy-MM', new Date());
    return `Tháng ${format(d, 'M/yyyy')}`; // e.g. Tháng 7/2026
  };

  const formatShortDisplay = (val: string) => {
    const d = parse(val, 'yyyy-MM', new Date());
    return `T${format(d, 'M/yyyy')}`; // e.g. T7/2026
  };

  const menuItems: (MenuItem | typeof Menu.line)[] = [
    { name: 'all', text: 'Tất cả' },
    Menu.line,
    ...months.map(m => ({
      name: m,
      text: formatDisplay(m),
    })),
  ];

  return (
    <View>
      <Button
        ref={triggerRef}
        variant="bare"
        onPress={() => setIsOpen(true)}
        style={{ padding: '6px 10px', gap: 5 }}
      >
        <SvgCalendar width={14} height={14} />
        {activeMonthValue ? formatShortDisplay(activeMonthValue) : 'Tất cả'}
      </Button>

      <Popover
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
        style={{ width: 180, maxHeight: 350, overflowY: 'auto' }}
      >
        <Menu
          onMenuSelect={item => {
            if (item === 'all') {
              onApplyMonthFilter(null);
            } else {
              onApplyMonthFilter(item as string);
            }
            setIsOpen(false);
          }}
          items={menuItems}
        />
      </Popover>
    </View>
  );
}
