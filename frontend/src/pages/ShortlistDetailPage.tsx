import { SearchInput } from "../components/common";
import React, { useState, useEffect, useMemo } from 'react';
import type { Shortlist, ShortlistVisibility, ShortlistPlayerItem } from '../types/shortlist.types';
import {
  getShortlistByIdApi,
  getShortlistPlayersApi,
  updateShortlistApi,
  removePlayerFromShortlistApi,
  updateShortlistPlayerNoteApi,
} from '../services/shortlist.service';
import {
  ModalHeader,
  VisibilitySelector,
  ModalFooter,
  AlertCircleIcon,
  JerseyIcon,
  CloseIcon,
} from '../components/modal';
import { getNationalityFlagUrl } from '../utils/nationality-flag.util';

interface ShortlistDetailPageProps {
  shortlistId: string;
  onBack: () => void;
  onNavigateToLogin?: () => void;
  isAuthenticated?: boolean;
}

type PositionFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD';
type SortOption = 'NAME_ASC' | 'AGE_ASC' | 'AGE_DESC' | 'POS';
type ViewMode = 'GRID' | 'TABLE';

// Helper for standard football position categories
function mapToScoutPositionGroup(posCode?: string | null): 'GK' | 'DEF' | 'MID' | 'FWD' | 'OTHER' {
  if (!posCode) return 'OTHER';
  const p = posCode.trim().toUpperCase();
  if (p === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p)) return 'DEF';
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(p)) return 'MID';
  if (['ST', 'CF', 'LW', 'RW'].includes(p)) return 'FWD';

  if (p.includes('GOAL') || p.startsWith('G')) return 'GK';
  if (p.includes('BACK') || p.includes('DEF')) return 'DEF';
  if (p.includes('MID')) return 'MID';
  if (p.includes('FOR') || p.includes('ATT') || p.includes('WING') || p.includes('STRIKE')) return 'FWD';
  return 'OTHER';
}

