import React, { useState, useEffect } from 'react';
import type { Squad, SquadVisibility, FormationCode } from '../types/squad.types';
import {
  getSquadsApi,
  createSquadApi,
  updateSquadApi,
  deleteSquadApi,
} from '../services/squad.service';

interface MySquadsPageProps {
  onOpenSquad?: (id: string) => void;
  onNavigateToLogin?: () => void;
  isAuthenticated?: boolean;
}

const FORMATION_OPTIONS: FormationCode[] = [
  '4-3-3',
  '4-2-3-1',
  '4-4-2',
  '3-5-2',
  '3-4-3',
];

export const MySquadsPage: React.FC<MySquadsPageProps> = ({
  onOpenSquad,
  onNavigateToLogin,
  isAuthenticated = true,
}) => {
  // Squads Data State
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create Squad Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>('');
  const [createFormation, setCreateFormation] = useState<FormationCode>('4-3-3');
  const [createDescription, setCreateDescription] = useState<string>('');
  const [createVisibility, setCreateVisibility] = useState<SquadVisibility>('PRIVATE');
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Squad Modal State
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editFormation, setEditFormation] = useState<FormationCode>('4-3-3');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editVisibility, setEditVisibility] = useState<SquadVisibility>('PRIVATE');
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Squad Modal State
  const [deletingSquad, setDeletingSquad] = useState<Squad | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const fetchSquads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSquadsApi();
      setSquads(data);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setError('UNAUTHORIZED');
      } else {
        setError(err.message || 'Unable to load your squads.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSquads();
  }, []);

  // --- CREATE FLOW ---
  const handleOpenCreateModal = () => {
    setCreateName('');
    setCreateFormation('4-3-3');
    setCreateDescription('');
    setCreateVisibility('PRIVATE');
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateName('');
    setCreateFormation('4-3-3');
    setCreateDescription('');
    setCreateVisibility('PRIVATE');
    setCreateError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = createName.trim();
    if (!trimmedName) {
      setCreateError('Squad name is required.');
      return;
    }

    if (trimmedName.length > 150) {
      setCreateError('Squad name cannot exceed 150 characters.');
      return;
    }

    if (!createFormation || !FORMATION_OPTIONS.includes(createFormation)) {
      setCreateError('Please select a valid tactical formation.');
      return;
    }

    setSubmittingCreate(true);
    setCreateError(null);

    try {
      const newSquad = await createSquadApi({
        name: trimmedName,
        formationCode: createFormation,
        description: createDescription.trim() || undefined,
        visibility: createVisibility,
      });

      setSquads((prev) => [newSquad, ...prev]);
      handleCloseCreateModal();
      showToast(`Squad "${newSquad.name}" created successfully!`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create squad.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // --- EDIT FLOW ---
  const handleOpenEditModal = (squad: Squad) => {
    setEditingSquad(squad);
    setEditName(squad.name);
    setEditFormation((squad.formationCode as FormationCode) || '4-3-3');
    setEditDescription(squad.description || '');
    setEditVisibility(squad.visibility);
    setEditError(null);
  };

  const handleCloseEditModal = () => {
    setEditingSquad(null);
    setEditName('');
    setEditFormation('4-3-3');
    setEditDescription('');
    setEditVisibility('PRIVATE');
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSquad) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Squad name is required.');
      return;
    }

    if (trimmedName.length > 150) {
      setEditError('Squad name cannot exceed 150 characters.');
      return;
    }

    if (!editFormation || !FORMATION_OPTIONS.includes(editFormation)) {
      setEditError('Please select a valid tactical formation.');
      return;
    }

    setSubmittingEdit(true);
    setEditError(null);

    try {
      const updated = await updateSquadApi(editingSquad.id, {
        name: trimmedName,
        formationCode: editFormation,
        description: editDescription.trim() || null,
        visibility: editVisibility,
      });

      setSquads((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
      );
      handleCloseEditModal();
      showToast(`Squad "${updated.name}" updated successfully!`);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update squad.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // --- DELETE FLOW ---
  const handleOpenDeleteModal = (squad: Squad) => {
    setDeletingSquad(squad);
    setDeleteError(null);
  };

  const handleCloseDeleteModal = () => {
    setDeletingSquad(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSquad) return;

    setSubmittingDelete(true);
    setDeleteError(null);

    try {
      await deleteSquadApi(deletingSquad.id);
      setSquads((prev) => prev.filter((s) => s.id !== deletingSquad.id));
      showToast(`Squad "${deletingSquad.name}" deleted.`);
      handleCloseDeleteModal();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete squad.');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      className="scout-page-container"
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '32px 20px 80px',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="scout-toast scout-toast-success"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '9999px',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px',
            }}
          >
            Tactical Pitch
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#f8fafc',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}
          >
            My Squads
          </h1>
          <p
            style={{
              color: '#94a3b8',
              fontSize: '14px',
              margin: 0,
            }}
          >
            Build, simulate, and manage tactical squad formations
          </p>
        </div>

        <button
          type="button"
          className="scout-btn"
          id="btn-create-new-squad"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '10px',
            boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)',
          }}
          onClick={handleOpenCreateModal}
        >
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>+</span> New Squad
        </button>
      </div>

      {/* 1. UNAUTHORIZED STATE */}
      {error === 'UNAUTHORIZED' || (!isAuthenticated && !loading) ? (
        <div
          className="scout-empty-state"
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h3 style={{ fontSize: '18px', color: '#f8fafc', margin: '0 0 8px' }}>
            Authentication Required
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px' }}>
            Please log in to your ScoutBoard account to view and manage your tactical squads.
          </p>
          {onNavigateToLogin && (
            <button
              type="button"
              className="scout-btn"
              onClick={onNavigateToLogin}
              style={{ padding: '8px 24px' }}
            >
              Log In Now
            </button>
          )}
        </div>
      ) : null}

      {/* 2. ERROR STATE */}
      {error && error !== 'UNAUTHORIZED' ? (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <h4 style={{ margin: '0 0 2px', color: '#fca5a5', fontSize: '15px' }}>
                Failed to load squads
              </h4>
              <p style={{ margin: 0, color: '#fecaca', fontSize: '13px' }}>
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="scout-btn scout-btn-secondary"
            onClick={fetchSquads}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            🔄 Retry
          </button>
        </div>
      ) : null}

      {/* 3. LOADING SKELETON */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '24px',
                height: '180px',
                animation: 'pulse 1.5s infinite',
              }}
            >
              <div
                style={{
                  width: '60%',
                  height: '20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  marginBottom: '12px',
                }}
              />
              <div
                style={{
                  width: '40%',
                  height: '14px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: '4px',
                  marginBottom: '20px',
                }}
              />
              <div
                style={{
                  width: '80%',
                  height: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* 4. EMPTY STATE */}
      {!loading && !error && squads.length === 0 ? (
        <div
          className="scout-empty-state"
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            padding: '64px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 16px',
            }}
          >
            🛡️
          </div>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#f8fafc',
              margin: '0 0 8px',
            }}
          >
            No squads created yet
          </h3>
          <p
            style={{
              color: '#94a3b8',
              fontSize: '14px',
              maxWidth: '420px',
              margin: '0 auto 24px',
              lineHeight: 1.5,
            }}
          >
            You haven't created any tactical squads yet. Build your first dream lineup with flexible formations and custom roles.
          </p>
          <button
            type="button"
            className="scout-btn"
            style={{ padding: '10px 24px' }}
            onClick={handleOpenCreateModal}
          >
            + Create First Squad
          </button>
        </div>
      ) : null}

      {/* 5. SQUAD CARDS LIST */}
      {!loading && !error && squads.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {squads.map((squad) => (
            <div
              key={squad.id}
              className="scout-shortlist-card"
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s ease',
              }}
            >
              <div>
                {/* Header info */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                    }}
                  >
                    ⚽ {squad.formationCode}
                  </span>

                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background:
                        squad.visibility === 'PUBLIC'
                          ? 'rgba(34, 197, 94, 0.12)'
                          : 'rgba(148, 163, 184, 0.12)',
                      color:
                        squad.visibility === 'PUBLIC' ? '#4ade80' : '#94a3b8',
                    }}
                  >
                    {squad.visibility}
                  </span>
                </div>

                {/* Squad Name */}
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#f8fafc',
                    margin: '0 0 8px',
                    cursor: onOpenSquad ? 'pointer' : 'default',
                  }}
                  onClick={() => onOpenSquad && onOpenSquad(squad.id)}
                >
                  {squad.name}
                </h3>

                {/* Description */}
                {squad.description && (
                  <p
                    style={{
                      color: '#94a3b8',
                      fontSize: '13px',
                      margin: '0 0 16px',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {squad.description}
                  </p>
                )}
              </div>

              {/* Card Footer with [Open], [Edit], [Delete] */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  marginTop: '16px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                  }}
                >
                  Updated {formatDate(squad.updatedAt)}
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="scout-btn scout-btn-sm scout-btn-secondary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                    }}
                    onClick={() => onOpenSquad && onOpenSquad(squad.id)}
                  >
                    Open
                  </button>

                  <button
                    type="button"
                    className="scout-btn scout-btn-sm scout-btn-secondary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                    }}
                    onClick={() => handleOpenEditModal(squad)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="scout-btn scout-btn-sm"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                    onClick={() => handleOpenDeleteModal(squad)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* --- CREATE SQUAD MODAL --- */}
      {isCreateModalOpen && (
        <div className="scout-modal-overlay" onClick={handleCloseCreateModal}>
          <div
            className="scout-modal-dialog"
            style={{
              maxWidth: '520px',
              width: '90%',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '28px',
              color: '#f8fafc',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#f8fafc',
                }}
              >
                Create New Squad
              </h3>
              <button
                type="button"
                className="scout-modal-close"
                onClick={handleCloseCreateModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {createError && (
              <div
                className="alert-banner alert-error"
                style={{ marginBottom: '16px', fontSize: '13px' }}
              >
                ⚠️ {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit}>
              {/* Name Field */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: '6px',
                  }}
                >
                  Squad Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="scout-input"
                  placeholder="e.g. Dream Team EPL 2026"
                  maxLength={150}
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  disabled={submittingCreate}
                  autoFocus
                />
              </div>

              {/* Formation Code Field */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: '6px',
                  }}
                >
                  Tactical Formation <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {FORMATION_OPTIONS.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      style={{
                        padding: '8px 6px',
                        borderRadius: '8px',
                        border:
                          createFormation === fmt
                            ? '1px solid #38bdf8'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        background:
                          createFormation === fmt
                            ? 'rgba(56, 189, 248, 0.2)'
                            : 'rgba(30, 41, 59, 0.4)',
                        color: createFormation === fmt ? '#38bdf8' : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setCreateFormation(fmt)}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Field */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: '6px',
                  }}
                >
                  Tactical Notes & Description (Optional)
                </label>
                <textarea
                  className="scout-input"
                  style={{ minHeight: '75px', resize: 'vertical' }}
                  placeholder="Notes on pressing style, attacking build-up, set pieces..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  disabled={submittingCreate}
                />
              </div>

              {/* Visibility Option */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: '8px',
                  }}
                >
                  Visibility
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="create_visibility"
                      checked={createVisibility === 'PRIVATE'}
                      onChange={() => setCreateVisibility('PRIVATE')}
                      disabled={submittingCreate}
                    />
                    <span>🔒 Private (Only me)</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="create_visibility"
                      checked={createVisibility === 'PUBLIC'}
                      onChange={() => setCreateVisibility('PUBLIC')}
                      disabled={submittingCreate}
                    />
                    <span>🌐 Public (Shared)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  className="scout-btn scout-btn-secondary"
                  onClick={handleCloseCreateModal}
                  disabled={submittingCreate}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="scout-btn"
                  disabled={submittingCreate}
                >
                  {submittingCreate ? 'Creating...' : 'Create Squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT SQUAD MODAL --- */}
      {editingSquad && (
        <div className="scout-modal-overlay" onClick={handleCloseEditModal}>
          <div
            className="scout-modal-dialog"
            style={{
              maxWidth: '520px',
              width: '90%',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '28px',
              color: '#f8fafc',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#f8fafc',
                }}
              >
                Edit Squad
              </h3>
              <button
                type="button"
                className="scout-modal-close"
                onClick={handleCloseEditModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {editError && (
              <div
                className="alert-banner alert-error"
                style={{ marginBottom: '16px', fontSize: '13px' }}
              >
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              {/* Name Field */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: '6px',
                  }}
                >
                  Squad Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="scout-input"
                  maxLength={150}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={submittingEdit}
                />
              </div>

              {/* Formation Code Field */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: '6px',
                  }}
                >
                  Tactical Formation <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {FORMATION_OPTIONS.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      style={{
                        padding: '8px 6px',
                        borderRadius: '8px',
                        border:
                          editFormation === fmt
                            ? '1px solid #38bdf8'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        background:
                          editFormation === fmt
                            ? 'rgba(56, 189, 248, 0.2)'
                            : 'rgba(30, 41, 59, 0.4)',
                        color: editFormation === fmt ? '#38bdf8' : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setEditFormation(fmt)}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Field */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: '6px',
                  }}
                >
                  Tactical Notes & Description (Optional)
                </label>
                <textarea
                  className="scout-input"
                  style={{ minHeight: '75px', resize: 'vertical' }}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={submittingEdit}
                />
              </div>

              {/* Visibility Option */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: '8px',
                  }}
                >
                  Visibility
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="edit_visibility"
                      checked={editVisibility === 'PRIVATE'}
                      onChange={() => setEditVisibility('PRIVATE')}
                      disabled={submittingEdit}
                    />
                    <span>🔒 Private</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="edit_visibility"
                      checked={editVisibility === 'PUBLIC'}
                      onChange={() => setEditVisibility('PUBLIC')}
                      disabled={submittingEdit}
                    />
                    <span>🌐 Public</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  className="scout-btn scout-btn-secondary"
                  onClick={handleCloseEditModal}
                  disabled={submittingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="scout-btn"
                  disabled={submittingEdit}
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deletingSquad && (
        <div className="scout-modal-overlay" onClick={handleCloseDeleteModal}>
          <div
            className="scout-modal-dialog"
            style={{
              maxWidth: '440px',
              width: '90%',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '20px',
              padding: '28px',
              textAlign: 'center',
              color: '#f8fafc',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                fontSize: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              ⚠️
            </div>

            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#f8fafc',
                margin: '0 0 8px',
              }}
            >
              Delete Squad?
            </h3>

            <p
              style={{
                color: '#94a3b8',
                fontSize: '14px',
                lineHeight: 1.5,
                margin: '0 0 20px',
              }}
            >
              Are you sure you want to delete{' '}
              <strong style={{ color: '#f8fafc' }}>
                "{deletingSquad.name}"
              </strong>
              ? All tactical player placements in this squad will be removed. This action cannot be undone.
            </p>

            {deleteError && (
              <div
                className="alert-banner alert-error"
                style={{ marginBottom: '16px', fontSize: '13px' }}
              >
                ⚠️ {deleteError}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <button
                type="button"
                className="scout-btn scout-btn-secondary"
                onClick={handleCloseDeleteModal}
                disabled={submittingDelete}
              >
                Cancel
              </button>
              <button
                type="button"
                className="scout-btn"
                style={{
                  background: '#ef4444',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                }}
                onClick={handleDeleteConfirm}
                disabled={submittingDelete}
              >
                {submittingDelete ? 'Deleting...' : 'Delete Squad'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
