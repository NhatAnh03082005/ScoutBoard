import React from 'react';
import { ComparisonRadarChart } from '../ComparisonRadarChart';
import type { RadarMetric } from '../../../utils/radar.utils';
import type { KeyBattleItem } from './usePlayerComparison';
import { formatNumber } from './comparison.utils';

export interface ComparisonRadarSectionProps {
  radarMetricsA: RadarMetric[];
  radarMetricsB: RadarMetric[];
  nameA: string;
  nameB: string;
  selectedComparisonPosition: string;
  radarProfileTitle: string;
  radarProfileTitleB: string | undefined;
  commonPositions: string[];
  onSelectPosition: (pos: string) => void;
  keyBattles: KeyBattleItem[];
}

export const ComparisonRadarSection: React.FC<ComparisonRadarSectionProps> = ({
  radarMetricsA,
  radarMetricsB,
  nameA,
  nameB,
  selectedComparisonPosition,
  radarProfileTitle,
  radarProfileTitleB,
  commonPositions,
  onSelectPosition,
  keyBattles,
}) => {
  return (
    <div className="scout-comparison-grid">
      {/* LEFT COLUMN: Performance & Radar */}
      <div className="scout-comparison-left">
        <ComparisonRadarChart
          metricsA={radarMetricsA}
          metricsB={radarMetricsB}
          playerAName={nameA}
          playerBName={nameB}
          playerAHexColor="#3b82f6"
          playerBHexColor="#f59e0b"
          selectedPosition={selectedComparisonPosition}
          radarTitle={radarProfileTitle}
          radarTitleB={radarProfileTitleB}
          commonPositions={commonPositions}
          onSelectPosition={onSelectPosition}
        />
      </div>

      {/* RIGHT COLUMN: Key Battles Card */}
      <div
        className="scout-card scout-comparison-right"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
        }}
      >
        <h3 className="scout-card-title scout-card-title-dark" style={{ marginBottom: '12px' }}>
          KEY BATTLES
        </h3>

        {/* Key Battles Column Sub-Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            background: 'var(--scout-bg-subtle)',
            borderRadius: '8px',
            border: '1px solid var(--scout-border-subtle)',
            marginBottom: '10px',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <span style={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3b82f6' }} />
            <span>{nameA} (A)</span>
          </span>
          <span style={{ color: 'var(--scout-text-muted)', fontSize: '10px', letterSpacing: '0.08em' }}>
            KEY METRIC BATTLES
          </span>
          <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span>{nameB} (B)</span>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} />
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'space-around' }}>
          {keyBattles.map((battle) => {
            const vA = battle.valA ?? 0;
            const vB = battle.valB ?? 0;
            const higherIsBetter = battle.higherIsBetter !== false;

            let isWinnerA = false;
            let isWinnerB = false;
            if (
              battle.valA !== null &&
              battle.valA !== undefined &&
              battle.valB !== null &&
              battle.valB !== undefined
            ) {
              if (vA !== vB) {
                if (higherIsBetter) {
                  isWinnerA = vA > vB;
                  isWinnerB = vB > vA;
                } else {
                  isWinnerA = vA < vB;
                  isWinnerB = vB < vA;
                }
              }
            }

            // Proportional ratio calculation: A / (A + B)
            let ratioA = 50;
            let ratioB = 50;
            if (higherIsBetter) {
              const total = Math.abs(vA) + Math.abs(vB);
              if (total > 0) {
                ratioA = (Math.abs(vA) / total) * 100;
                ratioB = (Math.abs(vB) / total) * 100;
              }
            } else {
              // Lower is better (e.g. Goals Conceded / 90)
              const invA = 1 / Math.max(0.01, Math.abs(vA));
              const invB = 1 / Math.max(0.01, Math.abs(vB));
              const invTotal = invA + invB;
              ratioA = (invA / invTotal) * 100;
              ratioB = (invB / invTotal) * 100;
            }

            const textA =
              battle.valA !== null && battle.valA !== undefined && !isNaN(battle.valA)
                ? `${formatNumber(battle.valA)}${battle.isPercentage ? '%' : ''}`
                : '—';
            const textB =
              battle.valB !== null && battle.valB !== undefined && !isNaN(battle.valB)
                ? `${formatNumber(battle.valB)}${battle.isPercentage ? '%' : ''}`
                : '—';

            return (
              <div
                key={battle.label}
                style={{
                  background: 'var(--scout-bg-subtle)',
                  border: '1px solid var(--scout-border-default)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Left Player A Score */}
                <div
                  style={{
                    width: '48px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: isWinnerA ? 900 : isWinnerB ? 500 : 700,
                    color: isWinnerA ? '#ffffff' : isWinnerB ? '#64748b' : '#cbd5e1',
                    flexShrink: 0,
                  }}
                >
                  {textA}
                </div>

                {/* Center Metric & Dual Bar */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  {/* Metric Name */}
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#64748b',
                      textAlign: 'center',
                    }}
                  >
                    {battle.label}
                  </div>

                  {/* Dual-bar */}
                  <div
                    style={{
                      height: '8px',
                      width: '90%',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      border: '1px solid var(--scout-border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {/* Left Half (Blue) */}
                    <div
                      style={{
                        width: `${ratioA}%`,
                        height: '100%',
                        background: '#2563eb',
                        transition: 'width 0.4s ease',
                      }}
                    />

                    {/* Right Half (Amber) */}
                    <div
                      style={{
                        width: `${ratioB}%`,
                        height: '100%',
                        background: '#f59e0b',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Right Player B Score */}
                <div
                  style={{
                    width: '48px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: isWinnerB ? 900 : isWinnerA ? 500 : 700,
                    color: isWinnerB ? '#ffffff' : isWinnerA ? '#64748b' : '#cbd5e1',
                    flexShrink: 0,
                  }}
                >
                  {textB}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
