import React from 'react';
import type { PlayerPosition } from '../../../types/player.types';
import type { CategorizedMetric } from '../../../types/player-query-metrics';
import type { StatisticRangeRow } from './query-composition.utils';

export interface StatisticRangesSectionProps {
  selectedPosition: PlayerPosition;
  positionPerformanceMetrics: CategorizedMetric[];
  groupedPerformanceMetrics: Record<string, CategorizedMetric[]>;
  statisticRows: StatisticRangeRow[];
  onAddRow: () => void;
  onUpdateRow: (id: string, field: 'metricKey' | 'from' | 'to', value: string) => void;
  onRemoveRow: (id: string) => void;
  onClearAllRanges: () => void;
}

export const StatisticRangesSection: React.FC<StatisticRangesSectionProps> = ({
  selectedPosition,
  positionPerformanceMetrics,
  groupedPerformanceMetrics,
  statisticRows,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  onClearAllRanges,
}) => {
  return (
    <div className="scout-context-card scout-context-card--performance">
      <div className="scout-context-card-header">
        <div className="scout-context-card-label">
          <span className="scout-context-card-icon">⚡</span>
          <span>
            Position Performance: <strong>{selectedPosition}</strong>
          </span>
          <span className="scout-context-tag-metric-count">
            {positionPerformanceMetrics.length} metrics tailored
          </span>
        </div>
        {statisticRows.length > 0 && (
          <button
            type="button"
            className="scout-context-sub-clear"
            onClick={onClearAllRanges}
          >
            Clear Ranges ({statisticRows.length})
          </button>
        )}
      </div>

      <div className="scout-perf-context-body">
        <p className="scout-perf-context-desc">
          Configure numeric minimum (<strong>From</strong>) and maximum (<strong>To</strong>) thresholds tailored for{' '}
          <strong>{selectedPosition}</strong>. Multiple statistics compose using <strong>AND</strong> logic.
        </p>

        {statisticRows.length > 0 && (
          <div className="scout-stat-ranges-container">
            {statisticRows.map((row) => (
              <div
                key={row.id}
                className={`scout-stat-range-row ${row.error ? 'scout-stat-range-row--error' : ''}`}
              >
                <div className="scout-stat-range-controls">
                  <select
                    className="scout-stat-range-select"
                    value={row.metricKey}
                    onChange={(e) => onUpdateRow(row.id, 'metricKey', e.target.value)}
                    aria-label="Performance Metric"
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

                  <div className="scout-stat-range-inputs-group">
                    <div className="scout-stat-range-field">
                      <label htmlFor={`range-from-${row.id}`}>From</label>
                      <input
                        id={`range-from-${row.id}`}
                        type="number"
                        step="any"
                        className="scout-stat-range-input"
                        placeholder="Min"
                        value={row.from}
                        onChange={(e) => onUpdateRow(row.id, 'from', e.target.value)}
                      />
                    </div>

                    <div className="scout-stat-range-field">
                      <label htmlFor={`range-to-${row.id}`}>To</label>
                      <input
                        id={`range-to-${row.id}`}
                        type="number"
                        step="any"
                        className="scout-stat-range-input"
                        placeholder="Max"
                        value={row.to}
                        onChange={(e) => onUpdateRow(row.id, 'to', e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="scout-stat-range-remove-btn"
                    onClick={() => onRemoveRow(row.id)}
                    aria-label="Remove statistic filter"
                    title="Remove statistic"
                  >
                    ×
                  </button>
                </div>

                {row.error && (
                  <span className="scout-stat-range-error" role="alert">
                    ⚠️ {row.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="scout-stat-range-add-btn"
          onClick={onAddRow}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Statistic Range
        </button>
      </div>
    </div>
  );
};
