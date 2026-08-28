import React, { useState, useEffect } from 'react';
import type { Shortlist, ShortlistVisibility } from '../types/shortlist.types';
import {
  getShortlistsApi,
  createShortlistApi,
  updateShortlistApi,
  deleteShortlistApi,
} from '../services/shortlist.service';

interface MyShortlistsPageProps {
  onOpenShortlist?: (id: string) => void;
  onNavigateToLogin?: () => void;
  isAuthenticated?: boolean;
}

export const MyShortlistsPage: React.FC<MyShortlistsPageProps> = ({
  onOpenShortlist,
  onNavigateToLogin,
  isAuthenticated = true,
}) => {
  // Shortlists Data State
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create Shortlist Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>('');
  const [createDescription, setCreateDescription] = useState<string>('');
  const [createVisibility, setCreateVisibility] = useState<ShortlistVisibility>('PRIVATE');
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Shortlist Modal State
  const [editingShortlist, setEditingShortlist] = useState<Shortlist | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editVisibility, setEditVisibility] = useState<ShortlistVisibility>('PRIVATE');
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Shortlist Modal State
  const [deletingShortlist, setDeletingShortlist] = useState<Shortlist | null>(null);
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

  const fetchShortlists = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShortlistsApi();
      setShortlists(data);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setError('UNAUTHORIZED');
      } else {
        setError(err.message || 'Unable to load your shortlists.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchShortlists();
  }, []);

  // --- CREATE FLOW ---
  const handleOpenCreateModal = () => {
    setCreateName('');
    setCreateDescription('');
    setCreateVisibility('PRIVATE');
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateName('');
    setCreateDescription('');
    setCreateVisibility('PRIVATE');
    setCreateError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = createName.trim();
    if (!trimmedName) {
      setCreateError('Shortlist name is required.');
      return;
    }

    if (trimmedName.length > 150) {
      setCreateError('Shortlist name cannot exceed 150 characters.');
      return;
    }

    setSubmittingCreate(true);
    setCreateError(null);

    try {
      const newShortlist = await createShortlistApi({
        name: trimmedName,
        description: createDescription.trim() || undefined,
        visibility: createVisibility,
      });

      setShortlists((prev) => [newShortlist, ...prev]);
      handleCloseCreateModal();
      showToast(`Shortlist "${newShortlist.name}" created successfully!`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create shortlist.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // --- EDIT FLOW ---
  const handleOpenEditModal = (shortlist: Shortlist) => {
    setEditingShortlist(shortlist);
    setEditName(shortlist.name);
    setEditDescription(shortlist.description || '');
    setEditVisibility(shortlist.visibility);
    setEditError(null);
  };

  const handleCloseEditModal = () => {
    setEditingShortlist(null);
    setEditName('');
    setEditDescription('');
    setEditVisibility('PRIVATE');
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShortlist) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Shortlist name is required.');
      return;
    }

    if (trimmedName.length > 150) {
      setEditError('Shortlist name cannot exceed 150 characters.');
      return;
    }

    setSubmittingEdit(true);
    setEditError(null);

    try {
      const updated = await updateShortlistApi(editingShortlist.id, {
        name: trimmedName,
        description: editDescription.trim() || null,
        visibility: editVisibility,
      });

      setShortlists((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
      );
      handleCloseEditModal();
      showToast(`Shortlist "${updated.name}" updated successfully!`);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update shortlist.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // --- DELETE FLOW ---
  const handleOpenDeleteModal = (shortlist: Shortlist) => {
    setDeletingShortlist(shortlist);
    setDeleteError(null);
  };

  const handleCloseDeleteModal = () => {
    setDeletingShortlist(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingShortlist) return;

    setSubmittingDelete(true);
    setDeleteError(null);

    try {
      await deleteShortlistApi(deletingShortlist.id);
      setShortlists((prev) => prev.filter((s) => s.id !== deletingShortlist.id));
      showToast(`Shortlist "${deletingShortlist.name}" deleted.`);
      handleCloseDeleteModal();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete shortlist.');
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
      return dateStr;
    }
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
            Please log in to view and manage your scouting shortlists.
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

      {/* 1. Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            My Shortlists
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '6px 0 0 0', fontWeight: 500 }}>
            Manage your scouting lists
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="scout-btn scout-btn-primary"
          style={{ padding: '10px 22px', fontSize: '13.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>+</span>
          <span>New Shortlist</span>
        </button>
      </div>

      {/* 2. Loading State */}
      {loading && (
        <div>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', fontWeight: 600 }}>
            Loading your shortlists...
          </p>
          <div className="scout-shortlist-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="scout-shortlist-card" style={{ height: '180px', pointerEvents: 'none', background: '#f8fafc' }}>
                <div style={{ height: '20px', width: '60%', background: '#e2e8f0', borderRadius: '6px', marginBottom: '10px' }} />
                <div style={{ height: '14px', width: '90%', background: '#e2e8f0', borderRadius: '4px', marginBottom: '6px' }} />
                <div style={{ height: '14px', width: '40%', background: '#e2e8f0', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Error State */}
      {!loading && error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '40px 24px', textAlign: 'center', maxWidth: '540px', margin: '40px auto' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b', margin: '0 0 8px 0' }}>
            Unable to load your shortlists.
          </h3>
          <p style={{ fontSize: '13.5px', color: '#b91c1c', marginBottom: '20px', lineHeight: 1.5 }}>
            {error}
          </p>
          <button
            type="button"
            onClick={fetchShortlists}
            className="scout-btn scout-btn-primary"
            style={{ padding: '10px 24px', fontSize: '13px' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Empty State */}
      {!loading && !error && shortlists.length === 0 && (
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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            No shortlists yet.
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px 0', maxWidth: '440px', marginInline: 'auto', lineHeight: 1.5 }}>
            Create your first scouting list to start tracking players.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="scout-btn scout-btn-primary"
            style={{ padding: '10px 22px', fontSize: '13.5px' }}
          >
            + New Shortlist
          </button>
        </div>
      )}

      {/* 5. Shortlists Cards Grid */}
      {!loading && !error && shortlists.length > 0 && (
        <div className="scout-shortlist-grid">
          {shortlists.map((sl) => (
            <div key={sl.id} className="scout-shortlist-card">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                  <h3
                    onClick={() => onOpenShortlist && onOpenShortlist(sl.id)}
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: 0,
                      lineHeight: 1.3,
                      cursor: onOpenShortlist ? 'pointer' : 'default',
                    }}
                  >
                    {sl.name}
                  </h3>
                  <span className={sl.visibility === 'PUBLIC' ? 'scout-badge-public' : 'scout-badge-private'}>
                    {sl.visibility === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5, minHeight: '36px' }}>
                  {sl.description ? (
                    sl.description
                  ) : (
                    <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No description provided</span>
                  )}
                </p>
              </div>

              {/* Card Footer with [Open] [Edit] [Delete] */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#94a3b8', fontWeight: 600 }}>
                  <span>Updated {formatDate(sl.updatedAt || sl.createdAt)}</span>
                  {sl.playerCount !== undefined && (
                    <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      👥 {sl.playerCount}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => onOpenShortlist && onOpenShortlist(sl.id)}
                    className="scout-btn scout-btn-sm"
                    style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 700, padding: '8px 4px' }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(sl)}
                    className="scout-btn scout-btn-sm scout-btn-secondary"
                    style={{ padding: '8px 4px', fontWeight: 700 }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDeleteModal(sl)}
                    className="scout-btn scout-btn-sm"
                    style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 700, padding: '8px 4px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE SHORTLIST MODAL */}
      {isCreateModalOpen && (
        <div className="scout-modal-overlay" onClick={handleCloseCreateModal}>
          <div className="scout-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="scout-modal-header">
              <div>
                <h3 className="scout-modal-title">Create New Shortlist</h3>
                <p className="scout-modal-subtitle">Add a dedicated watchlist for scouting targets</p>
              </div>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="scout-modal-close-btn"
                title="Close"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="alert-banner alert-error" style={{ margin: '0 0 16px 0', padding: '10px 14px', fontSize: '12.5px' }}>
                ⚠️ {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="scout-modal-body">
              {/* Name Field */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  autoFocus
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    if (createError) setCreateError(null);
                  }}
                  placeholder="e.g. European U21 Targets"
                  className="scout-input"
                />
              </div>

              {/* Description Field */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Young players to monitor for summer transfer window..."
                  className="scout-input"
                  style={{ resize: 'none', height: 'auto', minHeight: '80px', padding: '10px' }}
                />
              </div>

              {/* Visibility Options */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Visibility
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    onClick={() => setCreateVisibility('PRIVATE')}
                    className={`scout-radio-option ${createVisibility === 'PRIVATE' ? 'selected' : ''}`}
                    style={{ margin: 0 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="radio"
                        name="createVisibility"
                        checked={createVisibility === 'PRIVATE'}
                        onChange={() => setCreateVisibility('PRIVATE')}
                        style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        PRIVATE
                      </span>
                    </div>
                    <span className="scout-badge-private">🔒 Private</span>
                  </label>

                  <label
                    onClick={() => setCreateVisibility('PUBLIC')}
                    className={`scout-radio-option ${createVisibility === 'PUBLIC' ? 'selected' : ''}`}
                    style={{ margin: 0 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="radio"
                        name="createVisibility"
                        checked={createVisibility === 'PUBLIC'}
                        onChange={() => setCreateVisibility('PUBLIC')}
                        style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        PUBLIC
                      </span>
                    </div>
                    <span className="scout-badge-public">🌐 Public</span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="scout-modal-footer">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  disabled={submittingCreate}
                  className="scout-btn scout-btn-secondary"
                  style={{ padding: '8px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate || !createName.trim()}
                  className="scout-btn scout-btn-primary"
                  style={{ padding: '8px 22px' }}
                >
                  {submittingCreate ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SHORTLIST MODAL */}
      {editingShortlist && (
        <div className="scout-modal-overlay" onClick={handleCloseEditModal}>
          <div className="scout-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="scout-modal-header">
              <div>
                <h3 className="scout-modal-title">Edit Shortlist</h3>
                <p className="scout-modal-subtitle">Update shortlist details</p>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="scout-modal-close-btn"
                title="Close"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="alert-banner alert-error" style={{ margin: '0 0 16px 0', padding: '10px 14px', fontSize: '12.5px' }}>
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="scout-modal-body">
              {/* Name Field */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  autoFocus
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  className="scout-input"
                />
              </div>

              {/* Description Field */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="scout-input"
                  style={{ resize: 'none', height: 'auto', minHeight: '80px', padding: '10px' }}
                />
              </div>

              {/* Visibility Options */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Visibility
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    onClick={() => setEditVisibility('PRIVATE')}
                    className={`scout-radio-option ${editVisibility === 'PRIVATE' ? 'selected' : ''}`}
                    style={{ margin: 0 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="radio"
                        name="editVisibility"
                        checked={editVisibility === 'PRIVATE'}
                        onChange={() => setEditVisibility('PRIVATE')}
                        style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        PRIVATE
                      </span>
                    </div>
                    <span className="scout-badge-private">🔒 Private</span>
                  </label>

                  <label
                    onClick={() => setEditVisibility('PUBLIC')}
                    className={`scout-radio-option ${editVisibility === 'PUBLIC' ? 'selected' : ''}`}
                    style={{ margin: 0 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="radio"
                        name="editVisibility"
                        checked={editVisibility === 'PUBLIC'}
                        onChange={() => setEditVisibility('PUBLIC')}
                        style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        PUBLIC
                      </span>
                    </div>
                    <span className="scout-badge-public">🌐 Public</span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="scout-modal-footer">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={submittingEdit}
                  className="scout-btn scout-btn-secondary"
                  style={{ padding: '8px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit || !editName.trim()}
                  className="scout-btn scout-btn-primary"
                  style={{ padding: '8px 22px' }}
                >
                  {submittingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingShortlist && (
        <div className="scout-modal-overlay" onClick={handleCloseDeleteModal}>
          <div className="scout-modal-dialog" style={{ maxWidth: '420px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
            <h3 className="scout-modal-title" style={{ marginBottom: '8px' }}>
              Delete Shortlist?
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
              <strong style={{ color: '#0f172a' }}>"{deletingShortlist.name}"</strong> will be permanently deleted.
            </p>

            {deleteError && (
              <div className="alert-banner alert-error" style={{ margin: '0 0 16px 0', padding: '10px 14px', fontSize: '12.5px' }}>
                ⚠️ {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={submittingDelete}
                className="scout-btn scout-btn-secondary"
                style={{ width: '120px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submittingDelete}
                className="scout-btn"
                style={{ width: '140px', background: '#ef4444', color: '#ffffff', border: 'none', fontWeight: 700 }}
              >
                {submittingDelete ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
