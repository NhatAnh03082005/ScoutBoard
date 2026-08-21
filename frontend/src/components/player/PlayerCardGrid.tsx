import React from 'react';
import type { PlayerItem } from '../../types/player.types';
import { PlayerCard } from './PlayerCard';

interface PlayerCardGridProps {
  players: PlayerItem[];
  loading: boolean;
  onPlayerSelect: (playerId: string) => void;
  onResetFilters?: () => void;
}

export const PlayerCardGrid: React.FC<PlayerCardGridProps> = ({
  players,
  loading,
  onPlayerSelect,
  onResetFilters,
}) => {
  // 1. Loading Skeleton Grid (8 Skeleton Cards)
  if (loading) {
    return (
      <div className="scout-fc-card-grid">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={`card-skeleton-${idx}`} className="scout-fc-card scout-fc-card-skeleton">
            <div className="scout-fc-card-bg" />
            <div className="scout-fc-skeleton-shimmer" />
            <div className="scout-fc-card-top-anchor">
              <div className="scout-fc-card-header-left">
                <div className="skeleton-line" style={{ width: '32px', height: '32px', borderRadius: '6px', marginBottom: '2px' }} />
                <div className="skeleton-line" style={{ width: '42px', height: '18px', borderRadius: '4px' }} />
                <div className="skeleton-line" style={{ width: '70px', height: '12px' }} />
                <div className="skeleton-line" style={{ width: '100px', height: '14px' }} />
              </div>
            </div>
            <div className="scout-fc-card-bottom-anchor">
              <div className="skeleton-line" style={{ width: '80%', height: '22px', marginBottom: '8px' }} />
              <div className="skeleton-line" style={{ width: '60%', height: '14px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. Empty State
  if (players.length === 0) {
    return (
      <div className="scout-fc-empty-card">
        <span className="scout-fc-empty-icon">⚽</span>
        <h3 className="scout-fc-empty-title">No players found</h3>
        <p className="scout-fc-empty-desc">
          Try adjusting your search keyword or clearing filters to see more results.
        </p>
        {onResetFilters && (
          <button
            type="button"
            className="scout-b2b-btn scout-b2b-btn-secondary"
            onClick={onResetFilters}
            style={{ marginTop: '14px' }}
          >
            <span>🔄</span>
            <span>Clear Filters</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Render Card Grid
  return (
    <div className="scout-fc-card-grid">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          onSelect={onPlayerSelect}
        />
      ))}
    </div>
  );
};
