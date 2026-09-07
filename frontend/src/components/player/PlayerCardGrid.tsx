import React, { useState } from 'react';
import type { PlayerItem } from '../../types/player.types';
import { PlayerCard } from './PlayerCard';
import { AddToShortlistModal } from '../shortlist/AddToShortlistModal';

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
  const [shortlistTargetPlayer, setShortlistTargetPlayer] = useState<PlayerItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Loading Skeleton Grid (8 Skeleton Cards)
  if (loading) {
    return (
      <div className="scout-fc-card-grid">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={`card-skeleton-${idx}`} className="scout-fc-card scout-fc-card-skeleton">
            <div className="scout-fc-card-bg" />
            <div className="scout-fc-skeleton-shimmer" />
            <div className="scout-fc-card-top-left">
              <div className="skeleton-line" style={{ width: '38px', height: '25px', borderRadius: '6px' }} />
              <div className="skeleton-line" style={{ width: '38px', height: '22px', borderRadius: '5px' }} />
            </div>
            <div className="scout-fc-card-top-right">
              <div className="skeleton-line" style={{ width: '34px', height: '34px', borderRadius: '6px' }} />
              <div className="skeleton-line" style={{ width: '30px', height: '20px', borderRadius: '2px' }} />
            </div>
            <div className="scout-fc-card-bottom-anchor">
              <div className="skeleton-line" style={{ width: '80%', height: '20px', marginBottom: '6px' }} />
              <div className="skeleton-line" style={{ width: '55%', height: '14px' }} />
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
    <>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-slate-800 animate-slideUp">
          <span className="text-emerald-400">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="scout-fc-card-grid">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            onSelect={onPlayerSelect}
            onAddToShortlist={(p) => setShortlistTargetPlayer(p)}
          />
        ))}
      </div>

      <AddToShortlistModal
        isOpen={!!shortlistTargetPlayer}
        onClose={() => setShortlistTargetPlayer(null)}
        player={shortlistTargetPlayer}
        onSuccess={(shortlistName) => {
          showToast(`Added ${shortlistTargetPlayer?.fullName || 'player'} to "${shortlistName}"`);
        }}
      />
    </>
  );
};
