import React from 'react';
import type { SquadPlayerItem } from '../../types/squad.types';
import {
  findStarterForSlot,
  type FormationSlot,
} from '../../utils/squad-placement.utils';
import {
  getSlotCategory,
  getCleanDisplayPosition,
  getPillBadgeColor,
} from './squad-detail.utils';
import { JerseyIcon } from './JerseyIcon';

export interface SquadPitchProps {
  tacticalSlots: FormationSlot[];
  players: SquadPlayerItem[];
  activeMenuSlotCode: string | null;
  onToggleMenuSlot: (code: string | null) => void;
  onOpenPickerForSlot: (slot: FormationSlot) => void;
  onOpenSwapForSlot: (slot: FormationSlot, currentPlayer: SquadPlayerItem) => void;
  onMoveStarterToBench: (playerId: string) => void;
  onSetCaptain: (playerId: string) => void;
  onRemovePlayer: (playerId: string) => void;
}

export const SquadPitch: React.FC<SquadPitchProps> = ({
  tacticalSlots,
  players,
  activeMenuSlotCode,
  onToggleMenuSlot,
  onOpenPickerForSlot,
  onOpenSwapForSlot,
  onMoveStarterToBench,
  onSetCaptain,
  onRemovePlayer,
}) => {
  return (
    <div className="scout-tactical-pitch-stage">
      <div className="scout-tactical-pitch-canvas">
        {/* Field Markings SVG */}
        <svg
          viewBox="0 0 600 800"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {/* Outer Touchlines */}
          <rect
            x="20"
            y="20"
            width="560"
            height="760"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2.5"
          />

          {/* Halfway line */}
          <line
            x1="20"
            y1="400"
            x2="580"
            y2="400"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2.5"
          />

          {/* Center Circle & Spot */}
          <circle
            cx="300"
            cy="400"
            r="76"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2.5"
          />
          <circle cx="300" cy="400" r="4.5" fill="rgba(255,255,255,0.75)" />

          {/* Corner Arcs */}
          <path
            d="M 20 40 A 20 20 0 0 0 40 20"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
          />
          <path
            d="M 560 20 A 20 20 0 0 0 580 40"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
          />
          <path
            d="M 20 760 A 20 20 0 0 1 40 780"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
          />
          <path
            d="M 560 780 A 20 20 0 0 1 580 760"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
          />

          {/* Opponent Goal Box (Top / Attack) */}
          <rect
            x="175"
            y="20"
            width="250"
            height="115"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2.5"
          />
          <rect
            x="230"
            y="20"
            width="140"
            height="42"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
          />
          <circle cx="300" cy="90" r="4" fill="rgba(255,255,255,0.6)" />
          <path
            d="M 240 135 A 65 65 0 0 0 360 135"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
          />

          {/* Our Goal Box (Bottom / Goalkeeper) */}
          <rect
            x="175"
            y="665"
            width="250"
            height="115"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2.5"
          />
          <rect
            x="230"
            y="738"
            width="140"
            height="42"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
          />
          <circle cx="300" cy="710" r="4" fill="rgba(255,255,255,0.6)" />
          <path
            d="M 240 665 A 65 65 0 0 1 360 665"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
          />
        </svg>

        {/* 11 TACTICAL SLOTS RENDERED ON PITCH */}
        {tacticalSlots.map((slot) => {
          const assignedPlayer = findStarterForSlot(players, slot);
          const isMenuOpen = activeMenuSlotCode === slot.code;
          const cleanPos = getCleanDisplayPosition(
            slot.requiredPosition || slot.displayRole || slot.code,
          );
          const posCat = getSlotCategory(slot.requiredPosition || slot.code);
          const pillColor = getPillBadgeColor(slot.requiredPosition || slot.code);
          const isLowerHalf = slot.y > 55;

          return (
            <div
              key={slot.code}
              className="scout-tactical-slot"
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                zIndex: isMenuOpen ? 200 : 10,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {assignedPlayer ? (
                <>
                  {/* OCCUPIED COMPACT FOOTBALL CARD */}
                  <div
                    className={`scout-player-card-compact ${posCat}`}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMenuSlot(isMenuOpen ? null : slot.code);
                    }}
                    title={`Manage ${assignedPlayer.player?.name || 'player'}`}
                  >
                    {/* Position Pill Badge */}
                    <span className="scout-card-pos-badge" style={{ background: pillColor }}>
                      {cleanPos}
                    </span>

                    {/* Player Avatar */}
                    <div className="scout-card-compact-avatar-wrap">
                      {assignedPlayer.player?.imageUrl ? (
                        <img
                          src={assignedPlayer.player.imageUrl}
                          alt={assignedPlayer.player.name}
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
                      {assignedPlayer.isCaptain && (
                        <span className="scout-card-captain-badge" title="Captain">
                          C
                        </span>
                      )}
                    </div>

                    {/* Player Name */}
                    <div className="scout-card-compact-name" title={assignedPlayer.player?.name}>
                      {assignedPlayer.player?.shortName || assignedPlayer.player?.name || 'Player'}
                    </div>
                  </div>

                  {/* Tactical Action Menu */}
                  {isMenuOpen && (
                    <div
                      className={`tactical-context-popover ${isLowerHalf ? 'pop-up' : 'pop-down'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="tactical-popover-header">
                        {assignedPlayer.player?.name || 'Player'}
                      </div>
                      <button
                        type="button"
                        className="tactical-action-item"
                        onClick={() => onOpenSwapForSlot(slot, assignedPlayer)}
                      >
                        <span className="tactical-action-icon" aria-hidden="true">↔</span>
                        <span>Replace Player</span>
                      </button>
                      <button
                        type="button"
                        className="tactical-action-item"
                        onClick={() => onMoveStarterToBench(assignedPlayer.playerId)}
                      >
                        <span className="tactical-action-icon" aria-hidden="true">↓</span>
                        <span>Move to Bench</span>
                      </button>
                      {!assignedPlayer.isCaptain && (
                        <button
                          type="button"
                          className="tactical-action-item"
                          onClick={() => onSetCaptain(assignedPlayer.playerId)}
                        >
                          <span className="tactical-action-icon" aria-hidden="true">★</span>
                          <span>Make Captain</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="tactical-action-item destructive"
                        onClick={() => onRemovePlayer(assignedPlayer.playerId)}
                      >
                        <span className="tactical-action-icon" aria-hidden="true">×</span>
                        <span>Remove from Squad</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* EMPTY SLOT MARKER */
                <button
                  type="button"
                  className="scout-empty-slot-marker"
                  onClick={() => onOpenPickerForSlot(slot)}
                  title={`Choose a player for ${cleanPos}`}
                >
                  <div className="scout-marker-plus">+</div>
                  <div className="scout-marker-role" style={{ color: pillColor }}>
                    {cleanPos}
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
