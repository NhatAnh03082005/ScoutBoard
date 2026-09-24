import { Notification, SearchInput } from "../components/common";
import React, { useState, useEffect, useMemo } from 'react';
import type { Squad, SquadVisibility, FormationCode, SquadPlayerItem } from '../types/squad.types';
import {
  getSquadsApi,
  getPlayersInSquadApi,
  createSquadApi,
  updateSquadApi,
  deleteSquadApi,
} from '../services/squad.service';
import {
  CreateSquadModal,
  ModalHeader,
  FormationSelector,
  VisibilitySelector,
  ModalFooter,
  LockIcon,
} from '../components/modal';
import {
  FORMATION_DEFINITIONS,
} from '../utils/squad-placement.utils';
import { TacticalMiniPitch } from '../components/squad/TacticalMiniPitch';

interface MySquadsPageProps {
  onOpenSquad?: (id: string) => void;
  onNavigateToLogin?: () => void;
  isAuthenticated?: boolean;
}

export const MySquadsPage: React.FC<MySquadsPageProps> = ({
  onOpenSquad,
  onNavigateToLogin,
  isAuthenticated = true,
}) => {
  // Squads Data State
  const [squads, setSquads] = useState<Squad[]>([]);
  const [squadPlayersMap, setSquadPlayersMap] = useState<Record<string, SquadPlayerItem[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active overflow menu state for card actions
  const [activeMenuSquadId, setActiveMenuSquadId] = useState<string | null>(null);

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

  // Search & Filter state for squad cards
  const [squadSearchQuery, setSquadSearchQuery] = useState<string>('');

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  const dismissToast = () => setToastMessage(null);

  const fetchSquads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSquadsApi();
      setSquads(data);

      // Concurrently fetch player assignments for metadata preview & mini pitch
      try {
        const playerResults = await Promise.allSettled(
          data.map((s) => getPlayersInSquadApi(s.id)),
        );
        const map: Record<string, SquadPlayerItem[]> = {};
        data.forEach((s, idx) => {
          const res = playerResults[idx];
          if (res.status === 'fulfilled') {
            map[s.id] = res.value;
          }
        });
        setSquadPlayersMap(map);
      } catch {
        // Non-fatal if players fail to load
      }
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

  // Close overflow menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.scout-overflow-trigger') && !target.closest('.scout-overflow-menu')) {
        setActiveMenuSquadId(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // --- STATS COMPUTATION ---
  const stats = useMemo(() => {
    const totalSquads = squads.length;
    const uniqueFormations = new Set(squads.map((s) => s.formationCode)).size;
    let totalPlayersCount = 0;
    Object.values(squadPlayersMap).forEach((list) => {
      totalPlayersCount += list.length;
    });
    return { totalSquads, uniqueFormations, totalPlayersCount };
  }, [squads, squadPlayersMap]);

  // Filtered squads
  const filteredSquads = useMemo(() => {
    if (!squadSearchQuery.trim()) return squads;
    const q = squadSearchQuery.trim().toLowerCase();
    return squads.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.formationCode.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)),
    );
  }, [squads, squadSearchQuery]);

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
    setCreateError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = createName.trim();
    if (!trimmedName) {
      setCreateError('Squad name is required.');
      return;
    }

    if (!createFormation || !FORMATION_DEFINITIONS[createFormation]) {
      setCreateError('Please select a valid tactical formation.');
      return;
    }

    setSubmittingCreate(true);
    setCreateError(null);

    try {
      const created = await createSquadApi({
        name: trimmedName,
        formationCode: createFormation,
        description: createDescription.trim() || undefined,
        visibility: createVisibility,
      });

      setSquads((prev) => [created, ...prev]);
      handleCloseCreateModal();
      showToast(`Squad "${created.name}" created successfully!`);
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
    setActiveMenuSquadId(null);
  };

  const handleCloseEditModal = () => {
    setEditingSquad(null);
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

    if (!editFormation || !FORMATION_DEFINITIONS[editFormation]) {
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
    setActiveMenuSquadId(null);
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
      className="scout-b2b-page-container scout-squads-page"
      style={{
        maxWidth: '1380px',
        margin: '0 auto',
        padding: '32px 24px 80px',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <Notification
          variant="success"
          mode="toast"
          message={toastMessage}
          onDismiss={dismissToast}
          autoDismissMs={3500}
        />
      )}

      {/* Header Banner - Modern Tactical Workspace */}
      <div
        className="scout-squads-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div className="scout-squads-heading-copy">
          <div className="scout-page-eyebrow">Tactical workspace</div>
          <div className="scout-squads-title-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 900,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                textTransform: 'uppercase',
              }}
            >
              MY SQUADS
            </h1>
            <span
              className="scout-squads-title-badge"
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                background: '#dbeafe',
                color: '#1d4ed8',
                letterSpacing: '0.04em',
              }}
            >
              34 FORMATIONS
            </span>
          </div>
          <p
            className="scout-squads-subtitle"
            style={{
              color: '#64748b',
              fontSize: '14px',
              margin: '0 0 12px',
            }}
          >
            Design, test, and manage tactical lineups across 34 professional formations
          </p>

          {/* Quick Metrics Bar */}
          {!loading && !error && (
            <div className="scout-squads-metrics">
              <div
                className="scout-squads-metric"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(59, 130, 246, 0.16)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#60a5fa',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
                <span>
                  <strong>{stats.totalSquads}</strong> {stats.totalSquads === 1 ? 'Squad' : 'Squads'}
                </span>
              </div>

              <div
                className="scout-squads-metric"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(34, 197, 94, 0.16)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#4ade80',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m13 2-9 12h8l-1 8 9-12h-8z" />
                </svg>
                <span>
                  <strong>{stats.uniqueFormations}</strong> Active Formations
                </span>
              </div>

              <div
                className="scout-squads-metric"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#6b21a8',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>
                  <strong>{stats.totalPlayersCount}</strong> Players Assigned
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls: Search & New Squad Button */}
        <div className="scout-squads-header-actions">
          {squads.length > 0 && (
            <SearchInput
              placeholder="Search squads..."
              value={squadSearchQuery}
              onChange={(e) => setSquadSearchQuery(e.target.value)}
              onClear={() => setSquadSearchQuery('')}
              wrapperClassName="w-56"
            />
          )}

          <button
            type="button"
            className="scout-btn scout-btn-primary scout-squads-create-btn"
            id="btn-create-new-squad"
            onClick={handleOpenCreateModal}
          >
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>+</span> Create New Squad
          </button>
        </div>
      </div>

      {/* 1. UNAUTHORIZED STATE */}
      {error === 'UNAUTHORIZED' || (!isAuthenticated && !loading) ? (
        <div
          className="scout-auth-guard-card scout-squads-auth-card"
          style={{
            maxWidth: '600px',
            margin: '40px auto',
            background: 'var(--scout-surface-card)',
            border: '1px solid var(--scout-border-default)',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
        >
          <div className="scout-auth-guard-icon" aria-hidden="true"><LockIcon size={28} /></div>
          <div className="scout-page-eyebrow">Tactical workspace</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: '0 0 8px' }}>
            Authentication Required
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Please log in to your ScoutBoard account to view and manage your tactical squads.
          </p>
          {onNavigateToLogin && (
            <button
              type="button"
              className="scout-btn scout-btn-primary"
              onClick={onNavigateToLogin}
              style={{ padding: '9px 24px' }}
            >
              Log In Now
            </button>
          )}
        </div>
      ) : null}

      {/* 2. ERROR STATE */}
      {error && error !== 'UNAUTHORIZED' ? (
        <Notification
          variant="error"
          message={error}
          style={{ marginBottom: '28px' }}
          actions={(
            <button
              type="button"
              className="scout-btn scout-btn-secondary"
              onClick={fetchSquads}
            >
              Retry
            </button>
          )}
        />
      ) : null}

      {/* 3. LOADING SKELETON */}
      {loading ? (
        <div
          className="scout-squads-grid scout-squads-loading-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '24px',
          }}
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="scout-squad-overview-card scout-squad-card-skeleton"
              style={{
                background: 'var(--scout-surface-card)',
                border: '1px solid var(--scout-border-default)',
                borderRadius: '18px',
                padding: '22px',
                height: '340px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ width: '60%', height: '22px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px', marginBottom: '10px' }} />
                <div style={{ width: '40%', height: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', marginBottom: '16px' }} />
                <div style={{ width: '100%', height: '160px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px' }} />
              </div>
              <div style={{ width: '100%', height: '36px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
      ) : null}

      {/* 4. EMPTY STATE (No squads created yet) */}
      {!loading && !error && squads.length === 0 ? (
        <div className="scout-empty-state scout-squads-empty-state" style={{ maxWidth: '680px', margin: '40px auto' }}>
          <div className="scout-empty-state-icon scout-squads-empty-icon" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="12" cy="12" r="3" /><path d="M3 9h3l2-3M21 9h-3l-2-3M3 15h3l2 3M21 15h-3l-2 3" />
            </svg>
          </div>
          <div className="scout-page-eyebrow">Tactical workspace</div>
          <h3 className="scout-empty-state-title" style={{ fontSize: '20px' }}>
            No Tactical Squads Yet
          </h3>
          <p className="scout-empty-state-desc">
            Build your custom lineup, test tactical formations (4-3-3, 4-2-3-1, 3-5-2), and balance positional chemistry for upcoming matches.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="scout-btn scout-btn-md scout-btn-primary"
          >
            + Create First Tactical Squad
          </button>
        </div>
      ) : null}

      {/* 5. SQUAD CARDS GRID (Modern FC Mobile / Tactical Workspace Style) */}
      {!loading && !error && squads.length > 0 ? (
        <>
          {filteredSquads.length === 0 ? (
            <div
              className="scout-empty-state scout-squads-search-empty"
              style={{
                background: 'var(--scout-surface-card)',
                border: '1px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '40px 24px',
                textAlign: 'center',
                margin: '20px 0',
              }}
            >
              <p style={{ fontSize: '15px', color: '#64748b', fontWeight: 600, margin: '0 0 8px' }}>
                No squads found matching &ldquo;{squadSearchQuery}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => setSquadSearchQuery('')}
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#2563eb',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div
              className="scout-squads-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '24px',
              }}
            >
              {filteredSquads.map((squad) => {
                const squadPlayers = squadPlayersMap[squad.id] || [];
                const starters = squadPlayers.filter((p) => p.role === 'STARTER');
                const substitutes = squadPlayers.filter((p) => p.role === 'SUBSTITUTE');
                const startersCount = starters.length;
                const benchCount = substitutes.length;
                const isFullXI = startersCount === 11;
                const isMenuOpen = activeMenuSquadId === squad.id;

                const formationDef = FORMATION_DEFINITIONS[squad.formationCode];
                const category = formationDef?.category || '4 ATB';

                return (
                  <div
                    key={squad.id}
                    className="scout-squad-overview-card"
                    style={{
                      background: 'var(--scout-surface-card)',
                      border: '1px solid var(--scout-border-default)',
                      borderRadius: '18px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                      e.currentTarget.style.borderColor = 'var(--scout-border-default)';
                    }}
                  >
                    <div>
                      {/* Card Top Bar: Name, Formation Badges, Menu */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                          marginBottom: '10px',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3
                            className="scout-squad-card-title"
                            style={{
                              fontSize: '17px',
                              fontWeight: 800,
                              color: '#ffffff',
                              margin: '0 0 6px 0',
                              cursor: onOpenSquad ? 'pointer' : 'default',
                              lineHeight: 1.3,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              letterSpacing: '-0.01em',
                            }}
                            onClick={() => onOpenSquad && onOpenSquad(squad.id)}
                            title={squad.name}
                          >
                            {squad.name}
                          </h3>

                          {/* Tactical Tags */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800,
                                background: 'rgba(59, 130, 246, 0.16)',
                                color: '#60a5fa',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                              }}
                            >
                              {squad.formationCode}
                            </span>

                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                background:
                                  category === '3 ATB'
                                    ? '#ecfdf5'
                                    : category === '5 ATB'
                                    ? '#fffbeb'
                                    : '#f8fafc',
                                color:
                                  category === '3 ATB'
                                    ? '#047857'
                                    : category === '5 ATB'
                                    ? '#b45309'
                                    : '#475569',
                                border: `1px solid ${
                                  category === '3 ATB'
                                    ? '#a7f3d0'
                                    : category === '5 ATB'
                                    ? '#fde68a'
                                    : 'var(--scout-border-default)'
                                }`,
                              }}
                            >
                              {category}
                            </span>

                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                background: squad.visibility === 'PUBLIC' ? '#ecfdf5' : '#f1f5f9',
                                color: squad.visibility === 'PUBLIC' ? '#047857' : '#475569',
                                border: `1px solid ${squad.visibility === 'PUBLIC' ? '#a7f3d0' : 'var(--scout-border-default)'}`,
                              }}
                            >
                              {squad.visibility === 'PUBLIC' ? 'Public' : 'Private'}
                            </span>

                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                background: isFullXI ? '#ecfdf5' : '#f1f5f9',
                                color: isFullXI ? '#059669' : '#475569',
                                border: `1px solid ${isFullXI ? '#a7f3d0' : 'var(--scout-border-default)'}`,
                              }}
                            >
                              {isFullXI ? 'XI Complete' : `${startersCount}/11 Starters`}
                            </span>
                          </div>
                        </div>

                        {/* Overflow Menu Button */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <button
                            type="button"
                            className="scout-overflow-trigger scout-btn scout-btn-sm scout-btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuSquadId(isMenuOpen ? null : squad.id);
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '17px',
                              fontWeight: 900,
                              borderRadius: '8px',
                              border: '1px solid var(--scout-border-default)',
                              background: 'var(--scout-surface-card)',
                              color: 'var(--scout-text-secondary)',
                            }}
                            aria-label="Squad options"
                            title="Squad options"
                          >
                            ⋮
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              className="scout-overflow-menu"
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '4px',
                                background: 'var(--scout-surface-card)',
                                border: '1px solid var(--scout-border-default)',
                                borderRadius: '10px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                minWidth: '150px',
                                zIndex: 30,
                                overflow: 'hidden',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(squad)}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  textAlign: 'left',
                                  background: 'none',
                                  border: 'none',
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  color: 'var(--scout-text-primary)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <span>✏️</span>
                                <span>Edit Squad</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(squad)}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
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
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <span>🗑️</span>
                                <span>Delete Squad</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tactical Mini Pitch (Lush green pitch with 11 dots, occupied dots glowing) */}
                      <div
                        className="scout-squad-mini-pitch"
                        style={{
                          height: '140px',
                          margin: '12px 0',
                          cursor: onOpenSquad ? 'pointer' : 'default',
                        }}
                        onClick={() => onOpenSquad && onOpenSquad(squad.id)}
                        title="Click to open tactical pitch"
                      >
                        <TacticalMiniPitch
                          formationCode={squad.formationCode}
                          players={squadPlayers}
                          perspective={false}
                          dotSize={7.5}
                        />
                      </div>

                      {/* Starting XI Completion Status & Bench Count */}
                      <div className="scout-squad-completion" style={{ marginBottom: '12px' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '12px',
                            marginBottom: '6px',
                          }}
                        >
                          <span style={{ color: '#ffffff', fontWeight: 700 }}>
                            Starting XI:{' '}
                            <span style={{ color: isFullXI ? '#10b981' : '#2563eb' }}>
                              {startersCount}/11
                            </span>
                          </span>
                          <span style={{ color: '#64748b', fontSize: '11.5px' }}>
                            Bench: <strong style={{ color: 'var(--scout-text-secondary)' }}>{benchCount}</strong>
                          </span>
                        </div>

                        {/* Progress Bar Track */}
                        <div
                          style={{
                            width: '100%',
                            height: '6px',
                            background: 'var(--scout-border-default)',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, (startersCount / 11) * 100)}%`,
                              height: '100%',
                              background: isFullXI ? '#10b981' : '#2563eb',
                              borderRadius: '9999px',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>

                      {/* Tactical Description if present */}
                      {squad.description && (
                        <p
                          className="scout-squad-card-description"
                          style={{
                            color: '#64748b',
                            fontSize: '12px',
                            margin: '0 0 12px',
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

                    {/* Card Footer: Updated Date & Open Tactics CTA */}
                    <div
                      className="scout-squad-card-footer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--scout-border-subtle)',
                        marginTop: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11.5px',
                          color: '#94a3b8',
                          fontWeight: 500,
                        }}
                      >
                        Updated {formatDate(squad.updatedAt)}
                      </span>

                      {onOpenSquad && (
                        <button
                          type="button"
                          className="scout-btn scout-btn-sm scout-btn-primary"
                          onClick={() => onOpenSquad(squad.id)}
                          style={{
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderRadius: '8px',
                          }}
                        >
                          <span>Open Tactics</span>
                          <span>→</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {/* CREATE SQUAD MODAL */}
      <CreateSquadModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        name={createName}
        onNameChange={setCreateName}
        formation={createFormation}
        onFormationChange={setCreateFormation}
        description={createDescription}
        onDescriptionChange={setCreateDescription}
        visibility={createVisibility}
        onVisibilityChange={setCreateVisibility}
        onSubmit={handleCreateSubmit}
        isSubmitting={submittingCreate}
        error={createError}
      />

      {/* EDIT SQUAD MODAL */}
      {editingSquad && (
        <div
          className="scout-modal-clean-overlay"
          onClick={handleCloseEditModal}
          role="presentation"
        >
          <div
            className="scout-modal-clean-dialog squad-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-squad-dialog-title"
          >
            <ModalHeader
              id="edit-squad-dialog-title"
              title="Edit Squad"
              subtitle="Update tactics, formation, and visibility settings"
              onClose={handleCloseEditModal}
            />

            {editError && (
              <Notification variant="error" message={editError} compact />
            )}

            <form onSubmit={handleEditSubmit} className="scout-modal-clean-form">
              <div className="scout-field-group">
                <label htmlFor="edit-squad-name" className="scout-field-label">
                  Squad Name <span className="scout-field-required">*</span>
                </label>
                <input
                  id="edit-squad-name"
                  type="text"
                  required
                  maxLength={150}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={submittingEdit}
                  className="scout-clean-input"
                />
              </div>

              <FormationSelector
                value={editFormation}
                onChange={setEditFormation}
                disabled={submittingEdit}
              />

              <div className="scout-field-group">
                <label htmlFor="edit-squad-description" className="scout-field-label">
                  Description <span className="scout-field-optional">(Optional)</span>
                </label>
                <textarea
                  id="edit-squad-description"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={submittingEdit}
                  placeholder="Target style of play, matchday plan..."
                  className="scout-clean-textarea"
                />
              </div>

              <VisibilitySelector
                value={editVisibility}
                onChange={setEditVisibility}
                disabled={submittingEdit}
                label="Visibility"
                privateTitle="PRIVATE"
                privateDescription="Only you can view and edit."
                publicTitle="PUBLIC"
                publicDescription="Visible to all members."
              />

              <ModalFooter
                onCancel={handleCloseEditModal}
                submitText="Save Changes"
                submittingText="Saving..."
                isSubmitting={submittingEdit}
                isSubmitDisabled={!editName.trim()}
              />
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingSquad && (
        <div className="scout-modal-overlay" onClick={handleCloseDeleteModal}>
          <div
            className="scout-modal-dialog"
            style={{ maxWidth: '420px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
            <h3 className="scout-modal-title" style={{ marginBottom: '8px' }}>
              Delete Squad?
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: '#64748b',
                marginBottom: '24px',
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to delete <strong style={{ color: '#ffffff' }}>&ldquo;{deletingSquad.name}&rdquo;</strong>? This will remove all starter and substitute assignments.
            </p>

            {deleteError && (
              <Notification variant="error" message={deleteError} compact />
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
