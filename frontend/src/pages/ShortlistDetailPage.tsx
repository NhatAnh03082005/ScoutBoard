import React, { useState, useEffect } from 'react';
import type { Shortlist, ShortlistPlayerItem } from '../types/shortlist.types';
import {
  getShortlistByIdApi,
  getShortlistPlayersApi,
  removePlayerFromShortlistApi,
  updateShortlistPlayerNoteApi,
} from '../services/shortlist.service';

interface ShortlistDetailPageProps {
  shortlistId: string;
  onBack: () => void;
  onNavigateToLogin?: () => void;
  isAuthenticated?: boolean;
}

export const ShortlistDetailPage: React.FC<ShortlistDetailPageProps> = ({
  shortlistId,
  onBack,
  onNavigateToLogin,
  isAuthenticated = true,
}) => {
  const [shortlist, setShortlist] = useState<Shortlist | null>(null);
  const [players, setPlayers] = useState<ShortlistPlayerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Scout Note State
  const [editingPlayerNote, setEditingPlayerNote] = useState<ShortlistPlayerItem | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Remove Player Confirmation State
  const [removingPlayer, setRemovingPlayer] = useState<ShortlistPlayerItem | null>(null);
  const [submittingRemove, setSubmittingRemove] = useState<boolean>(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const fetchShortlistData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [shortlistData, playersData] = await Promise.all([
        getShortlistByIdApi(shortlistId),
        getShortlistPlayersApi(shortlistId),
      ]);
      setShortlist(shortlistData);
      setPlayers(playersData);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setError('UNAUTHORIZED');
      } else if (err.message?.includes('404') || err.message?.toLowerCase().includes('not found')) {
        setError('Shortlist not found.');
      } else if (err.message?.includes('403') || err.message?.toLowerCase().includes('forbidden')) {
        setError('You do not have permission to view this shortlist.');
      } else {
        setError(err.message || 'Unable to load shortlist details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchShortlistData();
  }, [shortlistId]);

  // --- EDIT SCOUT NOTE FLOW ---
  const handleOpenNoteModal = (item: ShortlistPlayerItem) => {
    setEditingPlayerNote(item);
    setNoteInput(item.note || '');
    setNoteError(null);
  };

  const handleCloseNoteModal = () => {
    setEditingPlayerNote(null);
    setNoteInput('');
    setNoteError(null);
  };

  const handleSaveNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayerNote) return;

    setSubmittingNote(true);
    setNoteError(null);

    const formattedNote = noteInput.trim() ? noteInput.trim() : null;

    try {
      const updated = await updateShortlistPlayerNoteApi(
        shortlistId,
        editingPlayerNote.playerId,
        formattedNote,
      );

      // Update displayed note in state
      setPlayers((prev) =>
        prev.map((p) =>
          p.playerId === editingPlayerNote.playerId
            ? { ...p, note: updated.note }
            : p,
        ),
      );

      handleCloseNoteModal();
      showToast('Scout note updated successfully!');
    } catch (err: any) {
      setNoteError(err.message || 'Failed to update scout note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  // --- REMOVE PLAYER FLOW ---
  const handleOpenRemoveModal = (item: ShortlistPlayerItem) => {
    setRemovingPlayer(item);
    setRemoveError(null);
  };

  const handleCloseRemoveModal = () => {
    setRemovingPlayer(null);
    setRemoveError(null);
  };

  const handleConfirmRemove = async () => {
    if (!removingPlayer) return;

    setSubmittingRemove(true);
    setRemoveError(null);

    try {
      await removePlayerFromShortlistApi(shortlistId, removingPlayer.playerId);

      // Remove relationship from UI without full page reload
      setPlayers((prev) => prev.filter((p) => p.playerId !== removingPlayer.playerId));
      showToast(`Removed ${removingPlayer.player?.name || 'Player'} from shortlist.`);
      handleCloseRemoveModal();
    } catch (err: any) {
      setRemoveError(err.message || 'Failed to remove player from shortlist.');
    } finally {
      setSubmittingRemove(false);
    }
  };

  const calculateAge = (dateOfBirth?: string | null): number | null => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  // Unauthorized State
  if (error === 'UNAUTHORIZED' || !isAuthenticated) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '40px 24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            Authentication Required
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
            Please log in to view and manage this shortlist.
          </p>
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="scout-btn scout-btn-primary"
            style={{ padding: '10px 28px', fontSize: '14px' }}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scout-b2b-page-container" style={{ maxWidth: '1360px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="scout-toast">
          <span style={{ color: '#34d399' }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Back Navigation Button */}
      <button
        type="button"
        onClick={onBack}
        className="scout-btn scout-btn-secondary"
        style={{ marginBottom: '24px', padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <span>←</span>
        <span>My Shortlists</span>
      </button>

      {/* 2. Error State */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '40px 24px', textAlign: 'center', maxWidth: '540px', margin: '20px auto' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⛔</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b', margin: '0 0 8px 0' }}>
            Shortlist Unavailable
          </h3>
          <p style={{ fontSize: '13.5px', color: '#b91c1c', marginBottom: '20px', lineHeight: 1.5 }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={onBack}
              className="scout-btn scout-btn-secondary"
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              Return to Shortlists
            </button>
            <button
              type="button"
              onClick={fetchShortlistData}
              className="scout-btn scout-btn-primary"
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* 3. Loading State */}
      {loading && !error && (
        <div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
            <div style={{ height: '28px', width: '40%', background: '#e2e8f0', borderRadius: '6px', marginBottom: '12px' }} />
            <div style={{ height: '16px', width: '65%', background: '#e2e8f0', borderRadius: '4px', marginBottom: '8px' }} />
            <div style={{ height: '14px', width: '20%', background: '#e2e8f0', borderRadius: '4px' }} />
          </div>
          <div className="scout-shortlist-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="scout-shortlist-card" style={{ height: '220px', background: '#f8fafc' }} />
            ))}
          </div>
        </div>
      )}

      {/* 4. Shortlist Header & Player List */}
      {!loading && !error && shortlist && (
        <div>
          {/* Header Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              marginBottom: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                {shortlist.name}
              </h1>
              <span className={shortlist.visibility === 'PUBLIC' ? 'scout-badge-public' : 'scout-badge-private'}>
                {shortlist.visibility === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
              </span>
              <span className="scout-badge" style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 800 }}>
                {players.length} {players.length === 1 ? 'Target' : 'Targets'}
              </span>
            </div>

            <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.5, maxWidth: '800px' }}>
              {shortlist.description ? (
                shortlist.description
              ) : (
                <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No description provided</span>
              )}
            </p>
          </div>

          {/* Empty Shortlist Area */}
          {players.length === 0 && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '64px 24px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚽</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
                No players in this shortlist yet.
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0, maxWidth: '480px', marginInline: 'auto', lineHeight: 1.5 }}>
                Add players from Player Search, Player Detail, or Compare Player.
              </p>
            </div>
          )}

          {/* Player Cards Grid */}
          {players.length > 0 && (
            <div className="scout-shortlist-grid">
              {players.map((item) => {
                const player = item.player;
                const age = calculateAge(player?.dateOfBirth);

                return (
                  <div key={item.id} className="scout-shortlist-card">
                    <div>
                      {/* Player Profile Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#64748b', flexShrink: 0 }}>
                          {player?.imageUrl ? (
                            <img
                              src={player.imageUrl}
                              alt={player.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{player?.shirtNumber || '⚽'}</span>
                          )}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3
                            style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            title={player?.name}
                          >
                            {player?.name || 'Unknown Player'}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                            {player?.primaryPosition && (
                              <span style={{ background: '#0f172a', color: '#ffffff', fontSize: '10px', fontWeight: 900, padding: '1px 6px', borderRadius: '4px' }}>
                                {player.primaryPosition}
                              </span>
                            )}
                            {player?.currentTeam && (
                              <span style={{ fontWeight: 600, color: '#334155' }}>
                                {player.currentTeam.name}
                              </span>
                            )}
                            {age && <span>• {age} yrs</span>}
                            {player?.nationality && <span>• {player.nationality}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Scout Note Box */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            📝 Scout Note
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenNoteModal(item)}
                            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                          >
                            {item.note ? 'Edit Note' : '+ Add Note'}
                          </button>
                        </div>
                        <p style={{ fontSize: '12.5px', color: '#334155', margin: 0, lineHeight: 1.5, fontStyle: item.note ? 'normal' : 'italic' }}>
                          {item.note || <span style={{ color: '#94a3b8' }}>No scouting notes recorded yet.</span>}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons with [Remove] */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenRemoveModal(item)}
                        className="scout-btn scout-btn-sm"
                        style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 700, padding: '7px 14px' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EDIT SCOUT NOTE MODAL */}
      {editingPlayerNote && (
        <div className="scout-modal-overlay" onClick={handleCloseNoteModal}>
          <div className="scout-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="scout-modal-header">
              <div>
                <h3 className="scout-modal-title">Scout Note</h3>
                <p className="scout-modal-subtitle">Notes for {editingPlayerNote.player?.name || 'Player'}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseNoteModal}
                className="scout-modal-close-btn"
                title="Close"
              >
                ✕
              </button>
            </div>

            {noteError && (
              <div className="alert-banner alert-error" style={{ margin: '0 0 14px 0', padding: '10px 14px', fontSize: '12.5px' }}>
                ⚠️ {noteError}
              </div>
            )}

            <form onSubmit={handleSaveNoteSubmit} className="scout-modal-body">
              <div>
                <textarea
                  rows={4}
                  autoFocus
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="e.g. Strong 1v1 defender. Good recovery pace."
                  className="scout-input"
                  style={{ resize: 'none', height: 'auto', minHeight: '100px', padding: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setNoteInput('')}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Clear Note
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCloseNoteModal}
                    disabled={submittingNote}
                    className="scout-btn scout-btn-secondary"
                    style={{ padding: '8px 16px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingNote}
                    className="scout-btn scout-btn-primary"
                    style={{ padding: '8px 20px' }}
                  >
                    {submittingNote ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE PLAYER CONFIRMATION MODAL */}
      {removingPlayer && (
        <div className="scout-modal-overlay" onClick={handleCloseRemoveModal}>
          <div className="scout-modal-dialog" style={{ maxWidth: '420px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✕</div>
            <h3 className="scout-modal-title" style={{ marginBottom: '8px' }}>
              Remove Player?
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
              Remove <strong style={{ color: '#0f172a' }}>"{removingPlayer.player?.name || 'Player'}"</strong> from <strong style={{ color: '#0f172a' }}>"{shortlist?.name || 'this shortlist'}"</strong>?
            </p>

            {removeError && (
              <div className="alert-banner alert-error" style={{ margin: '0 0 16px 0', padding: '10px 14px', fontSize: '12.5px' }}>
                ⚠️ {removeError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleCloseRemoveModal}
                disabled={submittingRemove}
                className="scout-btn scout-btn-secondary"
                style={{ width: '120px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={submittingRemove}
                className="scout-btn"
                style={{ width: '140px', background: '#ef4444', color: '#ffffff', border: 'none', fontWeight: 700 }}
              >
                {submittingRemove ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
