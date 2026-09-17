import React, { useState, useEffect } from 'react';
import { SearchInput } from '../common';
import type { PlayerItem } from '../../types/player.types';
import type { SquadPlayerItem } from '../../types/squad.types';
import { searchPlayersApi } from '../../services/player.service';
import {
  isPlayerEligibleForSlot,
  getCanonicalPosition,
  type FormationSlot,
} from '../../utils/squad-placement.utils';
import { getPillBadgeColor } from './squad-detail.utils';
import { JerseyIcon } from './JerseyIcon';

export interface PlayerAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickerTargetRole: 'STARTER' | 'SUBSTITUTE';
  pickerTargetSlot: FormationSlot | null;
  replacingPlayer: SquadPlayerItem | null;
  players: SquadPlayerItem[];
  onAssignPlayer: (player: PlayerItem) => void;
}

export const PlayerAssignmentModal: React.FC<PlayerAssignmentModalProps> = ({
  isOpen,
  onClose,
  pickerTargetRole,
  pickerTargetSlot,
  replacingPlayer,
  players,
  onAssignPlayer,
}) => {
  const [poolSearch, setPoolSearch] = useState<string>('');
  const [poolPlayers, setPoolPlayers] = useState<PlayerItem[]>([]);
  const [poolLoading, setPoolLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setPoolSearch('');
      return;
    }

    let active = true;
    setPoolLoading(true);

    const timer = setTimeout(async () => {
      try {
        const canonicalPos = pickerTargetSlot
          ? getCanonicalPosition(
              pickerTargetSlot.requiredPosition ||
                pickerTargetSlot.displayRole ||
                pickerTargetSlot.code,
            )
          : undefined;

        const response = await searchPlayersApi({
          search: poolSearch.trim() || undefined,
          position:
            !poolSearch.trim() && pickerTargetRole === 'STARTER' && canonicalPos
              ? canonicalPos
              : undefined,
          limit: 100,
        });
        if (active) {
          setPoolPlayers(response.items || []);
        }
      } catch {
        if (active) setPoolPlayers([]);
      } finally {
        if (active) setPoolLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, poolSearch, pickerTargetSlot, pickerTargetRole]);

  if (!isOpen) return null;

  // Filter pool players strictly by position first, then search query
  const eligiblePoolPlayers = poolPlayers.filter((player) => {
    if (pickerTargetRole !== 'STARTER' || !pickerTargetSlot) return true;
    return isPlayerEligibleForSlot(player, pickerTargetSlot.requiredPosition);
  });

  return (
    <div
      className="scout-modal-clean-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="scout-modal-clean-dialog squad-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-picker-title"
        style={{ maxWidth: '580px' }}
      >
        {/* Modal Header */}
        <div className="scout-modal-clean-header" style={{ marginBottom: '14px' }}>
          <div>
            <h3
              id="player-picker-title"
              style={{
                margin: '0 0 4px',
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--scout-text-primary)',
              }}
            >
              {pickerTargetRole === 'STARTER' && pickerTargetSlot ? (
                <span>
                  Assign Player for{' '}
                  <strong style={{ color: '#2563eb' }}>
                    {pickerTargetSlot.displayRole || pickerTargetSlot.label}
                  </strong>
                </span>
              ) : (
                <span>Add Player to Matchday Bench</span>
              )}
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
              {pickerTargetRole === 'STARTER' && pickerTargetSlot
                ? `Showing players eligible for ${pickerTargetSlot.requiredPosition} (Primary or Secondary position)`
                : 'Select a reserve player for your tactical substitutions'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="scout-btn-icon scout-btn-ghost"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Position Filter Tag */}
        {pickerTargetRole === 'STARTER' && pickerTargetSlot && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.16)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              marginBottom: '12px',
              fontSize: '12px',
              color: '#60a5fa',
            }}
          >
            <span style={{ fontWeight: 800 }}>Vị trí yêu cầu:</span>
            <span
              style={{
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '4px',
                background: '#2563eb',
                color: '#ffffff',
              }}
            >
              {pickerTargetSlot.displayRole || pickerTargetSlot.requiredPosition}
              {pickerTargetSlot.displayRole &&
              pickerTargetSlot.displayRole !== pickerTargetSlot.requiredPosition
                ? ` (${pickerTargetSlot.requiredPosition})`
                : ''}
            </span>
            <span style={{ color: '#60a5fa', marginLeft: 'auto', fontSize: '11px' }}>
              Strict eligibility enabled
            </span>
          </div>
        )}

        {/* Search Input */}
        <div style={{ marginBottom: '14px' }}>
          <SearchInput
            placeholder="Search player by name..."
            value={poolSearch}
            onChange={(e) => setPoolSearch(e.target.value)}
            onClear={() => setPoolSearch('')}
            autoFocus
          />
        </div>

        {/* Candidate List */}
        <div
          style={{
            maxHeight: '340px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {poolLoading ? (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '13px',
              }}
            >
              Searching eligible players...
            </div>
          ) : eligiblePoolPlayers.length === 0 ? (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                color: 'var(--scout-text-muted)',
                background: 'var(--scout-surface-card)',
                borderRadius: '10px',
                border: '1px dashed var(--scout-border-default)',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
              <div
                style={{
                  fontWeight: 700,
                  color: 'var(--scout-text-primary)',
                  marginBottom: '4px',
                }}
              >
                No eligible players found
              </div>
              <div style={{ fontSize: '12px' }}>
                {pickerTargetSlot
                  ? `No players found with ${pickerTargetSlot.requiredPosition} in primary or secondary positions.`
                  : 'Try adjusting your search query.'}
              </div>
            </div>
          ) : (
            eligiblePoolPlayers.map((player) => {
              const alreadyInSquad = players.some((p) => p.playerId === player.id);
              const isCurrentTargetOccupant = replacingPlayer?.playerId === player.id;
              const primaryPos = player.primaryPosition || 'N/A';
              const pillColor = getPillBadgeColor(primaryPos);
              const secondaryCodes =
                player.positions
                  ?.filter((p) => !p.isPrimary)
                  .map((p) => p.positionCode) || [];

              return (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: isCurrentTargetOccupant ? '#f0fdf4' : '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minWidth: 0,
                    }}
                  >
                    {player.imageUrl ? (
                      <img
                        src={player.imageUrl}
                        alt={player.fullName}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1px solid #cbd5e1',
                        }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                        }}
                      >
                        <JerseyIcon size={18} />
                      </div>
                    )}

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: 'var(--scout-text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {player.fullName}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{player.currentTeam?.name || 'Free Agent'}</span>
                        {secondaryCodes.length > 0 && (
                          <span style={{ color: '#94a3b8' }}>
                            • Sec: {secondaryCodes.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: pillColor,
                        color: '#ffffff',
                      }}
                    >
                      {primaryPos}
                    </span>

                    <button
                      type="button"
                      className="scout-btn scout-btn-sm scout-btn-primary"
                      onClick={() => onAssignPlayer(player)}
                      disabled={isCurrentTargetOccupant}
                    >
                      {isCurrentTargetOccupant
                        ? 'Current'
                        : alreadyInSquad
                          ? 'Move Here'
                          : 'Select'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <button
            type="button"
            className="scout-btn scout-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
