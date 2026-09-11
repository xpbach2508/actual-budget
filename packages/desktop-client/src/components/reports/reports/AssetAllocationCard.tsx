import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  AccountEntity,
  AssetAllocationWidget,
} from '@actual-app/core/types/models';

import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { useAssetAllocation } from '#hooks/useAssetAllocation';

import { AssetAllocationGraph } from '../graphs/AssetAllocationGraph';

type AssetAllocationCardProps = {
  widgetId: string;
  isEditing?: boolean;
  accounts?: AccountEntity[];
  meta?: AssetAllocationWidget['meta'];
  onMetaChange: (newMeta: AssetAllocationWidget['meta']) => void;
};

export function AssetAllocationCard({
  widgetId,
  isEditing,
  accounts,
  meta = {},
  onMetaChange,
}: AssetAllocationCardProps) {
  const { t } = useTranslation();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  const groupBy = meta?.groupBy || 'subtype';
  const showDebts = meta?.showDebts || false;

  const { slices, totalAssets, isLoading } = useAssetAllocation({
    accounts,
    groupBy,
    showDebts,
  });

  return (
    <ReportCard
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen || menuOpen}
      to={`/reports/asset-allocation/${widgetId}`}
      onRename={() => setNameMenuOpen(true)}
    >
      <View style={{ flex: 1, padding: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <ReportCardName
              name={meta?.name || t('Asset allocation')}
              isEditing={nameMenuOpen}
              onChange={newName => {
                onMetaChange({
                  ...meta,
                  name: newName,
                });
                setNameMenuOpen(false);
              }}
              onClose={() => setNameMenuOpen(false)}
            />
            <span
              style={{
                ...styles.tinyText,
                color: theme.pageTextSubdued,
                marginTop: 2,
              }}
            >
              {groupBy === 'subtype'
                ? t('By asset type')
                : t('By account')}
            </span>
          </View>

          <Button
            ref={menuTriggerRef}
            variant="bare"
            style={{
              padding: '2px 6px',
              fontSize: 11,
              color: theme.pageTextSubdued,
            }}
            onPress={() => setMenuOpen(true)}
          >
            ⚙️ {groupBy === 'subtype' ? t('Asset type') : t('Account')}
          </Button>

          <Popover
            triggerRef={menuTriggerRef}
            isOpen={menuOpen}
            onOpenChange={setMenuOpen}
          >
            <Menu
              onMenuSelect={item => {
                if (item === 'by-subtype') {
                  onMetaChange({ ...meta, groupBy: 'subtype' });
                } else if (item === 'by-account') {
                  onMetaChange({ ...meta, groupBy: 'account' });
                } else if (item === 'toggle-debts') {
                  onMetaChange({ ...meta, showDebts: !showDebts });
                }
                setMenuOpen(false);
              }}
              items={[
                {
                  name: 'by-subtype',
                  text: t('Group by asset type'),
                },
                {
                  name: 'by-account',
                  text: t('Group by individual account'),
                },
                Menu.line,
                {
                  name: 'toggle-debts',
                  text: showDebts
                    ? t('Hide debts & credit')
                    : t('Include debts & credit'),
                },
              ]}
            />
          </Popover>
        </View>

        {isLoading ? (
          <LoadingIndicator />
        ) : (
          <AssetAllocationGraph
            slices={slices}
            totalAssets={totalAssets}
            compact
            showLegend
            style={{ flex: 1 }}
          />
        )}
      </View>
    </ReportCard>
  );
}
