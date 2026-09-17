import React from 'react';
import type { PlayerPosition } from '../../../types/player.types';
import { TACTICAL_POSITION_GROUPS } from './query-composition.utils';

export interface PositionPickerSectionProps {
  selectedPosition: PlayerPosition | null;
  onTogglePosition: (code: PlayerPosition) => void;
  onClearPosition: () => void;
}

export const PositionPickerSection: React.FC<PositionPickerSectionProps> = ({
  selectedPosition,
  onTogglePosition,
  onClearPosition,
}) => {
  return (
    <div className="scout-context-card scout-context-card--positions">
      <div className="scout-context-card-header">
        <div className="scout-context-card-label">
          <span className="scout-context-card-icon">📍</span>
          <span>Tactical Position (Single Select)</span>
          {selectedPosition ? (
            <span className="scout-context-active-pos-badge">
              Active: <strong>{selectedPosition}</strong>
            </span>
          ) : (
            <span className="scout-context-tag-hint">
              Choose 1 position to unlock specialized metrics
            </span>
          )}
        </div>
        {selectedPosition && (
          <button
            type="button"
            className="scout-context-sub-clear"
            onClick={onClearPosition}
          >
            Clear Position
          </button>
        )}
      </div>

      <div className="scout-pos-matrix">
        {TACTICAL_POSITION_GROUPS.map((group) => (
          <div key={group.name} className="scout-pos-group-row">
            <div className="scout-pos-group-title">
              <span className={`scout-pos-cat-pill ${group.badgeClass}`}>
                {group.name}
              </span>
            </div>
            <div className="scout-pos-tiles-flex">
              {group.positions.map((pos) => {
                const isSelected = selectedPosition === pos.code;
                return (
                  <button
                    key={pos.code}
                    type="button"
                    className={`scout-pos-tile ${isSelected ? 'active' : ''}`}
                    onClick={() => onTogglePosition(pos.code)}
                    title={`${pos.desc} (${pos.code})`}
                    aria-pressed={isSelected}
                  >
                    <span className="scout-pos-tile-code">{pos.label}</span>
                    <span className="scout-pos-tile-desc">{pos.desc}</span>
                    {isSelected && (
                      <span className="scout-pos-tile-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
