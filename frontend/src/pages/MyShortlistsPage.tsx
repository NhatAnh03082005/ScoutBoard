import React, { useState, useEffect } from 'react';
import type { Shortlist, ShortlistVisibility, ShortlistPlayerItem } from '../types/shortlist.types';
import {
  getShortlistsApi,
  createShortlistApi,
  updateShortlistApi,
  deleteShortlistApi,
  getShortlistPlayersApi,
} from '../services/shortlist.service';
import {
  CreateShortlistModal,
  ModalHeader,
  VisibilitySelector,
  ModalFooter,
  AlertCircleIcon,
  JerseyIcon,
  LockIcon,
  GlobeIcon,
} from '../components/modal';

interface MyShortlistsPageProps {
  onOpenShortlist?: (id: string) => void;
  onNavigateToLogin?: () => void;
  isAuthenticated?: boolean;
}


const getPositionBadgeStyle = (pos?: string | null) => {
  if (!pos) return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  const p = pos.toUpperCase();
  if (['ST', 'CF', 'LW', 'RW', 'SS', 'FW'].includes(p)) {
    return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }; // Attacker
  }
  if (['CM', 'CAM', 'CDM', 'LM', 'RM', 'AM', 'MF'].includes(p)) {
    return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' }; // Midfield
  }
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DF'].includes(p)) {
    return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' }; // Defense
  }
  if (p === 'GK') {
    return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' }; // Goalkeeper
  }
  return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
};

