import React from 'react';
import type { CategorizedMetric } from '../../../types/player-query-metrics';
import { TOP_N_PRESETS, type TopNConfig } from './query-composition.utils';

export interface TopNSectionProps {
  topNConfig: TopNConfig;
  positionPerformanceMetrics: CategorizedMetric[];
  groupedPerformanceMetrics: Record<string, CategorizedMetric[]>;
  onSelectPreset: (preset: number | 'custom') => void;
  onCustomChange: (customValue: string) => void;
  onMetricChange: (metricKey: string) => void;
  onClearTopN: () => void;
}

export const TopNSection: React.FC<TopNSectionProps> = ({
  topNConfig,
  positionPerformanceMetrics,
  groupedPerformanceMetrics,
  onSelectPreset,
  onCustomChange,
  onMetricChange,
  onClearTopN,
}) => {
  return (
    <div className="scout-context-card scout-context-card--topn">
      <div className="scout-context-card-header">
        <div className="scout-context-card-label">
          <span className="scout-context-card-icon">⭐</span>
          <span>Top Players by Statistic</span>
        </div>
        {topNConfig.enabled && (
          <button
            type="button"
            className="scout-context-sub-clear"
            onClick={onClearTopN}
          >
            Disable Top N
          </button>
        )}
      </div>

      <div className="scout-topn-body">
        <div className="scout-topn-controls-row">
          <div className="scout-topn-presets">
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--scout-text-secondary)',
                marginRight: '4px',
              }}
            >
              Top:
            </span>
            {TOP_N_PRESETS.map((p) => {
              const isActive = topNConfig.enabled && topNConfig.preset === p;
              return (
                <button
                  key={p}
                  type="button"
                  className={`scout-topn-preset-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectPreset(p)}
                >
                  {p === 'custom' ? 'Custom' : p}
                </button>
              );
            })}
            {topNConfig.enabled && topNConfig.preset === 'custom' && (
              <input
                type="number"
                min="1"
                step="1"
                className="scout-topn-custom-input"
                placeholder="N"
                value={topNConfig.customValue}
                onChange={(e) => onCustomChange(e.target.value)}
                aria-label="Custom Top N rank"
              />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--scout-text-secondary)',
              }}
            >
              by:
            </span>
            <select
              className="scout-topn-metric-select"
              value={topNConfig.metricKey || positionPerformanceMetrics[0]?.key || ''}
              onChange={(e) => onMetricChange(e.target.value)}
              disabled={!topNConfig.enabled}
              aria-label="Ranking Metric"
            >
              {Object.entries(groupedPerformanceMetrics).map(([cat, metrics]) => (
                <optgroup key={cat} label={cat}>
                  {metrics.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {topNConfig.enabled && (
          <div className="scout-topn-active-badge">
            <span>
              ⭐ Active ranking:{' '}
              <strong>
                Top{' '}
                {topNConfig.preset === 'custom'
                  ? topNConfig.customValue || 'N'
                  : topNConfig.preset}{' '}
                players by{' '}
                {positionPerformanceMetrics.find((m) => m.key === topNConfig.metricKey)?.label ||
                  positionPerformanceMetrics[0]?.label}
              </strong>
            </span>
            <button
              type="button"
              className="scout-topn-clear-btn"
              onClick={onClearTopN}
              title="Clear Top N ranking"
            >
              Clear Top N
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
