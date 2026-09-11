import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AssetAllocationWidget } from '@actual-app/core/types/models';

import { EditablePageHeaderTitle } from '#components/EditablePageHeaderTitle';
import { FinancialText } from '#components/FinancialText';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '#components/Page';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { useAssetAllocation } from '#hooks/useAssetAllocation';
import { useDashboardWidget } from '#hooks/useDashboardWidget';
import { useFormat } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { useUpdateDashboardWidgetMutation } from '#reports/mutations';

import { AssetAllocationGraph } from '../graphs/AssetAllocationGraph';

export function AssetAllocation() {
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const format = useFormat();
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();

  const { data: widget, isLoading: isWidgetLoading } =
    useDashboardWidget<AssetAllocationWidget>({
      id: params.id,
      type: 'asset-allocation-card',
    });

  const updateDashboardWidgetMutation = useUpdateDashboardWidgetMutation();

  const [name, setName] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'subtype' | 'account'>('subtype');
  const [showDebts, setShowDebts] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState(false);

  // Sync state once widget loads
  React.useEffect(() => {
    if (widget?.meta) {
      if (widget.meta.name) setName(widget.meta.name);
      if (widget.meta.groupBy) setGroupBy(widget.meta.groupBy);
      if (widget.meta.showDebts !== undefined) setShowDebts(widget.meta.showDebts);
    }
  }, [widget]);

  const { valuations, slices, totalAssets, totalDebts, netWorth, isLoading } =
    useAssetAllocation({
      groupBy,
      showDebts,
    });

  const currentTitle = name || widget?.meta?.name || t('Asset allocation');

  const onSaveWidget = () => {
    if (!widget) return;
    updateDashboardWidgetMutation.mutate({
      widget: {
        id: widget.id,
        meta: {
          ...widget.meta,
          name: name ?? widget.meta?.name,
          groupBy,
          showDebts,
        },
      },
    });
    setIsDirty(false);
    dispatch(
      addNotification({
        notification: {
          type: 'message',
          message: t('Dashboard widget successfully updated.'),
        },
      }),
    );
  };

  if (isWidgetLoading || isLoading) {
    return <LoadingIndicator />;
  }

  const topSlice = slices.length > 0 ? slices[0] : null;

  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader
            title={currentTitle}
            leftContent={
              <MobileBackButton
                onPress={() => navigate('/reports')}
              />
            }
          />
        ) : (
          <PageHeader
            title={
              <EditablePageHeaderTitle
                title={currentTitle}
                onSave={newName => {
                  setName(newName);
                  setIsDirty(true);
                }}
              />
            }
          />
        )
      }
    >
      {/* Top action toolbar */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          backgroundColor: theme.pageBackground,
          borderBottom: `1px solid ${theme.tableBorder}`,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* Group By selector */}
          <View
            style={{
              flexDirection: 'row',
              borderRadius: 6,
              backgroundColor: theme.pillBackground,
              padding: 2,
            }}
          >
            <Button
              variant={groupBy === 'subtype' ? 'normal' : 'bare'}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: groupBy === 'subtype' ? 600 : 400,
                backgroundColor:
                  groupBy === 'subtype'
                    ? theme.pillBackgroundSelected
                    : 'transparent',
              }}
              onPress={() => {
                setGroupBy('subtype');
                setIsDirty(true);
              }}
            >
              {t('By asset type')}
            </Button>
            <Button
              variant={groupBy === 'account' ? 'normal' : 'bare'}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: groupBy === 'account' ? 600 : 400,
                backgroundColor:
                  groupBy === 'account'
                    ? theme.pillBackgroundSelected
                    : 'transparent',
              }}
              onPress={() => {
                setGroupBy('account');
                setIsDirty(true);
              }}
            >
              {t('By account')}
            </Button>
          </View>

          {/* Show debts toggle */}
          <Button
            variant={showDebts ? 'normal' : 'bare'}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              border: `1px solid ${theme.buttonNormalBorder}`,
            }}
            onPress={() => {
              setShowDebts(!showDebts);
              setIsDirty(true);
            }}
          >
            {showDebts ? t('Hide debts') : t('Include debts')}
          </Button>
        </View>

        {widget && isDirty && (
          <Button variant="primary" onPress={onSaveWidget}>
            <Trans>Save widget</Trans>
          </Button>
        )}
      </View>

      <View
        style={{
          backgroundColor: theme.tableBackground,
          padding: isNarrowWidth ? 12 : 24,
          flex: '1 0 auto',
          overflowY: 'auto',
          gap: 20,
        }}
      >
        {/* Metric summary cards */}
        <View
          style={{
            flexDirection: 'row',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {/* Total assets */}
          <View
            style={{
              flex: '1 1 200px',
              padding: 16,
              borderRadius: 8,
              backgroundColor: theme.cardBackground,
              border: `1px solid ${theme.cardBorder}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: theme.pageTextSubdued,
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {t('Total assets')}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: theme.noticeTextLight,
              }}
            >
              <PrivacyFilter>
                <FinancialText>
                  {format(totalAssets, 'financial')}
                </FinancialText>
              </PrivacyFilter>
            </div>
          </View>

          {/* Net worth */}
          <View
            style={{
              flex: '1 1 200px',
              padding: 16,
              borderRadius: 8,
              backgroundColor: theme.cardBackground,
              border: `1px solid ${theme.cardBorder}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: theme.pageTextSubdued,
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {t('Net Worth')}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: netWorth >= 0 ? theme.pageText : theme.errorText,
              }}
            >
              <PrivacyFilter>
                <FinancialText>
                  {format(netWorth, 'financial')}
                </FinancialText>
              </PrivacyFilter>
            </div>
          </View>

          {/* Debts */}
          {totalDebts < 0 && (
            <View
              style={{
                flex: '1 1 200px',
                padding: 16,
                borderRadius: 8,
                backgroundColor: theme.cardBackground,
                border: `1px solid ${theme.cardBorder}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: theme.pageTextSubdued,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {t('Total debt')}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: theme.errorText,
                }}
              >
                <PrivacyFilter>
                  <FinancialText>
                    {format(totalDebts, 'financial')}
                  </FinancialText>
                </PrivacyFilter>
              </div>
            </View>
          )}

          {/* Top holding */}
          {topSlice && (
            <View
              style={{
                flex: '1 1 200px',
                padding: 16,
                borderRadius: 8,
                backgroundColor: theme.cardBackground,
                border: `1px solid ${theme.cardBorder}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: theme.pageTextSubdued,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {t('Largest asset class')}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: theme.pageText,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {topSlice.icon && <span>{topSlice.icon}</span>}
                <span>{topSlice.name}</span>
                <span
                  style={{
                    fontSize: 13,
                    color: topSlice.color,
                    fontWeight: 700,
                  }}
                >
                  ({topSlice.percent.toFixed(1)}%)
                </span>
              </div>
            </View>
          )}
        </View>

        {/* Large Chart Card */}
        <View
          style={{
            padding: 20,
            borderRadius: 8,
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: theme.pageText,
              marginBottom: 16,
            }}
          >
            {groupBy === 'subtype'
              ? t('Asset Allocation by Category')
              : t('Asset Allocation by Account')}
          </div>
          <AssetAllocationGraph
            slices={slices}
            totalAssets={totalAssets}
            showLegend
            compact={false}
          />
        </View>

        {/* Detailed Breakdown Table */}
        <View
          style={{
            borderRadius: 8,
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              fontSize: 15,
              fontWeight: 600,
              color: theme.pageText,
              borderBottom: `1px solid ${theme.tableBorder}`,
              backgroundColor: theme.tableHeaderBackground,
            }}
          >
            {t('Detailed Asset Breakdown')}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${theme.tableBorder}`,
                    color: theme.pageTextSubdued,
                  }}
                >
                  <th style={{ padding: '10px 16px' }}>{t('Account / Asset')}</th>
                  <th style={{ padding: '10px 16px' }}>{t('Type')}</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>
                    {t('Ledger balance')}
                  </th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>
                    {t('Valuation adjustment')}
                  </th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>
                    {t('Current value')}
                  </th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>
                    {t('Allocation')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {valuations.map(val => {
                  const share =
                    totalAssets > 0 && val.effectiveBalance > 0
                      ? (val.effectiveBalance / totalAssets) * 100
                      : 0;

                  return (
                    <tr
                      key={val.id}
                      style={{
                        borderBottom: `1px solid ${theme.tableBorder}`,
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span>{val.icon}</span>
                          <span>{val.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 10,
                            backgroundColor: theme.pillBackground,
                            color: theme.pillText,
                          }}
                        >
                          {val.subtypeName}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <PrivacyFilter>
                          <FinancialText>
                            {format(val.ledgerBalance, 'financial')}
                          </FinancialText>
                        </PrivacyFilter>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {val.virtualAdjustment !== 0 ? (
                          <PrivacyFilter>
                            <FinancialText
                              style={{
                                color:
                                  val.virtualAdjustment > 0
                                    ? theme.noticeTextLight
                                    : theme.errorText,
                              }}
                            >
                              {(val.virtualAdjustment > 0 ? '+' : '') +
                                format(val.virtualAdjustment, 'financial')}
                            </FinancialText>
                          </PrivacyFilter>
                        ) : (
                          <span style={{ color: theme.pageTextSubdued }}>-</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontWeight: 600,
                        }}
                      >
                        <PrivacyFilter>
                          <FinancialText>
                            {format(val.effectiveBalance, 'financial')}
                          </FinancialText>
                        </PrivacyFilter>
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color:
                            share > 0
                              ? theme.noticeTextLight
                              : theme.pageTextSubdued,
                        }}
                      >
                        {share > 0 ? `${share.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </View>
      </View>
    </Page>
  );
}