export const MyShortlistsPage: React.FC<MyShortlistsPageProps> = ({
  onOpenShortlist,
  onNavigateToLogin,
  isAuthenticated = true,
}) => {
  // Shortlists Data State
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [shortlistPlayersMap, setShortlistPlayersMap] = useState<Record<string, ShortlistPlayerItem[]>>({});
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

  // Overflow Action Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

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

      // Concurrently fetch player items for all shortlists to compute avatar stacks & quick stats
      try {
        const results = await Promise.allSettled(
          data.map((sl) => getShortlistPlayersApi(sl.id)),
        );
        const map: Record<string, ShortlistPlayerItem[]> = {};
        data.forEach((sl, idx) => {
          const res = results[idx];
          if (res.status === 'fulfilled') {
            map[sl.id] = res.value;
          }
        });
        setShortlistPlayersMap(map);
      } catch {
        // Non-fatal if detail fetch fails
      }
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
      setShortlistPlayersMap((prev) => ({ ...prev, [newShortlist.id]: [] }));
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 className="scout-title-page" style={{ margin: 0, textTransform: 'uppercase' }}>
              My Shortlists
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 500 }}>
              Your scouting watchlists
            </p>
          </div>

          {!loading && !error && shortlists.length > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#334155',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <span style={{ color: '#2563eb' }}>
                📋 {shortlists.length} {shortlists.length === 1 ? 'Shortlist' : 'Shortlists'}
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ color: '#059669' }}>
                🎯 {shortlists.reduce((acc, s) => acc + (shortlistPlayersMap[s.id]?.length || s.playerCount || 0), 0)} Targets
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="scout-btn scout-btn-primary"
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
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Empty State */}
      {!loading && !error && shortlists.length === 0 && (
        <div className="scout-empty-state">
          <div className="scout-empty-state-icon">📋</div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            MY SHORTLISTS
          </div>
          <h3 className="scout-empty-state-title" style={{ fontSize: '20px' }}>
            Build your scouting lists
          </h3>
          <p className="scout-empty-state-desc">
            Create a shortlist to keep track of players you're interested in.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="scout-btn scout-btn-md scout-btn-primary"
          >
            + Create Shortlist
          </button>
        </div>
      )}

      {/* 5. Shortlists Cards Grid */}
      {/* 5. Shortlists Cards Grid */}
      {!loading && !error && shortlists.length > 0 && (
        <div className="scout-shortlist-grid">
          {shortlists.map((sl) => {
            const items = shortlistPlayersMap[sl.id] || [];
            const count = items.length;
            const isMenuOpen = activeMenuId === sl.id;

            const previewItems = items.slice(0, 4);
            const extraCount = count > 4 ? count - 4 : 0;

            // Calculate Avg Age
            const playersWithDob = items.filter((item) => item.player?.dateOfBirth);
            const avgAge =
              playersWithDob.length > 0
                ? (
                    playersWithDob.reduce((sum, item) => {
                      const dob = new Date(item.player!.dateOfBirth!);
                      const age = new Date().getFullYear() - dob.getFullYear();
                      return sum + age;
                    }, 0) / playersWithDob.length
                  ).toFixed(1)
                : null;

            // Calculate Key Positions
            const posCounts: Record<string, number> = {};
            items.forEach((item) => {
              const pos = item.player?.primaryPosition;
              if (pos) posCounts[pos] = (posCounts[pos] || 0) + 1;
            });
            const topPositions = Object.keys(posCounts)
              .sort((a, b) => posCounts[b] - posCounts[a])
              .slice(0, 3);

            return (
              <div
                key={sl.id}
                className="scout-shortlist-card"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  padding: '20px 22px 18px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.2s ease',
                  overflow: 'hidden',
                }}
              >
                {/* 1. Sport Accent Gradient Stripe at Top */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background:
                      sl.visibility === 'PUBLIC'
                        ? 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)'
                        : 'linear-gradient(90deg, #0b4ea2 0%, #2563eb 100%)',
                  }}
                />

                <div>
                  {/* Top Bar: Title & Visibility Badge */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '4px',
                      marginTop: '4px',
                    }}
                  >
                    <h3
                      onClick={() => onOpenShortlist && onOpenShortlist(sl.id)}
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#0f172a',
                        margin: 0,
                        lineHeight: 1.3,
                        cursor: onOpenShortlist ? 'pointer' : 'default',
                        letterSpacing: '-0.01em',
                      }}
                      title={sl.name}
                    >
                      {sl.name}
                    </h3>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2.5px 8px',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        border: '1px solid',
                        flexShrink: 0,
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

                  {/* Description: 1-line compact text */}
                  <p
                    style={{
                      fontSize: '12.5px',
                      color: sl.description ? '#64748b' : '#94a3b8',
                      fontStyle: sl.description ? 'normal' : 'italic',
                      margin: '0 0 14px 0',
                      lineHeight: 1.4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={sl.description || undefined}
                  >
                    {sl.description || 'No scouting description provided'}
                  </p>

                  {/* Football Avatar Stack & Target Counter */}
                  {count > 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        marginBottom: '12px',
                      }}
                    >
                      {/* Avatar stack visual with club crests */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {previewItems.map((item, idx) => (
                          <div
                            key={item.id}
                            style={{
                              position: 'relative',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              border: '2px solid #ffffff',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                              background: '#e2e8f0',
                              marginLeft: idx === 0 ? 0 : '-10px',
                              zIndex: 4 - idx,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                            title={`${item.player?.name || 'Player'}${
                              item.player?.currentTeam?.name
                                ? ` (${item.player.currentTeam.name})`
                                : ''
                            }`}
                          >
                            {item.player?.imageUrl ? (
                              <img
                                src={item.player.imageUrl}
                                alt={item.player.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: '#475569',
                                }}
                              >
                                {(item.player?.shortName || item.player?.name || 'P')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            )}

                            {/* Mini club logo overlay */}
                            {item.player?.currentTeam?.logoUrl && (
                              <img
                                src={item.player.currentTeam.logoUrl}
                                alt=""
                                style={{
                                  position: 'absolute',
                                  bottom: '-1px',
                                  right: '-1px',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  border: '1px solid #ffffff',
                                  objectFit: 'contain',
                                }}
                              />
                            )}
                          </div>
                        ))}

                        {extraCount > 0 && (
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '2px solid #ffffff',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                              marginLeft: '-8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              zIndex: 0,
                            }}
                          >
                            +{extraCount}
                          </div>
                        )}
                      </div>

                      {/* Jersey Icon + Target counter */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        <JerseyIcon size={14} style={{ color: '#2563eb' }} />
                        <span>
                          {count} {count === 1 ? 'Target' : 'Targets'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px dashed #cbd5e1',
                        marginBottom: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8',
                        }}
                      >
                        <JerseyIcon size={14} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                        0 Targets • Ready for scouting
                      </span>
                    </div>
                  )}

                  {/* Football Quick Stats Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                      marginBottom: '14px',
                      fontSize: '11.5px',
                    }}
                  >
                    {/* Avg Age */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#475569',
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: '#94a3b8' }}>Avg Age:</span>
                      <span style={{ color: '#0f172a', fontWeight: 800 }}>
                        {avgAge ? `${avgAge} yrs` : 'N/A'}
                      </span>
                    </div>

                    {/* Key Positions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {topPositions.length > 0 ? (
                        topPositions.map((pos) => {
                          const badgeStyle = getPositionBadgeStyle(pos);
                          return (
                            <span
                              key={pos}
                              style={{
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 800,
                                background: badgeStyle.bg,
                                color: badgeStyle.text,
                                border: `1px solid ${badgeStyle.border}`,
                                letterSpacing: '0.02em',
                              }}
                            >
                              {pos}
                            </span>
                          );
                        })
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic' }}>
                          No positions
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Updated Date, [View Scouting List] Outline, and [⋮] Overflow Menu */}
                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11.5px',
                      color: '#94a3b8',
                      fontWeight: 600,
                    }}
                  >
                    <span>Updated {formatDate(sl.updatedAt || sl.createdAt)}</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'relative',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenShortlist && onOpenShortlist(sl.id)}
                      style={{
                        flex: 1,
                        height: '36px',
                        background: '#ffffff',
                        color: '#2563eb',
                        border: '1.5px solid #2563eb',
                        borderRadius: '9px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#2563eb';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = '#2563eb';
                      }}
                    >
                      <span>View Scouting List</span>
                      <span style={{ fontSize: '13px' }}>→</span>
                    </button>

                    {/* Overflow Button */}
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : sl.id);
                        }}
                        className="scout-btn scout-btn-sm scout-btn-secondary"
                        style={{
                          width: '36px',
                          height: '36px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 900,
                          borderRadius: '9px',
                          border: '1px solid #e2e8f0',
                        }}
                        aria-label="More actions"
                        title="Shortlist options"
                      >
                        ⋮
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            right: 0,
                            marginBottom: '6px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            boxShadow:
                              '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            minWidth: '140px',
                            zIndex: 20,
                            overflow: 'hidden',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              handleOpenEditModal(sl);
                            }}
                            style={{
                              width: '100%',
                              padding: '9px 14px',
                              textAlign: 'left',
                              background: 'none',
                              border: 'none',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              color: '#334155',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = '#f1f5f9')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = 'none')
                            }
                          >
                            <span>✏️</span>
                            <span>Edit Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              handleOpenDeleteModal(sl);
                            }}
                            style={{
                              width: '100%',
                              padding: '9px 14px',
                              textAlign: 'left',
                              background: 'none',
                              border: 'none',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              borderTop: '1px solid #f1f5f9',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = '#fef2f2')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = 'none')
                            }
                          >
                            <span>🗑️</span>
                            <span>Delete Shortlist</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE SHORTLIST MODAL */}
      <CreateShortlistModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateSubmit}
        name={createName}
        onNameChange={(val) => {
          setCreateName(val);
          if (createError) setCreateError(null);
        }}
        description={createDescription}
        onDescriptionChange={setCreateDescription}
        visibility={createVisibility}
        onVisibilityChange={setCreateVisibility}
        isSubmitting={submittingCreate}
        error={createError}
      />

      {/* EDIT SHORTLIST MODAL */}
      {editingShortlist && (
        <div
          className="scout-modal-clean-overlay"
          onClick={handleCloseEditModal}
          role="presentation"
        >
          <div
            className="scout-modal-clean-dialog shortlist-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-shortlist-title"
          >
            <ModalHeader
              id="edit-shortlist-title"
              title="Edit Shortlist"
              subtitle="Update shortlist details and visibility"
              onClose={handleCloseEditModal}
            />

            {editError && (
              <div className="scout-modal-alert-error" role="alert">
                <AlertCircleIcon size={16} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="scout-modal-clean-form">
              {/* Name Field */}
              <div className="scout-field-group">
                <label htmlFor="edit-shortlist-name" className="scout-field-label">
                  NAME <span className="scout-field-required">*</span>
                </label>
                <input
                  id="edit-shortlist-name"
                  type="text"
                  required
                  maxLength={150}
                  autoFocus
                  disabled={submittingEdit}
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  className="scout-clean-input"
                />
              </div>

              {/* Description Field */}
              <div className="scout-field-group">
                <label htmlFor="edit-shortlist-desc" className="scout-field-label">
                  DESCRIPTION <span className="scout-field-optional">(OPTIONAL)</span>
                </label>
                <textarea
                  id="edit-shortlist-desc"
                  rows={3}
                  disabled={submittingEdit}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Young players to monitor for summer transfer window..."
                  className="scout-clean-textarea"
                />
              </div>

              {/* Visibility Options */}
              <VisibilitySelector
                value={editVisibility}
                onChange={setEditVisibility}
                disabled={submittingEdit}
                label="VISIBILITY"
                privateTitle="PRIVATE"
                privateDescription="Only you can view and edit."
                publicTitle="PUBLIC"
                publicDescription="Visible to all members."
              />

              {/* Modal Actions */}
              <ModalFooter
                onCancel={handleCloseEditModal}
                submitText="Save"
                submittingText="Saving..."
                isSubmitting={submittingEdit}
                isSubmitDisabled={!editName.trim()}
              />
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
                style={{ minWidth: '110px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submittingDelete}
                className="scout-btn scout-btn-danger"
                style={{ minWidth: '120px' }}
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
