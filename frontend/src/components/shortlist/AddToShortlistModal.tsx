import React, { useState, useEffect } from 'react';
import type { Shortlist } from '../../types/shortlist.types';
import {
  getShortlistsApi,
  addPlayerToShortlistApi,
  getShortlistPlayersApi,
} from '../../services/shortlist.service';
import { getNationalityFlagUrl } from '../../utils/nationality-flag.util';
import {
  CloseIcon,
  LockIcon,
  GlobeIcon,
  AlertCircleIcon,
} from '../modal/ModalIcons';

export interface AddToShortlistPlayerInfo {
  id: string;
  name?: string;
  fullName?: string;
  imageUrl?: string | null;
  nationality?: string | null;
  nationalityFlagUrl?: string | null;
  primaryPosition?: string | null;
  currentTeam?: {
    name?: string;
    shortName?: string | null;
    logoUrl?: string | null;
  } | null;
}

interface AddToShortlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: AddToShortlistPlayerInfo | null;
  onSuccess?: (shortlistName: string) => void;
  onNavigateToLogin?: () => void;
}

export const AddToShortlistModal: React.FC<AddToShortlistModalProps> = ({
  isOpen,
  onClose,
  player,
  onSuccess,
  onNavigateToLogin,
}) => {
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selection & Note State
  const [selectedShortlistId, setSelectedShortlistId] = useState<string>('');
  const [scoutNote, setScoutNote] = useState<string>('');
  const [membershipMap, setMembershipMap] = useState<Record<string, boolean>>({});

  // Submitting
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ESC key handler for accessibility
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  useEffect(() => {
    if (isOpen) {
      void fetchUserShortlists();
      setScoutNote('');
      setActionError(null);
      setMembershipMap({});
    }
  }, [isOpen]);

  const fetchUserShortlists = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShortlistsApi();
      setShortlists(data);

      // Check which shortlists already contain this player
      const mem: Record<string, boolean> = {};
      if (player?.id && data.length > 0) {
        await Promise.allSettled(
          data.map(async (sl) => {
            try {
              const pList = await getShortlistPlayersApi(sl.id);
              if (pList.some((item) => item.playerId === player.id || item.player?.id === player.id)) {
                mem[sl.id] = true;
              }
            } catch {
              // Ignore failure for individual list check
            }
          })
        );
      }
      setMembershipMap(mem);

      // Auto-select first shortlist that does not yet contain this player
      const available = data.find((sl) => !mem[sl.id]);
      if (available) {
        setSelectedShortlistId(available.id);
      } else if (data.length > 0) {
        setSelectedShortlistId(data[0].id);
      }
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setError('UNAUTHORIZED');
      } else {
        setError(err.message || 'Failed to load your shortlists');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !player) return null;

  const playerName = player.fullName || player.name || 'Player';
  const teamName = player.currentTeam?.shortName || player.currentTeam?.name || 'Club';

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!selectedShortlistId) {
      setActionError('Please select a target shortlist');
      return;
    }

    if (membershipMap[selectedShortlistId]) {
      setActionError(`⚠️ ${playerName} is already in this shortlist.`);
      return;
    }

    setSubmitting(true);

    try {
      const selected = shortlists.find((s) => s.id === selectedShortlistId);
      const targetShortlistName = selected ? selected.name : 'Shortlist';

      await addPlayerToShortlistApi(
        selectedShortlistId,
        player.id,
        scoutNote.trim() || undefined,
      );

      if (onSuccess) {
        onSuccess(targetShortlistName);
      }
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Failed to add player to shortlist';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate')) {
        setActionError(`⚠️ ${playerName} is already in this shortlist.`);
      } else {
        setActionError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSelectedAlreadyInList = !!membershipMap[selectedShortlistId];

  return (
    <div
      className="scout-modal-clean-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="scout-modal-clean-dialog shortlist-dialog"
        style={{
          maxWidth: '480px',
          maxHeight: 'min(90vh, 640px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 24px 18px',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-shortlist-title"
      >
        {/* 1. Header with ScoutBoard primary blue title & clean close button */}
        <div className="scout-modal-clean-header">
          <div className="scout-modal-clean-header-content">
            <h2 id="add-to-shortlist-title" className="scout-modal-clean-title">
              Add to Shortlist
            </h2>
            <p className="scout-modal-clean-subtitle">
              Save player to your scouting watchlists
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="scout-modal-clean-close-btn"
            aria-label="Close modal"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Player Summary Preview Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '12px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              background: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {player.imageUrl ? (
              <img
                src={player.imageUrl}
                alt={playerName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span style={{ fontSize: '18px' }}>⚽</span>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              {playerName}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
              {player.primaryPosition && (
                <span style={{ background: '#0f172a', color: '#ffffff', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                  {player.primaryPosition}
                </span>
              )}
              {teamName && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#334155' }}>
                  {player.currentTeam?.logoUrl && (
                    <img
                      src={player.currentTeam.logoUrl}
                      alt=""
                      style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                    />
                  )}
                  <span>{teamName}</span>
                </span>
              )}
              {player.nationality && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {(() => {
                    const flag = getNationalityFlagUrl(player.nationality, player.nationalityFlagUrl);
                    return flag ? (
                      <img
                        src={flag}
                        alt=""
                        style={{ width: '14px', height: '10px', objectFit: 'cover', borderRadius: '1px' }}
                      />
                    ) : null;
                  })()}
                  <span>{player.nationality}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Auth Required State */}
        {error === 'UNAUTHORIZED' ? (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
              Authentication Required
            </h4>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px', lineHeight: 1.5 }}>
              Please log in to your ScoutBoard account to save players to your private scouting shortlists.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onNavigateToLogin) onNavigateToLogin();
              }}
              className="scout-btn scout-btn-md scout-btn-primary"
              style={{ width: 'auto', padding: '10px 24px', fontSize: '13px', margin: '0 auto' }}
            >
              Log In Now
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleAddSubmit}
            className="scout-modal-clean-form"
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              gap: '12px',
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                paddingRight: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
            {actionError && (
              <div className="scout-modal-alert-error" role="alert">
                <AlertCircleIcon size={16} />
                <span>{actionError}</span>
              </div>
            )}

            {/* 2. Select Target Shortlist (No + Create New List button) */}
            <div className="scout-field-group">
              <label className="scout-field-label">
                SELECT TARGET SHORTLIST
              </label>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ height: '46px', background: '#f1f5f9', borderRadius: '10px' }}></div>
                  <div style={{ height: '46px', background: '#f1f5f9', borderRadius: '10px' }}></div>
                </div>
              ) : shortlists.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px 16px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    fontSize: '13px',
                  }}
                >
                  No shortlists found. Please create a shortlist first from the <strong>My Shortlists</strong> page.
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    paddingRight: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {shortlists.map((sl) => {
                    const alreadyInList = !!membershipMap[sl.id];
                    const isSelected = selectedShortlistId === sl.id;
                    return (
                      <div
                        key={sl.id}
                        onClick={() => setSelectedShortlistId(sl.id)}
                        style={{
                          minHeight: '46px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: isSelected
                            ? '2px solid #2563eb'
                            : '1px solid #e2e8f0',
                          background: isSelected
                            ? '#eff6ff'
                            : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxSizing: 'border-box',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <input
                            type="radio"
                            name="shortlistSelection"
                            checked={isSelected}
                            onChange={() => setSelectedShortlistId(sl.id)}
                            style={{ cursor: 'pointer', accentColor: '#2563eb', flexShrink: 0 }}
                          />
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: isSelected ? '#1e40af' : '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {sl.name}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {alreadyInList && (
                            <span
                              style={{
                                background: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              ✓ In Shortlist
                            </span>
                          )}
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              border: '1px solid',
                              ...(sl.visibility === 'PUBLIC'
                                ? { background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }
                                : { background: '#f8fafc', color: '#475569', borderColor: '#e2e8f0' }),
                            }}
                          >
                            {sl.visibility === 'PUBLIC' ? (
                              <>
                                <GlobeIcon size={12} /> Public
                              </>
                            ) : (
                              <>
                                <LockIcon size={12} /> Private
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Expanded Initial Scout Note */}
            <div className="scout-field-group">
              <label htmlFor="scout-note-textarea" className="scout-field-label">
                INITIAL SCOUT NOTE <span className="scout-field-optional">(OPTIONAL)</span>
              </label>
              <textarea
                id="scout-note-textarea"
                rows={2}
                value={scoutNote}
                onChange={(e) => setScoutNote(e.target.value)}
                placeholder="Tactical strengths, press resistance, scouting observations..."
                className="scout-clean-textarea"
                style={{
                  width: '100%',
                  minHeight: '65px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            </div>

            {/* 4. Action Buttons (Footer) */}
            <div
              className="scout-modal-clean-footer"
              style={{
                marginTop: 'auto',
                paddingTop: '12px',
                flexShrink: 0,
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="scout-btn scout-btn-md scout-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedShortlistId || isSelectedAlreadyInList}
                className="scout-btn scout-btn-md scout-btn-primary"
                style={{
                  padding: '0 24px',
                  opacity: isSelectedAlreadyInList ? 0.6 : 1,
                }}
              >
                {submitting
                  ? 'Adding...'
                  : isSelectedAlreadyInList
                  ? 'Already In Shortlist'
                  : 'Add to Shortlist'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
