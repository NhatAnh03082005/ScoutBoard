import React from 'react';
import type { SquadPlayerItem } from '../../types/squad.types';
import {
  getCleanDisplayPosition,
  getPillBadgeColor,
} from './squad-detail.utils';
import { JerseyIcon } from './JerseyIcon';

export interface SquadBenchProps {
  substitutes: SquadPlayerItem[];
  isBenchOpen: boolean;
  onToggleBenchOpen: () => void;
  activeBenchMenuId: string | null;
  onToggleBenchMenu: (id: string | null) => void;
  onOpenPickerForBench: () => void;
  onPromoteBenchPlayerToSlot: (player: SquadPlayerItem) => void;
  onRemovePlayer: (playerId: string) => void;
}

export const SquadBench: React.FC<SquadBenchProps> = ({
  substitutes,
  isBenchOpen,
  onToggleBenchOpen,
  activeBenchMenuId,
  onToggleBenchMenu,
  onOpenPickerForBench,
  onPromoteBenchPlayerToSlot,
  onRemovePlayer,
}) => {
  return (
    <div className={`scout-bench-drawer ${isBenchOpen ? 'is-open' : ''}`}>
      {/* Drawer Top Tab / Header */}
      <button
        type="button"
        className="scout-bench-drawer-tab"
        onClick={onToggleBenchOpen}
        title="Open or close substitutes"
        aria-expanded={isBenchOpen}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          <span style={{ fontWeight: 800 }}>SUBSTITUTES</span>
          <span
            style={{
              background:
                substitutes.length > 0
                  ? 'rgba(37, 99, 235, 0.3)'
                  : 'rgba(255, 255, 255, 0.1)',
              color: substitutes.length > 0 ? '#60a5fa' : '#94a3b8',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '10.5px',
              fontWeight: 800,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {substitutes.length}/7 SLOTS
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '11px',
            color: '#94a3b8',
          }}
        >
          <span>{isBenchOpen ? '▼ Collapse' : '▲ Open bench'}</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: '10px',
            }}
          >
            {isBenchOpen ? '✕' : '▲'}
          </span>
        </div>
      </button>

      {/* Drawer Body with 7 Substitutes Cards */}
      <div className="scout-bench-drawer-body">
        <div className="scout-bench-row-7">
          {Array.from({ length: 7 }).map((_, idx) => {
            const sub = substitutes[idx];
            if (sub) {
              const posCode = getCleanDisplayPosition(
                sub.player?.primaryPosition || 'SUB',
              );
              const pillColor = getPillBadgeColor(posCode);
              const isBenchMenuOpen = activeBenchMenuId === sub.id;

              return (
                <div
                  key={sub.id}
                  className="scout-bench-slot-card occupied"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBenchMenu(isBenchMenuOpen ? null : sub.id);
                  }}
                >
                  <div
                    className="scout-card-header"
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0 4px',
                    }}
                  >
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>
                      #{idx + 1}
                    </span>
                    <span className="scout-card-pos-badge" style={{ background: pillColor }}>
                      {posCode}
                    </span>
                  </div>

                  <div className="scout-card-compact-avatar-wrap">
                    {sub.player?.imageUrl ? (
                      <img
                        src={sub.player.imageUrl}
                        alt={sub.player.name}
                        className="scout-card-compact-avatar"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="scout-card-compact-fallback">
                        <JerseyIcon size={18} />
                      </div>
                    )}
                  </div>

                  <div className="scout-card-compact-name" title={sub.player?.name}>
                    {sub.player?.shortName || sub.player?.name || 'Player'}
                  </div>

                  {/* Bench Context Popover */}
                  {isBenchMenuOpen && (
                    <div
                      className="tactical-context-popover"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        style={{
                          padding: '6px 12px',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          fontSize: '11px',
                          color: '#94a3b8',
                          fontWeight: 700,
                        }}
                      >
                        {sub.player?.name || 'Player'}
                      </div>
                      <button
                        type="button"
                        className="tactical-action-item"
                        onClick={() => {
                          onToggleBenchMenu(null);
                          onPromoteBenchPlayerToSlot(sub);
                        }}
                      >
                        <span aria-hidden="true">↑</span>
                        <span>Promote to Starting XI</span>
                      </button>
                      <button
                        type="button"
                        className="tactical-action-item destructive"
                        onClick={() => {
                          onToggleBenchMenu(null);
                          onRemovePlayer(sub.playerId);
                        }}
                      >
                        <span aria-hidden="true">×</span>
                        <span>Remove from Squad</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={`empty-sub-${idx}`}
                className="scout-bench-slot-card empty"
                onClick={onOpenPickerForBench}
                title="Add substitute"
              >
                <div className="scout-marker-plus">+</div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8' }}>
                  Click to Add
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
