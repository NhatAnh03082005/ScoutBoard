import React, { useState, useEffect } from 'react';
import type { Shortlist, ShortlistVisibility } from '../../types/shortlist.types';
import {
  getShortlistsApi,
  createShortlistApi,
  addPlayerToShortlistApi,
} from '../../services/shortlist.service';

export interface AddToShortlistPlayerInfo {
  id: string;
  name?: string;
  fullName?: string;
  imageUrl?: string | null;
  primaryPosition?: string | null;
  currentTeam?: {
    name?: string;
    shortName?: string | null;
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

  // Inline Create New Shortlist State
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newVisibility, setNewVisibility] = useState<ShortlistVisibility>('PRIVATE');

  // Submitting
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void fetchUserShortlists();
      setScoutNote('');
      setIsCreatingNew(false);
      setNewName('');
      setNewDescription('');
      setNewVisibility('PRIVATE');
      setActionError(null);
    }
  }, [isOpen]);

  const fetchUserShortlists = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShortlistsApi();
      setShortlists(data);
      if (data.length > 0) {
        setSelectedShortlistId(data[0].id);
      } else {
        setIsCreatingNew(true);
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
    setSubmitting(true);

    try {
      let targetShortlistId = selectedShortlistId;
      let targetShortlistName = '';

      if (isCreatingNew) {
        if (!newName.trim()) {
          setActionError('Please enter a name for the new shortlist');
          setSubmitting(false);
          return;
        }

        const created = await createShortlistApi({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          visibility: newVisibility,
        });

        targetShortlistId = created.id;
        targetShortlistName = created.name;
      } else {
        const selected = shortlists.find((s) => s.id === targetShortlistId);
        targetShortlistName = selected ? selected.name : 'Shortlist';
      }

      if (!targetShortlistId) {
        setActionError('Please select or create a shortlist');
        setSubmitting(false);
        return;
      }

      await addPlayerToShortlistApi(
        targetShortlistId,
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

  return (
    <div className="scout-modal-overlay" onClick={onClose}>
      <div className="scout-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="scout-modal-header">
          <div>
            <h3 className="scout-modal-title">Add to Shortlist</h3>
            <p className="scout-modal-subtitle">Save player to your scouting watchlists</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="scout-modal-close-btn"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Player Summary Card */}
        <div className="scout-modal-player-card" style={{ marginBottom: '18px' }}>
          <div className="scout-modal-player-avatar">
            {player.imageUrl ? (
              <img
                src={player.imageUrl}
                alt={playerName}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span>⚽</span>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              {playerName}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
              {player.primaryPosition && (
                <span style={{ background: '#0f172a', color: '#ffffff', fontSize: '10px', fontWeight: 900, padding: '1px 6px', borderRadius: '4px' }}>
                  {player.primaryPosition}
                </span>
              )}
              <span style={{ fontWeight: 600, color: '#334155' }}>{teamName}</span>
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
              className="scout-btn scout-btn-primary"
              style={{ padding: '10px 24px', fontSize: '13px' }}
            >
              Log In Now
            </button>
          </div>
        ) : (
          <form onSubmit={handleAddSubmit} className="scout-modal-body">
            {actionError && (
              <div className="alert-banner alert-error" style={{ margin: 0, padding: '10px 14px', fontSize: '12.5px' }}>
                {actionError}
              </div>
            )}

            {/* Toggle Existing vs Create New */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {isCreatingNew ? 'Create New Shortlist' : 'Select Target Shortlist'}
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                {isCreatingNew ? '← Choose Existing List' : '+ Create New List'}
              </button>
            </div>

            {/* Mode 1: Select Existing */}
            {!isCreatingNew && (
              <div>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ height: '48px', background: '#f1f5f9', borderRadius: '10px' }}></div>
                    <div style={{ height: '48px', background: '#f1f5f9', borderRadius: '10px' }}></div>
                  </div>
                ) : shortlists.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px' }}>
                    No shortlists found. Click <strong>'+ Create New List'</strong> above to create one.
                  </div>
                ) : (
                  <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                    {shortlists.map((sl) => (
                      <div
                        key={sl.id}
                        onClick={() => setSelectedShortlistId(sl.id)}
                        className={`scout-radio-option ${selectedShortlistId === sl.id ? 'selected' : ''}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <input
                            type="radio"
                            name="shortlistSelection"
                            checked={selectedShortlistId === sl.id}
                            onChange={() => setSelectedShortlistId(sl.id)}
                            style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                          />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sl.name}
                          </span>
                        </div>
                        <span className={sl.visibility === 'PUBLIC' ? 'scout-badge-public' : 'scout-badge-private'}>
                          {sl.visibility === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Inline Create New Shortlist Subform */}
            {isCreatingNew && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Shortlist Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Champions League Targets"
                    className="scout-input"
                    style={{ background: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Short summary..."
                    className="scout-input"
                    style={{ background: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Visibility
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setNewVisibility('PRIVATE')}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: newVisibility === 'PRIVATE' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: newVisibility === 'PRIVATE' ? '#eff6ff' : '#ffffff',
                        color: newVisibility === 'PRIVATE' ? '#1e40af' : '#475569',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      🔒 Private
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewVisibility('PUBLIC')}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: newVisibility === 'PUBLIC' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: newVisibility === 'PUBLIC' ? '#eff6ff' : '#ffffff',
                        color: newVisibility === 'PUBLIC' ? '#1e40af' : '#475569',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      🌐 Public
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Optional Scout Note */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Initial Scout Note <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={scoutNote}
                onChange={(e) => setScoutNote(e.target.value)}
                placeholder="Tactical strengths, press resistance, scouting observations..."
                className="scout-input"
                style={{ resize: 'none', height: 'auto', minHeight: '60px', padding: '10px' }}
              />
            </div>

            {/* Footer Actions */}
            <div className="scout-modal-footer">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="scout-btn scout-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12.5px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (isCreatingNew && !newName.trim()) || (!isCreatingNew && !selectedShortlistId)}
                className="scout-btn scout-btn-primary"
                style={{ padding: '8px 20px', fontSize: '12.5px' }}
              >
                {submitting ? 'Adding...' : 'Add to Shortlist'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
