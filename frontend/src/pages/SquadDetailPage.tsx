import React, { useState, useEffect } from 'react';
import type { Squad, SquadPlayerItem } from '../types/squad.types';
import type { PlayerItem } from '../types/player.types';
import {
  getSquadByIdApi,
  getPlayersInSquadApi,
  addPlayerToSquadApi,
  updateSquadPlayerApi,
  removePlayerFromSquadApi,
  deleteSquadApi,
} from '../services/squad.service';
import { searchPlayersApi } from '../services/player.service';
import {
  FORMATION_CONFIGS,
  type FormationSlot,
  findStarterForSlot,
  isPlayerInSquad,
  applyMoveStarter,
  applyStarterToBench,
  applyBenchToStarter,
} from '../utils/squad-placement.utils';

interface SquadDetailPageProps {
  squadId: string;
  onBack: () => void;
  onNavigateToLogin?: () => void;
  isAuthenticated?: boolean;
}

export const SquadDetailPage: React.FC<SquadDetailPageProps> = ({
  squadId,
  onBack,
  onNavigateToLogin,
  isAuthenticated = true,
}) => {
  const [squad, setSquad] = useState<Squad | null>(null);
  const [players, setPlayers] = useState<SquadPlayerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Drag & Drop State
  const [draggedPlayer, setDraggedPlayer] = useState<{
    id: string;
    sourceType: 'STARTER' | 'SUBSTITUTE' | 'POOL';
    slotCode?: string | null;
    playerData?: any;
  } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Player Picker Drawer State
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerTargetSlot, setPickerTargetSlot] = useState<string | null>(null);
  const [pickerTargetRole, setPickerTargetRole] = useState<'STARTER' | 'SUBSTITUTE'>('STARTER');
  const [poolSearch, setPoolSearch] = useState<string>('');
  const [poolPlayers, setPoolPlayers] = useState<PlayerItem[]>([]);
  const [poolLoading, setPoolLoading] = useState<boolean>(false);

  // Delete Squad Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [submittingDelete, setSubmittingDelete] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const fetchSquadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [squadData, playersData] = await Promise.all([
        getSquadByIdApi(squadId),
        getPlayersInSquadApi(squadId),
      ]);
      setSquad(squadData);
      setPlayers(playersData);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setError('UNAUTHORIZED');
      } else if (err.message?.includes('404') || err.message?.toLowerCase().includes('not found')) {
        setError('Squad not found.');
      } else if (err.message?.includes('403') || err.message?.toLowerCase().includes('forbidden')) {
        setError('You do not have permission to view this squad.');
      } else {
        setError(err.message || 'Unable to load squad details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSquadData();
  }, [squadId]);

  // Load player pool when search changes or drawer opens
  useEffect(() => {
    if (!isPickerOpen) return;
    const delayDebounce = setTimeout(async () => {
      setPoolLoading(true);
      try {
        const res = await searchPlayersApi({
          search: poolSearch.trim() || undefined,
          limit: 15,
          offset: 0,
        });
        setPoolPlayers(res.items);
      } catch {
        setPoolPlayers([]);
      } finally {
        setPoolLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [poolSearch, isPickerOpen]);

  // Separate starters and substitutes
  const starters = players.filter((p) => p.role === 'STARTER');
  const substitutes = players.filter((p) => p.role === 'SUBSTITUTE');

  const formationCode = squad?.formationCode || '4-3-3';
  const formationLayout = FORMATION_CONFIGS[formationCode] || FORMATION_CONFIGS['4-3-3'];

  // --- CAPTAINCY MUTATIONS (TC-01, TC-02, TC-03, TC-04) ---

  const handleSetCaptain = async (playerId: string) => {
    const targetPlayer = players.find((p) => p.playerId === playerId);
    if (!targetPlayer) return;

    if (targetPlayer.role !== 'STARTER') {
      showToast('Captain can only be assigned to a STARTER player.', 'error');
      return;
    }

    const previousSnapshot = [...players];

    // Optimistic UI: set this player as captain, unset any existing captain
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        isCaptain: p.playerId === playerId,
      })),
    );

    try {
      await updateSquadPlayerApi(squadId, playerId, {
        isCaptain: true,
      });
      showToast(`⭐ ${targetPlayer.player?.name || 'Player'} is now team Captain!`);
    } catch (err: any) {
      setPlayers(previousSnapshot);
      showToast(err.message || 'Failed to update team captain.', 'error');
    }
  };

  const handleRemoveCaptain = async (playerId: string) => {
    const targetPlayer = players.find((p) => p.playerId === playerId);
    if (!targetPlayer) return;

    const previousSnapshot = [...players];

    setPlayers((prev) =>
      prev.map((p) => (p.playerId === playerId ? { ...p, isCaptain: false } : p)),
    );

    try {
      await updateSquadPlayerApi(squadId, playerId, {
        isCaptain: false,
      });
      showToast('Captaincy removed.');
    } catch (err: any) {
      setPlayers(previousSnapshot);
      showToast(err.message || 'Failed to remove captaincy.', 'error');
    }
  };

  // --- EXPLICIT SAVE / SYNC SQUAD (TC-05, TC-08) ---
  const handleSaveSquad = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Re-fetch to ensure clean sync with server
      await fetchSquadData();
      showToast('💾 Squad configuration saved and synced successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save squad configuration.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- DELETE SQUAD (TC-09) ---
  const handleDeleteSquad = async () => {
    if (submittingDelete) return;
    setSubmittingDelete(true);
    try {
      await deleteSquadApi(squadId);
      showToast('Squad deleted successfully.');
      onBack();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete squad.', 'error');
    } finally {
      setSubmittingDelete(false);
      setIsDeleteModalOpen(false);
    }
  };

  // --- MUTATION HANDLERS (WITH OPTIMISTIC UI & ROLLBACK) ---

  // 1. Place player from Pool to Starter or Bench
  const handleAddPlayerFromPool = async (player: PlayerItem, slotCode: string | null, role: 'STARTER' | 'SUBSTITUTE') => {
    const playerName = player.fullName || 'Player';
    if (isPlayerInSquad(players, player.id)) {
      showToast(`${playerName} is already in this squad.`, 'error');
      return;
    }

    const previousSnapshot = [...players];

    const optimisticItem: SquadPlayerItem = {
      id: `temp-${Date.now()}`,
      squadId,
      playerId: player.id,
      slotCode: role === 'STARTER' ? slotCode : null,
      role,
      isCaptain: false,
      displayOrder: role === 'SUBSTITUTE' ? substitutes.length + 1 : null,
      player: {
        id: player.id,
        name: playerName,
        shortName: playerName,
        dateOfBirth: player.dateOfBirth ?? null,
        nationality: player.nationality ?? null,
        heightCm: player.heightCm ?? null,
        weightKg: player.weightKg ?? null,
        primaryPosition: player.primaryPosition ?? null,
        shirtNumber: player.shirtNumber ?? null,
        imageUrl: player.imageUrl ?? null,
        currentTeam: player.currentTeam
          ? {
              id: player.currentTeam.id,
              name: player.currentTeam.name,
              shortName: player.currentTeam.shortName ?? null,
              logoUrl: player.currentTeam.logoUrl ?? null,
            }
          : null,
      },
    };

    setPlayers((prev) => {
      const filtered = role === 'STARTER' && slotCode
        ? prev.filter((p) => !(p.role === 'STARTER' && p.slotCode === slotCode))
        : prev;
      return [...filtered, optimisticItem];
    });
    setIsPickerOpen(false);

    try {
      const saved = await addPlayerToSquadApi(squadId, {
        playerId: player.id,
        slotCode: role === 'STARTER' ? slotCode : null,
        role,
      });
      setPlayers((prev) =>
        prev.map((p) => (p.playerId === player.id ? { ...p, ...saved, player: optimisticItem.player } : p)),
      );
      showToast(`${playerName} added as ${role === 'STARTER' ? slotCode : 'Substitute'}.`);
    } catch (err: any) {
      setPlayers(previousSnapshot);
      showToast(err.message || 'Failed to add player to squad.', 'error');
    }
  };

  // 2. Move or swap Starter slot
  const handleMoveStarterSlot = async (sourcePlayerId: string, targetSlotCode: string) => {
    const previousSnapshot = [...players];
    const { nextPlayers, swappedPlayer } = applyMoveStarter(players, sourcePlayerId, targetSlotCode);

    setPlayers(nextPlayers);

    try {
      await updateSquadPlayerApi(squadId, sourcePlayerId, {
        slotCode: targetSlotCode,
        role: 'STARTER',
      });

      if (swappedPlayer && swappedPlayer.slotCode) {
        const sourcePlayer = previousSnapshot.find((p) => p.playerId === sourcePlayerId);
        await updateSquadPlayerApi(squadId, swappedPlayer.playerId, {
          slotCode: sourcePlayer?.slotCode || null,
          role: 'STARTER',
        });
      }
      showToast('Tactical position updated.');
    } catch (err: any) {
      setPlayers(previousSnapshot);
      showToast(err.message || 'Failed to move player position.', 'error');
    }
  };

  // 3. Move Starter -> Bench (Substitute)
  const handleStarterToBenchDrop = async (playerId: string) => {
    const previousSnapshot = [...players];
    const nextPlayers = applyStarterToBench(players, playerId);
    setPlayers(nextPlayers);

    try {
      await updateSquadPlayerApi(squadId, playerId, {
        role: 'SUBSTITUTE',
        slotCode: null,
        isCaptain: false,
      });
      showToast('Player moved to substitute bench.');
    } catch (err: any) {
      setPlayers(previousSnapshot);
      showToast(err.message || 'Failed to move player to bench.', 'error');
    }
  };

  // 4. Move Bench (Substitute) -> Starter Slot
  const handleBenchToStarterDrop = async (playerId: string, targetSlotCode: string) => {
    const previousSnapshot = [...players];
    const { nextPlayers, displacedStarter } = applyBenchToStarter(players, playerId, targetSlotCode);
    setPlayers(nextPlayers);

    try {
      if (displacedStarter) {
        await updateSquadPlayerApi(squadId, displacedStarter.playerId, {
          role: 'SUBSTITUTE',
          slotCode: null,
          isCaptain: false,
        });
      }

      await updateSquadPlayerApi(squadId, playerId, {
        role: 'STARTER',
        slotCode: targetSlotCode,
      });
      showToast(`Player promoted to ${targetSlotCode} starter.`);
    } catch (err: any) {
      setPlayers(previousSnapshot);
      showToast(err.message || 'Failed to promote player to starter.', 'error');
    }
  };

  // 5. Remove Player from squad
  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    const previousSnapshot = [...players];
    setPlayers((prev) => prev.filter((p) => p.playerId !== playerId));

    try {
      await removePlayerFromSquadApi(squadId, playerId);
      showToast(`${playerName} removed from squad.`);
    } catch (err: any) {
      setPlayers(previousSnapshot);
      showToast(err.message || 'Failed to remove player.', 'error');
    }
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (
    e: React.DragEvent,
    id: string,
    sourceType: 'STARTER' | 'SUBSTITUTE' | 'POOL',
    slotCode?: string | null,
    playerData?: any,
  ) => {
    setDraggedPlayer({ id, sourceType, slotCode, playerData });
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTarget !== targetId) {
      setDragOverTarget(targetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDropOnStarterSlot = async (e: React.DragEvent, targetSlot: FormationSlot) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (!draggedPlayer) return;

    if (draggedPlayer.sourceType === 'STARTER') {
      if (draggedPlayer.slotCode === targetSlot.code) return;
      await handleMoveStarterSlot(draggedPlayer.id, targetSlot.code);
    } else if (draggedPlayer.sourceType === 'SUBSTITUTE') {
      await handleBenchToStarterDrop(draggedPlayer.id, targetSlot.code);
    } else if (draggedPlayer.sourceType === 'POOL' && draggedPlayer.playerData) {
      await handleAddPlayerFromPool(draggedPlayer.playerData, targetSlot.code, 'STARTER');
    }

    setDraggedPlayer(null);
  };

  const handleDropOnBench = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (!draggedPlayer) return;

    if (draggedPlayer.sourceType === 'STARTER') {
      await handleStarterToBenchDrop(draggedPlayer.id);
    } else if (draggedPlayer.sourceType === 'POOL' && draggedPlayer.playerData) {
      await handleAddPlayerFromPool(draggedPlayer.playerData, null, 'SUBSTITUTE');
    }

    setDraggedPlayer(null);
  };

  const handleOpenPickerForSlot = (slotCode: string) => {
    setPickerTargetSlot(slotCode);
    setPickerTargetRole('STARTER');
    setPoolSearch('');
    setIsPickerOpen(true);
  };

  const handleOpenPickerForBench = () => {
    setPickerTargetSlot(null);
    setPickerTargetRole('SUBSTITUTE');
    setPoolSearch('');
    setIsPickerOpen(true);
  };

  return (
    <div
      className="scout-page-container"
      style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '32px 20px 80px',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`scout-toast ${toastType === 'error' ? 'scout-toast-error' : 'scout-toast-success'}`}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: toastType === 'error'
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #10b981, #059669)',
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
          <span>{toastType === 'error' ? '⚠️' : '✅'}</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation & Action Toolbar */}
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          type="button"
          className="scout-btn scout-btn-sm scout-btn-secondary"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '10px',
          }}
        >
          ← My Squads
        </button>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="scout-btn scout-btn-sm"
            onClick={handleSaveSquad}
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '10px',
              background: '#0284c7',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
            }}
          >
            <span>💾</span> {isSaving ? 'Saving...' : 'Save Squad'}
          </button>

          <button
            type="button"
            className="scout-btn scout-btn-sm"
            onClick={handleOpenPickerForBench}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '10px',
            }}
          >
            <span>+</span> Add Player
          </button>

          <button
            type="button"
            className="scout-btn scout-btn-sm"
            onClick={() => setIsDeleteModalOpen(true)}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            🗑️ Delete
          </button>
        </div>
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
            Please log in to view and manage this tactical squad.
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

      {/* 2. ERROR / 404 STATE */}
      {error && error !== 'UNAUTHORIZED' ? (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '32px 24px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>⚠️</span>
          <h3 style={{ margin: '0 0 8px', color: '#fca5a5', fontSize: '18px' }}>
            {error}
          </h3>
          <p style={{ color: '#fecaca', fontSize: '14px', maxWidth: '450px', margin: '0 auto 20px' }}>
            The squad you are looking for might have been deleted, or you do not have permission to access it.
          </p>
          <button
            type="button"
            className="scout-btn scout-btn-secondary"
            onClick={fetchSquadData}
            style={{ padding: '8px 20px', fontSize: '13px' }}
          >
            🔄 Try Again
          </button>
        </div>
      ) : null}

      {/* 3. LOADING SKELETON */}
      {loading ? (
        <div style={{ animation: 'pulse 1.5s infinite' }}>
          <div
            style={{
              height: '120px',
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '16px',
              marginBottom: '24px',
            }}
          />
          <div
            style={{
              height: '580px',
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '20px',
            }}
          />
        </div>
      ) : null}

      {/* 4. SQUAD DETAIL & TACTICAL PITCH CONTENT */}
      {!loading && !error && squad ? (
        <div>
          {/* Squad Header Banner */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '28px',
              marginBottom: '28px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
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
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
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

              {squad.seasonId ? (
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: 'rgba(168, 85, 247, 0.12)',
                    color: '#c084fc',
                  }}
                >
                  Season {squad.seasonId}
                </span>
              ) : null}

              <span
                style={{
                  fontSize: '13px',
                  color: '#94a3b8',
                  marginLeft: 'auto',
                }}
              >
                Starters: {starters.length}/11 · Bench: {substitutes.length}
              </span>
            </div>

            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#f8fafc',
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
              }}
            >
              {squad.name}
            </h1>

            {squad.description && (
              <p
                style={{
                  color: '#94a3b8',
                  fontSize: '14px',
                  margin: 0,
                  lineHeight: 1.5,
                  maxWidth: '800px',
                }}
              >
                {squad.description}
              </p>
            )}
          </div>

          {/* Main Layout: Tactical Pitch + Bench Panel */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 340px',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* --- TACTICAL PITCH --- */}
            <div
              className="tactical-pitch-container"
              style={{
                background: 'linear-gradient(180deg, #0f3822 0%, #092315 100%)',
                border: '2px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                padding: '36px 20px',
                position: 'relative',
                minHeight: '620px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 0 100px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden',
              }}
            >
              {/* Pitch Markings */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '130px',
                  height: '130px',
                  border: '2px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '6px',
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.25)',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  width: '260px',
                  height: '90px',
                  border: '2px solid rgba(255, 255, 255, 0.15)',
                  borderTop: 'none',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  width: '260px',
                  height: '90px',
                  border: '2px solid rgba(255, 255, 255, 0.15)',
                  borderBottom: 'none',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Pitch Formation Rows */}
              {formationLayout.map((row) => (
                <div
                  key={row.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    zIndex: 10,
                    margin: '8px 0',
                  }}
                >
                  {row.slots.map((slot) => {
                    const assignedPlayer = findStarterForSlot(players, slot);
                    const isDragOver = dragOverTarget === `slot-${slot.code}`;

                    return (
                      <div
                        key={slot.code}
                        onDragOver={(e) => handleDragOver(e, `slot-${slot.code}`)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropOnStarterSlot(e, slot)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          width: '95px',
                          textAlign: 'center',
                          transform: isDragOver ? 'scale(1.08)' : 'scale(1)',
                          transition: 'transform 0.18s ease',
                        }}
                      >
                        {assignedPlayer ? (
                          // Occupied Slot
                          <div
                            draggable={true}
                            onDragStart={(e) =>
                              handleDragStart(
                                e,
                                assignedPlayer.playerId,
                                'STARTER',
                                assignedPlayer.slotCode,
                                assignedPlayer.player,
                              )
                            }
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              position: 'relative',
                              cursor: 'grab',
                              userSelect: 'none',
                            }}
                          >
                            {/* Captain Badge & Toggle (TC-01, TC-02, TC-03) */}
                            <button
                              type="button"
                              title={
                                assignedPlayer.isCaptain
                                  ? 'Team Captain (Click to remove)'
                                  : 'Click to make Captain'
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (assignedPlayer.isCaptain) {
                                  void handleRemoveCaptain(assignedPlayer.playerId);
                                } else {
                                  void handleSetCaptain(assignedPlayer.playerId);
                                }
                              }}
                              style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '8px',
                                background: assignedPlayer.isCaptain
                                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                  : 'rgba(15, 23, 42, 0.85)',
                                color: assignedPlayer.isCaptain ? '#000000' : '#f59e0b',
                                fontWeight: 900,
                                fontSize: '10px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                                zIndex: 20,
                                border: assignedPlayer.isCaptain
                                  ? '1.5px solid #ffffff'
                                  : '1px solid rgba(245, 158, 11, 0.4)',
                                cursor: 'pointer',
                              }}
                            >
                              {assignedPlayer.isCaptain ? 'C' : '⭐'}
                            </button>

                            {/* Remove button */}
                            <button
                              type="button"
                              title="Remove player"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRemovePlayer(
                                  assignedPlayer.playerId,
                                  assignedPlayer.player?.name || 'Player',
                                );
                              }}
                              style={{
                                position: 'absolute',
                                top: '-6px',
                                left: '8px',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 20,
                              }}
                            >
                              ✕
                            </button>

                            {/* Player Circle */}
                            <div
                              style={{
                                width: '54px',
                                height: '54px',
                                borderRadius: '50%',
                                background: assignedPlayer.isCaptain
                                  ? 'linear-gradient(135deg, #f59e0b, #b45309)'
                                  : 'linear-gradient(135deg, #0284c7, #0369a1)',
                                border: isDragOver
                                  ? '2px solid #22c55e'
                                  : assignedPlayer.isCaptain
                                  ? '2px solid #fbbf24'
                                  : '2px solid #38bdf8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '16px',
                                marginBottom: '6px',
                                position: 'relative',
                                overflow: 'hidden',
                              }}
                            >
                              {assignedPlayer.player?.imageUrl ? (
                                <img
                                  src={assignedPlayer.player.imageUrl}
                                  alt={assignedPlayer.player.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span>{assignedPlayer.player?.shirtNumber || slot.label}</span>
                              )}
                            </div>

                            {/* Name Tag */}
                            <div
                              style={{
                                background: 'rgba(15, 23, 42, 0.9)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '6px',
                                padding: '2px 8px',
                                color: '#f8fafc',
                                fontSize: '11px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                maxWidth: '92px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {assignedPlayer.player?.shortName || assignedPlayer.player?.name || 'Player'}
                            </div>

                            {/* Slot Badge */}
                            <span
                              style={{
                                fontSize: '10px',
                                color: '#38bdf8',
                                fontWeight: 600,
                                marginTop: '2px',
                              }}
                            >
                              {slot.label} {assignedPlayer.isCaptain ? '(C)' : ''}
                            </span>
                          </div>
                        ) : (
                          // Empty Slot
                          <div
                            onClick={() => handleOpenPickerForSlot(slot.code)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <div
                              style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                border: isDragOver
                                  ? '2px solid #22c55e'
                                  : '2px dashed rgba(255, 255, 255, 0.35)',
                                background: isDragOver
                                  ? 'rgba(34, 197, 94, 0.25)'
                                  : 'rgba(15, 23, 42, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isDragOver ? '#22c55e' : 'rgba(255, 255, 255, 0.65)',
                                fontSize: '12px',
                                fontWeight: 700,
                                marginBottom: '4px',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              + {slot.label}
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                color: 'rgba(255, 255, 255, 0.45)',
                              }}
                            >
                              Add
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* --- BENCH (SUBSTITUTES) PANEL --- */}
            <div
              className="tactical-bench-container"
              onDragOver={(e) => handleDragOver(e, 'bench-area')}
              onDragLeave={handleDragLeave}
              onDrop={handleDropOnBench}
              style={{
                background: dragOverTarget === 'bench-area'
                  ? 'rgba(34, 197, 94, 0.12)'
                  : 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(16px)',
                border: dragOverTarget === 'bench-area'
                  ? '2px dashed #22c55e'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#f8fafc',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Substitutes
                </h3>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                  }}
                >
                  {substitutes.length}
                </span>
              </div>

              {substitutes.length === 0 ? (
                <div
                  style={{
                    padding: '36px 16px',
                    textAlign: 'center',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                  }}
                >
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🪑</span>
                  <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>
                    No substitutes on bench
                  </p>
                  <button
                    type="button"
                    className="scout-btn scout-btn-sm scout-btn-secondary"
                    onClick={handleOpenPickerForBench}
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                  >
                    + Add Substitute
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {substitutes.map((sub, idx) => (
                    <div
                      key={sub.id || sub.playerId}
                      draggable={true}
                      onDragStart={(e) =>
                        handleDragStart(e, sub.playerId, 'SUBSTITUTE', null, sub.player)
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        cursor: 'grab',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#64748b',
                          width: '16px',
                        }}
                      >
                        {idx + 1}
                      </span>

                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #475569, #334155)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '12px',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {sub.player?.imageUrl ? (
                          <img
                            src={sub.player.imageUrl}
                            alt={sub.player.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{sub.player?.shirtNumber || 'SUB'}</span>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4
                          style={{
                            margin: '0 0 2px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#f8fafc',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {sub.player?.name || 'Player'}
                        </h4>
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                          }}
                        >
                          {sub.player?.primaryPosition || 'SUB'}
                          {sub.player?.currentTeam ? ` · ${sub.player.currentTeam.shortName || sub.player.currentTeam.name}` : ''}
                        </span>
                      </div>

                      <button
                        type="button"
                        title="Remove player"
                        onClick={() =>
                          handleRemovePlayer(sub.playerId, sub.player?.name || 'Player')
                        }
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '14px',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* --- PLAYER PICKER DRAWER / MODAL --- */}
      {isPickerOpen && (
        <div className="scout-modal-overlay" onClick={() => setIsPickerOpen(false)}>
          <div
            className="scout-modal-dialog"
            style={{
              maxWidth: '540px',
              width: '90%',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '24px',
              color: '#f8fafc',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>
                  Select Player for {pickerTargetRole === 'STARTER' ? `Slot ${pickerTargetSlot}` : 'Bench'}
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Search and click to add to your squad
                </span>
              </div>
              <button
                type="button"
                className="scout-modal-close"
                onClick={() => setIsPickerOpen(false)}
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

            <input
              type="text"
              className="scout-input"
              placeholder="Search player by name..."
              value={poolSearch}
              onChange={(e) => setPoolSearch(e.target.value)}
              style={{ marginBottom: '16px' }}
              autoFocus
            />

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {poolLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  Searching players...
                </div>
              ) : poolPlayers.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No matching players found
                </div>
              ) : (
                poolPlayers.map((player) => {
                  const inSquad = isPlayerInSquad(players, player.id);

                  return (
                    <div
                      key={player.id}
                      onClick={() => !inSquad && handleAddPlayerFromPool(player, pickerTargetSlot, pickerTargetRole)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: inSquad ? 'rgba(30, 41, 59, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        cursor: inSquad ? 'not-allowed' : 'pointer',
                        opacity: inSquad ? 0.5 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {player.imageUrl ? (
                            <img
                              src={player.imageUrl}
                              alt={player.fullName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span>{player.shirtNumber || '⚽'}</span>
                          )}
                        </div>

                        <div>
                          <h4 style={{ margin: '0 0 2px', fontSize: '14px', color: '#f8fafc' }}>
                            {player.fullName}
                          </h4>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {player.primaryPosition} · {player.currentTeam?.name || player.nationality || 'Unattached'}
                          </span>
                        </div>
                      </div>

                      {inSquad ? (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                          In Squad
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="scout-btn scout-btn-sm"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          + Select
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && (
        <div className="scout-modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
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

            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
              Delete Squad?
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 20px', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: '#f8fafc' }}>"{squad?.name || 'this squad'}"</strong>? All tactical player placements will be removed. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                className="scout-btn scout-btn-secondary"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={submittingDelete}
              >
                Cancel
              </button>
              <button
                type="button"
                className="scout-btn"
                style={{ background: '#ef4444' }}
                onClick={handleDeleteSquad}
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
