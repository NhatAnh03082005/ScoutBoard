import React from 'react';
import type { PlayerDetail } from '../../../types/player.types';

export interface ComparisonBottomBarProps {
  playerA: PlayerDetail;
  playerB: PlayerDetail;
  onShortlistPlayer: (player: PlayerDetail) => void;
  onBackToSetup: () => void;
  onBackToDetail: () => void;
}

export const ComparisonBottomBar: React.FC<ComparisonBottomBarProps> = ({
  playerA,
  playerB,
  onShortlistPlayer,
  onBackToSetup,
  onBackToDetail,
}) => {
  const nameA = playerA.fullName || playerA.name;
  const nameB = playerB.fullName || playerB.name;

  return (
    <div className="scout-compare-bottom-actions">
      <div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 800,
            color: 'var(--scout-text-primary)',
            marginBottom: '4px',
          }}
        >
          Evaluation Handoff & Next Steps
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--scout-text-secondary)' }}>
          Finished comparing? Save promising targets to your shortlists or return to player analysis.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="scout-btn scout-btn-secondary"
          onClick={() => onShortlistPlayer(playerA)}
          style={{
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#60a5fa',
            background: 'rgba(37, 99, 235, 0.1)',
            fontWeight: 700,
            fontSize: '12.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>+ Shortlist {nameA} (A)</span>
        </button>

        <button
          type="button"
          className="scout-btn scout-btn-secondary"
          onClick={() => onShortlistPlayer(playerB)}
          style={{
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
            background: 'rgba(245, 158, 11, 0.1)',
            fontWeight: 700,
            fontSize: '12.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>+ Shortlist {nameB} (B)</span>
        </button>

        <button
          type="button"
          className="scout-btn scout-btn-secondary"
          onClick={onBackToSetup}
          style={{ fontSize: '12.5px' }}
        >
          Compare Another Player
        </button>

        <button
          type="button"
          className="scout-btn scout-btn-primary"
          onClick={onBackToDetail}
          style={{ fontSize: '12.5px' }}
        >
          Back to {nameA}
        </button>
      </div>
    </div>
  );
};
