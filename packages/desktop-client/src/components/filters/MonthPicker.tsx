import React, { useState, useRef } from 'react';

import { Button } from '@actual-app/components/button';
import { SvgCalendar } from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { View } from '@actual-app/components/view';
import { format, parse, subMonths } from 'date-fns';

type MonthPickerProps = {
  activeMonthValue: string | null;
  onApplyMonthFilter: (value: string | null) => void;
};

const MONTHS_IN_FILTER_RANGE = 24;

function getAllowedMonths(now: Date) {
  return new Set(
    Array.from({ length: MONTHS_IN_FILTER_RANGE }, (_, index) =>
      format(subMonths(now, index), 'yyyy-MM'),
    ),
  );
}

function getYear(value: string | null, fallback: number) {
  return value ? parse(value, 'yyyy-MM', new Date()).getFullYear() : fallback;
}

export function MonthPicker({
  activeMonthValue,
  onApplyMonthFilter,
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const now = new Date();
  const currentYear = now.getFullYear();
  const [displayedYear, setDisplayedYear] = useState(() =>
    getYear(activeMonthValue, currentYear),
  );
  const allowedMonths = getAllowedMonths(now);
  const allowedYears = new Set(
    Array.from(allowedMonths, month => Number(month.slice(0, 4))),
  );

  const formatShortDisplay = (value: string) => {
    const date = parse(value, 'yyyy-MM', new Date());
    return `T${format(date, 'M/yyyy')}`;
  };

  const openPicker = () => {
    setDisplayedYear(getYear(activeMonthValue, currentYear));
    setIsOpen(true);
  };

  const selectMonth = (value: string | null) => {
    onApplyMonthFilter(value);
    setIsOpen(false);
  };

  return (
    <View>
      <Button
        ref={triggerRef}
        variant="bare"
        onPress={openPicker}
        style={{ padding: '6px 10px', gap: 5 }}
      >
        <SvgCalendar width={14} height={14} />
        {activeMonthValue ? formatShortDisplay(activeMonthValue) : 'Tất cả'}
      </Button>

      <Popover
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        style={{ width: 280, padding: 10 }}
      >
        <View style={{ gap: 8 }}>
          <Button variant="menu" onPress={() => selectMonth(null)}>
            Tất cả
          </Button>
          <View
            style={{
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Button
              aria-label="Năm trước"
              variant="bare"
              isDisabled={!allowedYears.has(displayedYear - 1)}
              onPress={() => setDisplayedYear(year => year - 1)}
            >
              ‹
            </Button>
            <strong>{displayedYear}</strong>
            <Button
              aria-label="Năm sau"
              variant="bare"
              isDisabled={!allowedYears.has(displayedYear + 1)}
              onPress={() => setDisplayedYear(year => year + 1)}
            >
              ›
            </Button>
          </View>
          <View
            style={{
              display: 'grid',
              gap: 4,
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            }}
          >
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const value = format(
                new Date(displayedYear, monthIndex, 1),
                'yyyy-MM',
              );
              const isEnabled = allowedMonths.has(value);
              const label = `Tháng ${monthIndex + 1}`;

              return (
                <Button
                  key={value}
                  aria-label={`${label} năm ${displayedYear}`}
                  variant={activeMonthValue === value ? 'menuSelected' : 'menu'}
                  isDisabled={!isEnabled}
                  onPress={() => {
                    if (isEnabled) {
                      selectMonth(value);
                    }
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </View>
        </View>
      </Popover>
    </View>
  );
}
