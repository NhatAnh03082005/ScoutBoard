import React from 'react';
import type { AggregatedStats, MetricSection } from './comparison.utils';
import { formatNumber } from './comparison.utils';

export interface ComparisonMetricsTableProps {
  nameA: string;
  nameB: string;
  activeMetricSections: MetricSection[];
  processedStatsA: AggregatedStats | null;
  processedStatsB: AggregatedStats | null;
}

export const ComparisonMetricsTable: React.FC<ComparisonMetricsTableProps> = ({
  nameA,
  nameB,
  activeMetricSections,
  processedStatsA,
  processedStatsB,
}) => {
  return (
    <div style={{ marginBottom: '32px' }}>
      {/* Sticky Master Comparison Header (Appears Once Only) */}
      <div
        style={{
          position: 'sticky',
          top: '16px',
          zIndex: 20,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '14px 20px',
          marginBottom: '20px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
          border: '1px solid #1e293b',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          alignItems: 'center',
        }}
      >
        {/* Left: Player A */}
        <div
          style={{
            gridColumn: 'span 3 / span 3',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#60a5fa',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3b82f6' }} />
          <span>{nameA} (PLAYER A)</span>
        </div>

        {/* Center: Title */}
        <div
          style={{
            gridColumn: 'span 6 / span 6',
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--scout-text-secondary)',
          }}
        >
          DETAILED CATEGORY METRICS
        </div>

        {/* Right: Player B */}
        <div
          style={{
            gridColumn: 'span 3 / span 3',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#fbbf24',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>{nameB} (PLAYER B)</span>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} />
        </div>
      </div>

      {/* Category Modules */}
      {activeMetricSections.map((section) => (
        <div
          key={section.title}
          style={{
            background: 'var(--scout-surface-card)',
            border: '1px solid var(--scout-border-default)',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            marginBottom: '24px',
            overflow: 'hidden',
          }}
        >
          {/* Centered Category Header */}
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--scout-bg-subtle)',
              borderBottom: '1px solid var(--scout-border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                background: section.theme.badgeBg,
                color: section.theme.badgeText,
                padding: '4px 16px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </span>
          </div>

          {/* Metric Rows */}
          <div>
            {section.metrics.map((metric, mIdx) => {
              const valA = metric.getValue(processedStatsA);
              const valB = metric.getValue(processedStatsB);
              const higherIsBetter = metric.higherIsBetter !== false;

              let isWinnerA = false;
              let isWinnerB = false;

              if (
                valA !== null &&
                valA !== undefined &&
                valB !== null &&
                valB !== undefined &&
                !isNaN(valA) &&
                !isNaN(valB)
              ) {
                if (valA !== valB) {
                  if (higherIsBetter) {
                    isWinnerA = valA > valB;
                    isWinnerB = valB > valA;
                  } else {
                    isWinnerA = valA < valB;
                    isWinnerB = valB < valA;
                  }
                }
              }

              const textA =
                valA !== null && valA !== undefined && !isNaN(valA)
                  ? `${formatNumber(valA)}${metric.isPercentage ? '%' : ''}`
                  : '—';
              const textB =
                valB !== null && valB !== undefined && !isNaN(valB)
                  ? `${formatNumber(valB)}${metric.isPercentage ? '%' : ''}`
                  : '—';

              return (
                <div
                  key={metric.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                    alignItems: 'center',
                    padding: '10px 24px',
                    borderBottom:
                      mIdx === section.metrics.length - 1
                        ? 'none'
                        : '1px solid var(--scout-border-subtle)',
                    background: 'var(--scout-surface-card)',
                    transition: 'background 0.15s ease',
                  }}
                  className="scout-b2b-table-row"
                >
                  {/* Player A Value (col-span-3 text-center, Blue winning semantic) */}
                  <div
                    style={{
                      gridColumn: 'span 3 / span 3',
                      textAlign: 'center',
                    }}
                  >
                    {isWinnerA ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          background: 'rgba(37, 99, 235, 0.2)',
                          color: '#93c5fd',
                          border: '1px solid rgba(59, 130, 246, 0.45)',
                          fontSize: '12px',
                          fontWeight: 900,
                          boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
                        }}
                        title={`${nameA} leads on ${metric.label}`}
                      >
                        {textA}
                      </span>
                    ) : isWinnerB ? (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#64748b',
                        }}
                      >
                        {textA}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--scout-text-secondary)',
                        }}
                      >
                        {textA}
                      </span>
                    )}
                  </div>

                  {/* Metric Name (col-span-6 text-center) */}
                  <div
                    style={{
                      gridColumn: 'span 6 / span 6',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--scout-text-secondary)',
                    }}
                  >
                    {metric.label}
                  </div>

                  {/* Player B Value (col-span-3 text-center, Amber winning semantic) */}
                  <div
                    style={{
                      gridColumn: 'span 3 / span 3',
                      textAlign: 'center',
                    }}
                  >
                    {isWinnerB ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#fde68a',
                          border: '1px solid rgba(245, 158, 11, 0.45)',
                          fontSize: '12px',
                          fontWeight: 900,
                          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)',
                        }}
                        title={`${nameB} leads on ${metric.label}`}
                      >
                        {textB}
                      </span>
                    ) : isWinnerA ? (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#64748b',
                        }}
                      >
                        {textB}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--scout-text-secondary)',
                        }}
                      >
                        {textB}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