function getPositionBadgeClass(posCode?: string | null): string {
  const group = mapToScoutPositionGroup(posCode);
  switch (group) {
    case 'GK':
      return 'scout-pos-badge-gk';
    case 'DEF':
      return 'scout-pos-badge-def';
    case 'MID':
      return 'scout-pos-badge-mid';
    case 'FWD':
      return 'scout-pos-badge-fwd';
    default:
      return '';
  }
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

  // Filter & Display States
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('NAME_ASC');
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Edit Shortlist Modal State
  const [isEditShortlistModalOpen, setIsEditShortlistModalOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editVisibility, setEditVisibility] = useState<ShortlistVisibility>('PRIVATE');
  const [submittingEditShortlist, setSubmittingEditShortlist] = useState<boolean>(false);
  const [editShortlistError, setEditShortlistError] = useState<string | null>(null);

  // Edit Scout Note Modal State
  const [editingPlayerNote, setEditingPlayerNote] = useState<ShortlistPlayerItem | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Remove Player Confirmation State
  const [removingPlayer, setRemovingPlayer] = useState<ShortlistPlayerItem | null>(null);
  const [submittingRemove, setSubmittingRemove] = useState<boolean>(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Card Overflow Menu State
  const [activeMenuPlayerId, setActiveMenuPlayerId] = useState<string | null>(null);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuPlayerId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

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

  // --- EDIT SHORTLIST DETAILS FLOW ---
  const handleOpenEditShortlistModal = () => {
    if (!shortlist) return;
    setEditName(shortlist.name);
    setEditDescription(shortlist.description || '');
    setEditVisibility(shortlist.visibility);
    setEditShortlistError(null);
    setIsEditShortlistModalOpen(true);
  };

  const handleCloseEditShortlistModal = () => {
    setIsEditShortlistModalOpen(false);
    setEditShortlistError(null);
  };

  const handleEditShortlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortlist) return;

    const trimmed = editName.trim();
    if (!trimmed) {
      setEditShortlistError('Shortlist name is required.');
      return;
    }

    setSubmittingEditShortlist(true);
    setEditShortlistError(null);

    try {
      const updated = await updateShortlistApi(shortlist.id, {
        name: trimmed,
        description: editDescription.trim() || null,
        visibility: editVisibility,
      });

      setShortlist((prev) => (prev ? { ...prev, ...updated } : updated));
      handleCloseEditShortlistModal();
      showToast('Shortlist updated successfully!');
    } catch (err: any) {
      setEditShortlistError(err.message || 'Failed to update shortlist.');
    } finally {
      setSubmittingEditShortlist(false);
    }
  };

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

      setPlayers((prev) => prev.filter((p) => p.playerId !== removingPlayer.playerId));
      setShortlist((prev) =>
        prev
          ? {
              ...prev,
              playerCount: Math.max(0, (prev.playerCount || 1) - 1),
            }
          : prev,
      );

      showToast(`Removed "${removingPlayer.player?.name || 'Player'}" from shortlist.`);
      handleCloseRemoveModal();
    } catch (err: any) {
      setRemoveError(err.message || 'Failed to remove player.');
    } finally {
      setSubmittingRemove(false);
    }
  };

  const calculateAge = (dateOfBirth?: string | null): string => {
    if (!dateOfBirth) return '';
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age}`;
  };

  // --- SHORTLIST OVERVIEW METRICS (100% REAL DATA) ---
  const overviewStats = useMemo(() => {
    let totalAge = 0;
    let ageCount = 0;
    let gkCount = 0;
    let defCount = 0;
    let midCount = 0;
    let fwdCount = 0;

    players.forEach((item) => {
      const p = item.player;
      const ageStr = calculateAge(p?.dateOfBirth);
      if (ageStr) {
        totalAge += Number(ageStr);
        ageCount++;
      }

      const group = mapToScoutPositionGroup(p?.primaryPosition);
      if (group === 'GK') gkCount++;
      else if (group === 'DEF') defCount++;
      else if (group === 'MID') midCount++;
      else if (group === 'FWD') fwdCount++;
    });

    const avgAge = ageCount > 0 ? (totalAge / ageCount).toFixed(1) : '—';

    return {
      avgAge,
      gkCount,
      defCount,
      midCount,
      fwdCount,
    };
  }, [players]);

  // --- FILTER & SORT LOGIC (100% REAL DATA) ---
  const filteredAndSortedPlayers = useMemo(() => {
    return players
      .filter((item) => {
        const player = item.player;
        // Position filter
        if (positionFilter !== 'ALL') {
          const group = mapToScoutPositionGroup(player?.primaryPosition);
          if (group !== positionFilter) return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = player?.name?.toLowerCase().includes(q);
          const teamMatch = player?.currentTeam?.name?.toLowerCase().includes(q);
          const natMatch = player?.nationality?.toLowerCase().includes(q);
          const posMatch = player?.primaryPosition?.toLowerCase().includes(q);
          if (!nameMatch && !teamMatch && !natMatch && !posMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pA = a.player;
        const pB = b.player;
        const ageA = Number(calculateAge(pA?.dateOfBirth)) || 0;
        const ageB = Number(calculateAge(pB?.dateOfBirth)) || 0;

        switch (sortOption) {
          case 'NAME_ASC':
            return (pA?.name || '').localeCompare(pB?.name || '');
          case 'AGE_ASC':
            return ageA - ageB;
          case 'AGE_DESC':
            return ageB - ageA;
          case 'POS': {
            const posOrder: Record<string, number> = { GK: 1, DEF: 2, MID: 3, FWD: 4, OTHER: 5 };
            const orderA = posOrder[mapToScoutPositionGroup(pA?.primaryPosition)] || 5;
            const orderB = posOrder[mapToScoutPositionGroup(pB?.primaryPosition)] || 5;
            return orderA - orderB;
          }
          default:
            return 0;
        }
      });
  }, [players, positionFilter, sortOption, searchQuery]);

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
            Please log in to view this scouting shortlist.
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

      {/* 1. Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          type="button"
          onClick={onBack}
          className="scout-sports-back-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>My Shortlists</span>
        </button>

        {shortlist && (
          <button
            type="button"
            onClick={handleOpenEditShortlistModal}
            className="scout-btn scout-btn-secondary"
          >
            <span>✏️</span>
            <span>Edit Shortlist</span>
          </button>
        )}
      </div>

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
            >
              Return to Shortlists
            </button>
            <button
              type="button"
              onClick={fetchShortlistData}
              className="scout-btn scout-btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* 3. Loading State */}
      {loading && !error && (
        <div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '32px', marginBottom: '24px' }}>
            <div style={{ height: '32px', width: '35%', background: '#e2e8f0', borderRadius: '8px', marginBottom: '12px' }} />
            <div style={{ height: '16px', width: '55%', background: '#e2e8f0', borderRadius: '4px', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ height: '36px', width: '130px', background: '#f1f5f9', borderRadius: '10px' }} />
              <div style={{ height: '36px', width: '130px', background: '#f1f5f9', borderRadius: '10px' }} />
              <div style={{ height: '36px', width: '180px', background: '#f1f5f9', borderRadius: '10px' }} />
            </div>
          </div>
          <div className="scout-shortlist-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="scout-trading-card" style={{ height: '240px', background: '#f8fafc' }} />
            ))}
          </div>
        </div>
      )}

      {/* 4. Shortlist Detail Main Container */}
      {!loading && !error && shortlist && (
        <div>
          {/* Sports Gradient Header Banner */}
          <div className="scout-sport-banner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                    {shortlist.name}
                  </h1>
                  <span
                    style={{
                      background: shortlist.visibility === 'PUBLIC' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.12)',
                      color: shortlist.visibility === 'PUBLIC' ? '#34d399' : '#cbd5e1',
                      border: `1px solid ${shortlist.visibility === 'PUBLIC' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {shortlist.visibility === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                  </span>
                  <span
                    style={{
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                    }}
                  >
                    🎯 {players.length} {players.length === 1 ? 'Target' : 'Targets'}
                  </span>
                </div>

                <p style={{ fontSize: '13.5px', color: shortlist.description ? '#cbd5e1' : '#64748b', fontStyle: shortlist.description ? 'normal' : 'italic', margin: 0, lineHeight: 1.5, maxWidth: '780px' }}>
                  {shortlist.description || 'No scouting description recorded for this shortlist.'}
                </p>
              </div>
            </div>

            {/* Shortlist Overview Stats Bar (100% Real Data) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div className="scout-overview-chip">
                <span>Avg Age:</span>
                <strong>{overviewStats.avgAge} yrs</strong>
              </div>

              <div className="scout-overview-chip">
                <span>Total Targets:</span>
                <strong style={{ color: '#38bdf8' }}>{players.length}</strong>
              </div>

              <div className="scout-overview-chip" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ marginRight: '2px' }}>Distribution:</span>
                {overviewStats.gkCount > 0 && (
                  <span className="scout-pos-badge-gk" style={{ padding: '1px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 800 }}>
                    {overviewStats.gkCount} GK
                  </span>
                )}
                {overviewStats.defCount > 0 && (
                  <span className="scout-pos-badge-def" style={{ padding: '1px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 800 }}>
                    {overviewStats.defCount} DEF
                  </span>
                )}
                {overviewStats.midCount > 0 && (
                  <span className="scout-pos-badge-mid" style={{ padding: '1px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 800 }}>
                    {overviewStats.midCount} MID
                  </span>
                )}
                {overviewStats.fwdCount > 0 && (
                  <span className="scout-pos-badge-fwd" style={{ padding: '1px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 800 }}>
                    {overviewStats.fwdCount} FWD
                  </span>
                )}
                {players.length === 0 && <span style={{ color: '#94a3b8' }}>None</span>}
              </div>
            </div>
          </div>

          {/* Scout Action Bar (Toolbar: Filter, Search, Sort & View Switcher) */}
          <div className="scout-action-bar">
            {/* Position Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setPositionFilter('ALL')}
                className={`scout-filter-btn ${positionFilter === 'ALL' ? 'active' : ''}`}
              >
                <span>All</span>
                <span style={{ opacity: 0.8, fontSize: '11px' }}>({players.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setPositionFilter('GK')}
                className={`scout-filter-btn ${positionFilter === 'GK' ? 'active filter-gk' : ''}`}
              >
                <span>GK</span>
                <span style={{ opacity: 0.8, fontSize: '11px' }}>({overviewStats.gkCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setPositionFilter('DEF')}
                className={`scout-filter-btn ${positionFilter === 'DEF' ? 'active filter-def' : ''}`}
              >
                <span>DEF</span>
                <span style={{ opacity: 0.8, fontSize: '11px' }}>({overviewStats.defCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setPositionFilter('MID')}
                className={`scout-filter-btn ${positionFilter === 'MID' ? 'active filter-mid' : ''}`}
              >
                <span>MID</span>
                <span style={{ opacity: 0.8, fontSize: '11px' }}>({overviewStats.midCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setPositionFilter('FWD')}
                className={`scout-filter-btn ${positionFilter === 'FWD' ? 'active filter-fwd' : ''}`}
              >
                <span>FWD</span>
                <span style={{ opacity: 0.8, fontSize: '11px' }}>({overviewStats.fwdCount})</span>
              </button>
            </div>

            {/* Right Controls: Search, Sort & View Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Search Box */}
              <SearchInput
                size="compact"
                placeholder="Filter targets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                wrapperClassName="w-44"
              />

              {/* Sort Selector (Real Data Only) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Sort:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12.5px',
                    background: '#ffffff',
                    color: '#334155',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="NAME_ASC">Name (A-Z)</option>
                  <option value="AGE_ASC">Age: Youngest</option>
                  <option value="AGE_DESC">Age: Oldest</option>
                  <option value="POS">Position (GK → FWD)</option>
                </select>
              </div>

              {/* View Switcher: Grid vs Table */}
              <div className="scout-tabs-segmented">
                <button
                  type="button"
                  onClick={() => setViewMode('GRID')}
                  className={`scout-tab-segmented-btn ${viewMode === 'GRID' ? 'active' : ''}`}
                  title="Grid View (Cards)"
                >
                  <span>⊞</span>
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className={`scout-tab-segmented-btn ${viewMode === 'TABLE' ? 'active' : ''}`}
                  title="Table View (Data Table)"
                >
                  <span>☰</span>
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Empty Shortlist Area */}
          {players.length === 0 && (
            <div className="scout-empty-state">
              <div className="scout-empty-state-icon">⚽</div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                TARGET WATCHLIST
              </div>
              <h3 className="scout-empty-state-title" style={{ fontSize: '20px' }}>
                No players in this shortlist yet
              </h3>
              <p className="scout-empty-state-desc">
                Add players directly from the Player Search card grid, Player Detail page, or Head-to-Head Comparison.
              </p>
            </div>
          )}

          {/* Filtered Empty State */}
          {players.length > 0 && filteredAndSortedPlayers.length === 0 && (
            <div className="scout-empty-state">
              <div className="scout-empty-state-icon">🔍</div>
              <h3 className="scout-empty-state-title">
                No targets match filter criteria
              </h3>
              <p className="scout-empty-state-desc">
                Try selecting a different position tab or clearing your search term.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPositionFilter('ALL');
                  setSearchQuery('');
                }}
                className="scout-btn scout-btn-sm scout-btn-secondary"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* View Mode: GRID (Trading / Scout Cards) */}
          {viewMode === 'GRID' && filteredAndSortedPlayers.length > 0 && (
            <div className="scout-shortlist-grid" style={{ marginTop: '8px' }}>
              {filteredAndSortedPlayers.map((item) => {
                const player = item.player;
                const age = calculateAge(player?.dateOfBirth);
                const position = player?.primaryPosition || '—';
                const posBadgeClass = getPositionBadgeClass(player?.primaryPosition);
                const isMenuOpen = activeMenuPlayerId === item.id;
                const flagUrl = getNationalityFlagUrl(player?.nationality);

                return (
                  <div key={item.id} className="scout-trading-card">
                    {/* Top Row: Cutout & Core Badges */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                        {/* Player Cutout / Photo (76x76px) without shirt number overlay */}
                        <div className="scout-trading-cutout">
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
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                              <JerseyIcon size={32} />
                            </div>
                          )}
                        </div>

                        {/* Middle: Player Name, Team, Position & Nationality */}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <span
                              className={`scout-badge ${posBadgeClass}`}
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 900,
                                padding: '2px 7px',
                                borderRadius: '5px',
                                letterSpacing: '0.03em',
                              }}
                            >
                              {position}
                            </span>

                            {age && (
                              <span
                                style={{
                                  background: '#f1f5f9',
                                  color: '#334155',
                                  fontSize: '10.5px',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '5px',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                {age} yrs
                              </span>
                            )}
                          </div>

                          <h3
                            style={{
                              fontSize: '15.5px',
                              fontWeight: 800,
                              color: '#0f172a',
                              margin: '0 0 4px 0',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={player?.name}
                          >
                            {player?.name || 'Unknown Player'}
                          </h3>

                          {/* Club & Country */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                            {player?.currentTeam && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#334155' }}>
                                {player.currentTeam.logoUrl && (
                                  <img
                                    src={player.currentTeam.logoUrl}
                                    alt=""
                                    style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                                  />
                                )}
                                <span>{player.currentTeam.name}</span>
                              </span>
                            )}
                            {player?.nationality && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {flagUrl && (
                                  <img
                                    src={flagUrl}
                                    alt=""
                                    style={{ width: '14px', height: '10px', objectFit: 'cover', borderRadius: '1px' }}
                                  />
                                )}
                                <span>{player.nationality}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Top-Right Overflow Action ⋮ */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuPlayerId(isMenuOpen ? null : item.id);
                            }}
                            className="scout-btn scout-btn-sm scout-btn-secondary"
                            style={{
                              width: '30px',
                              height: '30px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              fontWeight: 900,
                              borderRadius: '8px',
                            }}
                            aria-label="Target options"
                            title="Target options"
                          >
                            ⋮
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '4px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                minWidth: '150px',
                                zIndex: 20,
                                overflow: 'hidden',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuPlayerId(null);
                                  handleOpenNoteModal(item);
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
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <span>✏️</span>
                                <span>{item.note ? 'Edit Note' : 'Add Note'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuPlayerId(null);
                                  handleOpenRemoveModal(item);
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
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <span>🗑️</span>
                                <span>Remove Target</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Scout Real Attributes Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        {player?.heightCm && (
                          <div className="scout-stat-pill" title="Height">
                            <span style={{ color: '#64748b' }}>HT</span>
                            <span style={{ fontWeight: 700 }}>{player.heightCm} cm</span>
                          </div>
                        )}

                        {player?.weightKg && (
                          <div className="scout-stat-pill" title="Weight">
                            <span style={{ color: '#64748b' }}>WT</span>
                            <span style={{ fontWeight: 700 }}>{player.weightKg} kg</span>
                          </div>
                        )}

                        {player?.shirtNumber && (
                          <div className="scout-stat-pill" title="Squad Number">
                            <span style={{ color: '#64748b' }}>No.</span>
                            <span style={{ fontWeight: 700 }}>#{player.shirtNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Streamlined Scout Note Footer */}
                    <div className="scout-card-note-footer">
                      {item.note ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            gap: '8px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '6px 10px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '11.5px',
                              color: '#334155',
                              fontStyle: 'italic',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flex: 1,
                            }}
                            title={item.note}
                          >
                            📝 "{item.note}"
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenNoteModal(item)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#2563eb',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 4px',
                              flexShrink: 0,
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                            No notes
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenNoteModal(item)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#64748b',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 6px',
                              borderRadius: '4px',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#2563eb';
                              e.currentTarget.style.background = '#eff6ff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#64748b';
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <span>✏️</span>
                            <span>+ Note</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* View Mode: TABLE (Wyscout / FBref Data Table Style) */}
          {viewMode === 'TABLE' && filteredAndSortedPlayers.length > 0 && (
            <div className="scout-table-wrapper">
              <table className="scout-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Player</th>
                    <th>Pos</th>
                    <th>Club</th>
                    <th>Age</th>
                    <th>Nationality</th>
                    <th>Height / Weight</th>
                    <th>Scout Note</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedPlayers.map((item, index) => {
                    const player = item.player;
                    const age = calculateAge(player?.dateOfBirth);
                    const position = player?.primaryPosition || '—';
                    const posBadgeClass = getPositionBadgeClass(player?.primaryPosition);
                    const flagUrl = getNationalityFlagUrl(player?.nationality);

                    return (
                      <tr key={item.id}>
                        <td style={{ color: '#94a3b8', fontWeight: 700, fontSize: '12px' }}>
                          {index + 1}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '8px',
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {player?.imageUrl ? (
                                <img
                                  src={player.imageUrl}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <JerseyIcon size={18} />
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>
                                {player?.name || 'Unknown'}
                              </div>
                              {player?.shirtNumber && (
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  #{player.shirtNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`scout-badge ${posBadgeClass}`}
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 900,
                              padding: '2px 7px',
                              borderRadius: '4px',
                            }}
                          >
                            {position}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                            {player?.currentTeam?.logoUrl && (
                              <img
                                src={player.currentTeam.logoUrl}
                                alt=""
                                style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                              />
                            )}
                            <span>{player?.currentTeam?.name || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{age ? `${age} yrs` : '—'}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {flagUrl && (
                              <img
                                src={flagUrl}
                                alt=""
                                style={{ width: '16px', height: '11px', objectFit: 'cover', borderRadius: '1px' }}
                              />
                            )}
                            <span>{player?.nationality || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', color: '#334155' }}>
                            {player?.heightCm ? `${player.heightCm} cm` : '—'}
                            {player?.weightKg ? ` • ${player.weightKg} kg` : ''}
                          </div>
                        </td>
                        <td style={{ maxWidth: '260px' }}>
                          {item.note ? (
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#475569',
                                fontStyle: 'italic',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={item.note}
                            >
                              "{item.note}"
                            </span>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenNoteModal(item)}
                              className="scout-btn scout-btn-sm scout-btn-secondary"
                              title={item.note ? 'Edit Note' : 'Add Note'}
                              style={{ padding: '4px 8px', fontSize: '11.5px' }}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenRemoveModal(item)}
                              className="scout-btn scout-btn-sm scout-btn-secondary"
                              title="Remove Target"
                              style={{ padding: '4px 8px', fontSize: '11.5px', color: '#ef4444' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* EDIT SHORTLIST MODAL */}
      {isEditShortlistModalOpen && (
        <div
          className="scout-modal-clean-overlay"
          onClick={handleCloseEditShortlistModal}
          role="presentation"
        >
          <div
            className="scout-modal-clean-dialog shortlist-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-shortlist-detail-title"
          >
            <ModalHeader
              id="edit-shortlist-detail-title"
              title="Edit Shortlist"
              subtitle="Update shortlist details and visibility"
              onClose={handleCloseEditShortlistModal}
            />

            {editShortlistError && (
              <div className="scout-modal-alert-error" role="alert">
                <AlertCircleIcon size={16} />
                <span>{editShortlistError}</span>
              </div>
            )}

            <form onSubmit={handleEditShortlistSubmit} className="scout-modal-clean-form">
              <div className="scout-field-group">
                <label htmlFor="edit-detail-shortlist-name" className="scout-field-label">
                  Shortlist Name <span className="scout-field-required">*</span>
                </label>
                <input
                  id="edit-detail-shortlist-name"
                  type="text"
                  required
                  maxLength={150}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={submittingEditShortlist}
                  className="scout-clean-input"
                />
              </div>

              <div className="scout-field-group">
                <label htmlFor="edit-detail-shortlist-desc" className="scout-field-label">
                  Description <span className="scout-field-optional">(Optional)</span>
                </label>
                <textarea
                  id="edit-detail-shortlist-desc"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={submittingEditShortlist}
                  placeholder="Target age group, positions, tactical criteria..."
                  className="scout-clean-textarea"
                />
              </div>

              <VisibilitySelector
                value={editVisibility}
                onChange={setEditVisibility}
                disabled={submittingEditShortlist}
                label="Visibility"
                privateTitle="PRIVATE"
                privateDescription="Only you can view and edit."
                publicTitle="PUBLIC"
                publicDescription="Visible to all members."
              />

              <ModalFooter
                onCancel={handleCloseEditShortlistModal}
                submitText="Save Changes"
                submittingText="Saving..."
                isSubmitting={submittingEditShortlist}
                isSubmitDisabled={!editName.trim()}
              />
            </form>
          </div>
        </div>
      )}

      {/* REDESIGNED SCOUT NOTE MODAL (CLEAN LIGHT MODE, PLAYER MINI-BANNER & FULL-WIDTH TEXTAREA) */}
      {editingPlayerNote && (
        <div className="scout-modal-clean-overlay" onClick={handleCloseNoteModal} role="presentation">
          <div
            className="scout-modal-clean-dialog note-dialog"
            style={{ maxWidth: '500px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="scout-note-modal-title"
          >
            {/* Header with ScoutBoard primary blue title & clean close button */}
            <div className="scout-modal-clean-header" style={{ marginBottom: '16px' }}>
              <div className="scout-modal-clean-header-content">
                <h2 id="scout-note-modal-title" className="scout-modal-clean-title" style={{ color: '#2563eb' }}>
                  Scout Note
                </h2>
                <p className="scout-modal-clean-subtitle">
                  Record scouting observations and tactical recommendations
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseNoteModal}
                className="scout-modal-clean-close-btn"
                aria-label="Close modal"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            {/* Player Mini-Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {editingPlayerNote.player?.imageUrl ? (
                  <img
                    src={editingPlayerNote.player.imageUrl}
                    alt={editingPlayerNote.player.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <JerseyIcon size={24} />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  {editingPlayerNote.player?.name || 'Player'}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                  {editingPlayerNote.player?.primaryPosition && (
                    <span
                      className={`scout-badge ${getPositionBadgeClass(editingPlayerNote.player.primaryPosition)}`}
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {editingPlayerNote.player.primaryPosition}
                    </span>
                  )}
                  {editingPlayerNote.player?.currentTeam && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#334155' }}>
                      {editingPlayerNote.player.currentTeam.logoUrl && (
                        <img
                          src={editingPlayerNote.player.currentTeam.logoUrl}
                          alt=""
                          style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                        />
                      )}
                      <span>{editingPlayerNote.player.currentTeam.name}</span>
                    </span>
                  )}
                  {editingPlayerNote.player?.shirtNumber && (
                    <span>• #{editingPlayerNote.player.shirtNumber}</span>
                  )}
                </div>
              </div>
            </div>

            {noteError && (
              <div className="scout-modal-alert-error" role="alert" style={{ marginBottom: '14px' }}>
                <AlertCircleIcon size={16} />
                <span>{noteError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNoteSubmit}>
              {/* Full-width Textarea with Character Counter */}
              <div style={{ marginBottom: '20px', position: 'relative' }}>
                <label htmlFor="scout-note-textarea" style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Scouting Observations
                </label>
                <textarea
                  id="scout-note-textarea"
                  rows={5}
                  maxLength={500}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Record tactical strengths, weaknesses, work rate, attitude, contract notes..."
                  style={{
                    width: '100%',
                    minHeight: '130px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '13.5px',
                    lineHeight: 1.5,
                    padding: '10px 12px 28px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                  autoFocus
                />
                {/* Character Counter */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '12px',
                    fontSize: '11px',
                    color: noteInput.length >= 480 ? '#ef4444' : '#94a3b8',
                    fontWeight: 600,
                    pointerEvents: 'none',
                  }}
                >
                  {noteInput.length} / 500 characters
                </div>
              </div>

              {/* Footer Buttons (Right aligned flush with textarea) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
                <button
                  type="button"
                  onClick={handleCloseNoteModal}
                  disabled={submittingNote}
                  className="scout-modal-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="scout-modal-btn-submit"
                >
                  {submittingNote ? 'Saving...' : 'Save Note'}
                </button>
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
                style={{ minWidth: '110px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={submittingRemove}
                className="scout-btn scout-btn-danger"
                style={{ minWidth: '120px' }}
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
