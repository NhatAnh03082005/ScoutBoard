import React from 'react';
import {
  getPerformanceCardGroup,
  getPerformanceCardsData,
} from '../../utils/performance.utils';

interface PerformanceCardsProps {
  stats: any | null | undefined;
  positionCode?: string | null;
}

export const PerformanceCards: React.FC<PerformanceCardsProps> = ({
  stats,
  positionCode,
}) => {
  const group = getPerformanceCardGroup(positionCode);
  const cards = getPerformanceCardsData(stats, group);

  if (!cards || cards.length === 0) {
    return (
      <div
        style={{
          color: '#64748b',
          fontSize: '13px',
          fontStyle: 'italic',
          padding: '24px',
          textAlign: 'center',
          background: 'var(--scout-surface-card)',
          borderRadius: '16px',
          border: '1px solid var(--scout-border-default)',
        }}
      >
        No performance metrics available for the selected season.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {cards.map((card) => (
        <div key={card.title} className={`scout-clean-stat-card ${card.colorClass}`}>
          <div className="scout-clean-card-header">
            <div className={`scout-clean-card-title ${card.titleClass}`}>
              <span>{card.icon}</span> {card.title}
            </div>
          </div>
          <div className={card.gridClass}>
            {card.metrics.map((metric) => (
              <div key={metric.label} className="scout-clean-stat-block">
                <span className="scout-clean-lbl">{metric.label}</span>
                <span className="scout-clean-num" style={{ margin: '4px 0' }}>
                  {metric.value}
                </span>
                <span className="scout-clean-sub">{metric.subtext}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
