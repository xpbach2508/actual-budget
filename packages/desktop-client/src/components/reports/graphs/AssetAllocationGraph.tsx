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
          minHeight: 120,
          color: theme.pageTextSubdued,
          fontSize: 14,
          gap: 8,
          ...style,
        }}
      >
        <div style={{ fontSize: 28 }}>📊</div>
        <div>{t('No asset data available')}</div>
      </View>
    );
  }

  return (
    <Container
      style={{
        flex: 1,
        height: 'auto',
        minHeight: 0,
        position: 'relative',
        ...style,
      }}
    >
      {(width, height) => {
        // Decide layout based on dimensions and compact flag
        const isHorizontalLayout = compact && width >= 260 && height < 230;
        const isCompactVertical = compact && (!isHorizontalLayout || height >= 230);

        let chartWidth = width;
        let chartHeight = height;

        if (isHorizontalLayout) {
          // Donut on left, legend on right
          chartWidth = Math.min(Math.floor(width * 0.46), height);
          chartHeight = height;
        } else if (isCompactVertical && showLegend && height >= 200) {
          chartHeight = Math.floor(height * 0.58);
        }

        const chartDim = Math.min(chartWidth, chartHeight);
        const outerRadius = Math.max(18, Math.floor(chartDim * 0.43));
        const innerRadius = Math.max(10, Math.floor(chartDim * 0.27));

        const activeSlice = activeIndex !== null ? slices[activeIndex] : null;

        const chartElement = (
          <div
            style={{
              width: chartWidth,
              height: chartHeight,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PieChart width={chartWidth} height={chartHeight}>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx={chartWidth / 2}
                cy={chartHeight / 2}
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
                        innerRadius={Math.max(0, innerRadius - 2)}
                        outerRadius={outerRadius + 3}
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

            {/* Center Total / Active Slice Overlay */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                maxWidth: innerRadius * 1.85,
                overflow: 'hidden',
              }}
            >
              {activeSlice ? (
                <>
                  <div
                    style={{
                      fontSize: Math.max(9, Math.min(12, innerRadius * 0.32)),
                      color: theme.pageTextSubdued,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {activeSlice.name}
                  </div>
                  <div
                    style={{
                      fontSize: Math.max(12, Math.min(16, innerRadius * 0.44)),
                      fontWeight: 700,
                      color: theme.pageText,
                      marginTop: 1,
                      lineHeight: 1.1,
                    }}
                  >
                    {activeSlice.percent.toFixed(1)}%
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: Math.max(8, Math.min(11, innerRadius * 0.28)),
                      color: theme.pageTextSubdued,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {t('Total')}
                  </div>
                  <div
                    style={{
                      fontSize: Math.max(10, Math.min(16, innerRadius * 0.36)),
                      fontWeight: 700,
                      color: theme.pageText,
                      marginTop: 1,
                      lineHeight: 1.1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <FinancialText>
                      <PrivacyFilter>
                        {format(totalAssets, 'financial')}
                      </PrivacyFilter>
                    </FinancialText>
                  </div>
                </>
              )}
            </div>
          </div>
        );

        const legendElement = showLegend && (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: isHorizontalLayout ? 'center' : 'flex-start',
              gap: 4,
              padding: isHorizontalLayout ? '0 4px 0 8px' : '4px 6px',
              maxHeight: isHorizontalLayout ? height : Math.max(60, height - chartHeight),
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
                    padding: '2px 4px',
                    borderRadius: 4,
                    backgroundColor: isSelected
                      ? theme.tableRowBackgroundHover
                      : 'transparent',
                    transition: 'background-color 0.15s ease',
                    cursor: 'pointer',
                    fontSize: compact ? 11 : 12,
                    lineHeight: 1.3,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: slice.color,
                        flexShrink: 0,
                      }}
                    />
                    {slice.icon && (
                      <span style={{ fontSize: 12 }}>{slice.icon}</span>
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
                      gap: 6,
                      flexShrink: 0,
                      marginLeft: 6,
                    }}
                  >
                    {!isHorizontalLayout && (
                      <FinancialText
                        style={{
                          color: theme.pageText,
                          fontWeight: 600,
                          fontSize: compact ? 11 : 12,
                        }}
                      >
                        <PrivacyFilter>
                          {format(slice.value, 'financial')}
                        </PrivacyFilter>
                      </FinancialText>
                    )}

                    <span
                      style={{
                        color: isSelected
                          ? theme.noticeTextLight
                          : theme.pageTextSubdued,
                        fontWeight: 700,
                        minWidth: 36,
                        textAlign: 'right',
                        fontSize: compact ? 10 : 11,
                      }}
                    >
                      {slice.percent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );

        return (
          <div
            style={{
              width,
              height,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: isHorizontalLayout ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {chartElement}
            {legendElement}
          </div>
        );
      }}
    </Container>
  );
}
