import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { Cell, Pie, PieChart, Sector, Tooltip } from 'recharts';
import type { PieSectorShapeProps } from 'recharts';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import type { AssetAllocationSlice } from '#hooks/useAssetAllocation';
import { useFormat } from '#hooks/useFormat';

type AssetAllocationGraphProps = {
  slices: AssetAllocationSlice[];
  totalAssets: number;
  showLegend?: boolean;
  compact?: boolean;
  style?: CSSProperties;
};

type TooltipPayloadItem = {
  payload: AssetAllocationSlice;
};

type AllocationTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  format: (amount: number, type?: 'financial') => string;
};

function AllocationTooltip({ active, payload, format }: AllocationTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div
        style={{
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0, 0, 0, .25)',
          backgroundColor: theme.menuBackground,
          color: theme.menuItemText,
          padding: '8px 12px',
          fontSize: 13,
          border: `1px solid ${theme.menuBorder}`,
          zIndex: 1000,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            marginBottom: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {item.icon && <span>{item.icon}</span>}
          <span>{item.name}</span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <FinancialText style={{ fontWeight: 600 }}>
            <PrivacyFilter>{format(item.value, 'financial')}</PrivacyFilter>
          </FinancialText>
          <span
            style={{
              fontWeight: 700,
              color: theme.noticeTextLight,
              backgroundColor: theme.pillBackgroundSelected,
              padding: '1px 6px',
              borderRadius: 10,
              fontSize: 11,
            }}
          >
            {item.percent.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export function AssetAllocationGraph({
  slices,
  totalAssets,
  showLegend = true,
  compact = false,
  style,
}: AssetAllocationGraphProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const animationProps = useRechartsAnimation({ animationDuration: 500 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (slices.length === 0 || totalAssets <= 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          color: theme.pageTextSubdued,
          fontSize: 14,
          gap: 8,
          ...style,
        }}
      >
        <div style={{ fontSize: 32 }}>📊</div>
        <div>{t('No asset data available')}</div>
      </View>
    );
  }

  const chartHeight = compact ? 190 : 250;

  return (
    <View style={{ flex: 1, flexDirection: 'column', ...style }}>
      <Container style={{ height: chartHeight, position: 'relative' }}>
        {(width, height) => {
          const minDim = Math.min(width, height);
          const innerRadius = minDim * 0.26;
          const outerRadius = minDim * 0.40;

          return (
            <div
              style={{
                width,
                height,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PieChart width={width} height={height}>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  cx={width / 2}
                  cy={height / 2}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  startAngle={90}
                  endAngle={-270}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  shape={(props: PieSectorShapeProps) => {
                    const { index } = props;
                    const item = slices[index];
                    const fill = item?.color ?? props.fill;
                    const isHovered = activeIndex === index;

                    if (isHovered) {
                      return (
                        <Sector
                          {...props}
                          innerRadius={Math.max(0, innerRadius - 3)}
                          outerRadius={outerRadius + 4}
                          fill={fill}
                          style={{
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
                          }}
                        />
                      );
                    }
                    return <Sector {...props} fill={fill} />;
                  }}
                  {...animationProps}
                >
                  {slices.map(slice => (
                    <Cell key={slice.id} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={<AllocationTooltip format={format} />}
                  isAnimationActive={false}
                />
              </PieChart>

              {/* Center Total Assets Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  maxWidth: innerRadius * 1.8,
                }}
              >
                <div
                  style={{
                    fontSize: compact ? 11 : 12,
                    color: theme.pageTextSubdued,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {t('Total assets')}
                </div>
                <div
                  style={{
                    fontSize: compact ? 15 : 18,
                    fontWeight: 700,
                    color: theme.pageText,
                    marginTop: 2,
                    lineHeight: 1.2,
                  }}
                >
                  <FinancialText>
                    <PrivacyFilter>
                      {format(totalAssets, 'financial')}
                    </PrivacyFilter>
                  </FinancialText>
                </div>
              </div>
            </div>
          );
        }}
      </Container>

      {/* Legend list */}
      {showLegend && (
        <View
          style={{
            padding: '4px 8px 8px 8px',
            gap: 6,
            maxHeight: compact ? 120 : 180,
            overflowY: 'auto',
          }}
        >
          {slices.map((slice, index) => {
            const isSelected = activeIndex === index;
            return (
              <div
                key={slice.id}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  borderRadius: 4,
                  backgroundColor: isSelected
                    ? theme.tableRowBackgroundHover
                    : 'transparent',
                  transition: 'background-color 0.15s ease',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: slice.color,
                      flexShrink: 0,
                    }}
                  />
                  {slice.icon && (
                    <span style={{ fontSize: 14 }}>{slice.icon}</span>
                  )}
                  <span
                    style={{
                      fontWeight: 500,
                      color: theme.pageText,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {slice.name}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <FinancialText
                    style={{
                      color: theme.pageText,
                      fontWeight: 600,
                    }}
                  >
                    <PrivacyFilter>
                      {format(slice.value, 'financial')}
                    </PrivacyFilter>
                  </FinancialText>

                  <span
                    style={{
                      color: theme.pageTextSubdued,
                      fontSize: 11,
                      fontWeight: 600,
                      minWidth: 42,
                      textAlign: 'right',
                    }}
                  >
                    {slice.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </View>
      )}
    </View>
  );
}
