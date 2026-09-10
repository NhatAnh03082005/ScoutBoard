import { SearchInput } from "../components/common";
import React, { useState, useEffect } from 'react';
import {
  getSquadByIdApi,
  getPlayersInSquadApi,
  addPlayerToSquadApi,
  updateSquadPlayerApi,
  removePlayerFromSquadApi,
  updateSquadApi,
  deleteSquadApi,
} from '../services/squad.service';
import { searchPlayersApi } from '../services/player.service';
import type {
  Squad,
  SquadPlayerItem,
  FormationCode,
} from '../types/squad.types';
import type { PlayerItem } from '../types/player.types';
import {
  FORMATION_CONFIGS,
  findStarterForSlot,
  applyMoveStarter,
  applyStarterToBench,
  isPlayerEligibleForSlot,
  getCanonicalPosition,
} from '../utils/squad-placement.utils';
import type { FormationSlot } from '../utils/squad-placement.utils';
import { FormationSelector } from '../components/modal/FormationSelector';

export interface SquadDetailPageProps {
  squadId: string;
  onBack?: () => void;
  onNavigateToLogin?: () => void;
  isAuthenticated?: boolean;
}

// Position category color mapping
function getSlotCategory(posCode?: string | null): 'attacker' | 'midfielder' | 'defender' | 'goalkeeper' {
  if (!posCode) return 'midfielder';
  const u = posCode.toUpperCase();
  if (['ST', 'CF', 'LW', 'RW', 'SS', 'FWD'].includes(u)) return 'attacker';
  if (['GK'].includes(u)) return 'goalkeeper';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(u)) return 'defender';
  return 'midfielder';
}


function getCleanDisplayPosition(posCode?: string | null): string {
  if (!posCode) return 'POS';
  const u = posCode.toUpperCase();
  if (['LS', 'RS', 'CF', 'SS'].includes(u)) return 'ST';
  if (['LCB', 'RCB'].includes(u)) return 'CB';
  if (['LDM', 'RDM'].includes(u)) return 'CDM';
  if (['LCM', 'RCM'].includes(u)) return 'CM';
  if (['LAM', 'RAM'].includes(u)) return 'CAM';
  return u;
}

function getPillBadgeColor(posCode?: string | null): string {
  const cat = getSlotCategory(posCode);
  switch (cat) {
    case 'attacker': return '#e11d48';
    case 'midfielder': return '#10b981';
    case 'defender': return '#2563eb';
    case 'goalkeeper': return '#f59e0b';
  }
}

const JerseyIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.5a2 2 0 0 0 1.62 1.65L7 11.5V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.5l2.52-.66a2 2 0 0 0 1.62-1.65l.58-3.5a2 2 0 0 0-1.34-2.23z" />
  </svg>
);



export const SquadDetailPage: React.FC<SquadDetailPageProps> = ({
  squadId,
  onBack,
}) => {
  // Main Data States
  const [squad, setSquad] = useState<Squad | null>(null);
  const [players, setPlayers] = useState<SquadPlayerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Inline Rename State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInputValue, setNameInputValue] = useState<string>('');

  // Formation Selector Modal State
  const [isFormationModalOpen, setIsFormationModalOpen] = useState<boolean>(false);

  // Tactical Player Picker Modal State (Click-to-Assign)
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerTargetSlot, setPickerTargetSlot] = useState<FormationSlot | null>(null);
  const [pickerTargetRole, setPickerTargetRole] = useState<'STARTER' | 'SUBSTITUTE'>('STARTER');
  const [replacingPlayer, setReplacingPlayer] = useState<SquadPlayerItem | null>(null);
  const [poolSearch, setPoolSearch] = useState<string>('');
  const [poolPlayers, setPoolPlayers] = useState<PlayerItem[]>([]);
  const [poolLoading, setPoolLoading] = useState<boolean>(false);

  // Context Popovers
  const [activeMenuSlotCode, setActiveMenuSlotCode] = useState<string | null>(null);
  const [activeBenchMenuId, setActiveBenchMenuId] = useState<string | null>(null);

  // Matchday Substitutes Drawer State (Hover & Click-to-pin)
  const [isBenchOpen, setIsBenchOpen] = useState<boolean>(false);

  // Bench Drawer Slide-up State
  // Bench section is directly placed below starting XI

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
      if (err.status === 401 || err.statusCode === 401) {
        setError('UNAUTHORIZED');
      } else {
        setError(err.message || 'Failed to load squad details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSquadData();
  }, [squadId]);

  // Load player pool when picker opens or search changes
  useEffect(() => {
    if (!isPickerOpen) return;

    let active = true;
    setPoolLoading(true);

    const timer = setTimeout(async () => {
      try {
        const canonicalPos = pickerTargetSlot
          ? getCanonicalPosition(pickerTargetSlot.requiredPosition || pickerTargetSlot.displayRole || pickerTargetSlot.code)
          : undefined;

        const response = await searchPlayersApi({
          search: poolSearch.trim() || undefined,
          position: !poolSearch.trim() && pickerTargetRole === 'STARTER' && canonicalPos ? canonicalPos : undefined,
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
  }, [isPickerOpen, poolSearch, pickerTargetSlot, pickerTargetRole]);

  // Quick Change Formation
  const handleQuickChangeFormation = async (newFormation: FormationCode) => {
    if (!squad || squad.formationCode === newFormation) {
      setIsFormationModalOpen(false);
      return;
    }
    const previousFormation = squad.formationCode;
    setSquad((prev) => (prev ? { ...prev, formationCode: newFormation } : prev));
    setIsFormationModalOpen(false);

    try {
      await updateSquadApi(squad.id, { formationCode: newFormation });
      showToast(`Đã chuyển sơ đồ chiến thuật sang ${newFormation}`);
    } catch (err: any) {
      setSquad((prev) => (prev ? { ...prev, formationCode: previousFormation } : prev));
      showToast(err.message || 'Failed to update formation.', 'error');
    }
  };

  // Start Editing Squad Name
  const handleStartEditName = () => {
    if (!squad) return;
    setNameInputValue(squad.name);
    setIsEditingName(true);
  };

  // Save Squad Name
  const handleSaveSquadName = async () => {
    if (!squad) return;
    const trimmed = nameInputValue.trim();
    if (!trimmed || trimmed === squad.name) {
      setIsEditingName(false);
      return;
    }
    const prevName = squad.name;
    setSquad((prev) => (prev ? { ...prev, name: trimmed } : prev));
    setIsEditingName(false);

    try {
      await updateSquadApi(squad.id, { name: trimmed });
      showToast('Đã lưu tên đội hình thành công.');
    } catch (err: any) {
      setSquad((prev) => (prev ? { ...prev, name: prevName } : prev));
      showToast(err.message || 'Failed to update name.', 'error');
    }
  };

  // Open Player Picker for Slot
  const handleOpenPickerForSlot = (slot: FormationSlot) => {
    setActiveMenuSlotCode(null);
    setPickerTargetRole('STARTER');
    setPickerTargetSlot(slot);
    setReplacingPlayer(null);
    setPoolSearch('');
    setIsPickerOpen(true);
  };

  // Open Picker for Bench
  const handleOpenPickerForBench = () => {
    setActiveMenuSlotCode(null);
    setActiveBenchMenuId(null);
    setPickerTargetRole('SUBSTITUTE');
    setPickerTargetSlot(null);
    setReplacingPlayer(null);
    setPoolSearch('');
    setIsPickerOpen(true);
  };

  // Open Swap for an occupied slot
  const handleOpenSwapForSlot = (slot: FormationSlot, currentPlayer: SquadPlayerItem) => {
    setActiveMenuSlotCode(null);
    setPickerTargetRole('STARTER');
    setPickerTargetSlot(slot);
    setReplacingPlayer(currentPlayer);
    setPoolSearch('');
    setIsPickerOpen(true);
  };

  // Assign Player from Picker
  const handleAssignPlayer = async (selectedPlayer: PlayerItem) => {
    if (!squad) return;
    const targetSlotCode = pickerTargetSlot ? pickerTargetSlot.code : null;
    const isStarter = pickerTargetRole === 'STARTER';

    const existingInSquad = players.find((p) => p.playerId === selectedPlayer.id);

    if (existingInSquad) {
      // Reassigning existing squad player
      if (isStarter && targetSlotCode) {
        const { nextPlayers } = applyMoveStarter(players, selectedPlayer.id, targetSlotCode);
        setPlayers(nextPlayers);
        setIsPickerOpen(false);

        try {
          await updateSquadPlayerApi(squadId, selectedPlayer.id, {
            role: 'STARTER',
            slotCode: targetSlotCode,
          });
          showToast(`Đã thêm ${selectedPlayer.fullName || "cầu thủ"} vào vị trí ${pickerTargetSlot?.displayRole || pickerTargetSlot?.label}`);
        } catch (err: any) {
          showToast(err.message || 'Failed to move player.', 'error');
          void fetchSquadData();
        }
      } else {
        // Move to bench
        const nextPlayers = applyStarterToBench(players, selectedPlayer.id);
        setPlayers(nextPlayers);
        setIsPickerOpen(false);

        try {
          await updateSquadPlayerApi(squadId, selectedPlayer.id, {
            role: 'SUBSTITUTE',
            slotCode: null,
          });
          showToast(`Đã chuyển ${selectedPlayer.fullName || "cầu thủ"} sang ghế dự bị.`);
        } catch (err: any) {
          showToast(err.message || 'Failed to move to bench.', 'error');
          void fetchSquadData();
        }
      }
      return;
    }

    // Adding NEW player from pool
    setIsPickerOpen(false);
    const tempId = `temp-${Date.now()}`;
    const optimisticItem: SquadPlayerItem = {
      id: tempId,
      squadId,
      playerId: selectedPlayer.id,
      role: isStarter ? 'STARTER' : 'SUBSTITUTE',
      slotCode: targetSlotCode,
      isCaptain: false,
      displayOrder: null,
      player: {
        id: selectedPlayer.id,
        name: selectedPlayer.fullName,
        shortName: selectedPlayer.fullName,
        primaryPosition: selectedPlayer.primaryPosition,
        rawPosition: selectedPlayer.rawPosition,
        imageUrl: selectedPlayer.imageUrl,
        shirtNumber: selectedPlayer.shirtNumber,
        currentTeam: selectedPlayer.currentTeam ? {
          id: selectedPlayer.currentTeam.id,
          name: selectedPlayer.currentTeam.name,
          shortName: selectedPlayer.currentTeam.shortName,
          logoUrl: selectedPlayer.currentTeam.logoUrl,
        } : null,
      },
    };

    let next = [...players];
    if (isStarter && targetSlotCode) {
      next = next.filter((p) => !(p.role === 'STARTER' && p.slotCode === targetSlotCode));
    }
    next.push(optimisticItem);
    setPlayers(next);

    try {
      await addPlayerToSquadApi(squadId, {
        playerId: selectedPlayer.id,
        role: isStarter ? 'STARTER' : 'SUBSTITUTE',
        slotCode: targetSlotCode,
      });
      showToast(`Đã thêm ${selectedPlayer.fullName || "cầu thủ"} vào đội hình.`);
      void fetchSquadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add player.', 'error');
      void fetchSquadData();
    }
  };

  // Move starter to bench
  const handleMoveStarterToBench = async (playerId: string) => {
    setActiveMenuSlotCode(null);
    const currentSubs = players.filter((p) => p.role === 'SUBSTITUTE');
    if (currentSubs.length >= 7) {
      showToast('Substitutes bench is already full (max 7 players).', 'error');
      return;
    }

    const prev = [...players];
    const nextPlayers = applyStarterToBench(players, playerId);
    setPlayers(nextPlayers);

    try {
      await updateSquadPlayerApi(squadId, playerId, { role: 'SUBSTITUTE', slotCode: null });
      showToast('Player moved to substitutes bench.');
    } catch (err: any) {
      setPlayers(prev);
      showToast(err.message || 'Failed to move player to bench.', 'error');
    }
  };

  // Promote Bench Player to Slot
  const handlePromoteBenchPlayerToSlot = (benchPlayer: SquadPlayerItem) => {
    const emptySlot = tacticalSlots.find((s) => {
      const isOccupied = players.some((p) => p.role === 'STARTER' && p.slotCode === s.code);
      if (isOccupied) return false;
      return isPlayerEligibleForSlot(benchPlayer.player, s.requiredPosition);
    });

    if (!emptySlot) {
      showToast(`No empty tactical slot available for ${benchPlayer.player?.name || 'player'}.`, 'error');
      return;
    }

    const { nextPlayers } = applyMoveStarter(players, benchPlayer.playerId, emptySlot.code);
    setPlayers(nextPlayers);
    void updateSquadPlayerApi(squadId, benchPlayer.playerId, {
      role: 'STARTER',
      slotCode: emptySlot.code,
    }).then(() => {
      showToast(`Promoted to starting XI (${emptySlot.displayRole || emptySlot.label})`);
    }).catch((err: any) => {
      showToast(err.message || 'Failed to promote player.', 'error');
      void fetchSquadData();
    });
  };

  // Captaincy
  const handleSetCaptain = async (playerId: string) => {
    setActiveMenuSlotCode(null);
    const previousSnapshot = [...players];
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        isCaptain: p.playerId === playerId,
      })),
    );

    try {
      await updateSquadPlayerApi(squadId, playerId, { isCaptain: true });
      showToast('Đã chỉ định đội trưởng mới.');
    } catch (err: any) {
      setPlayers(previousSnapshot);
      showToast(err.message || 'Failed to update captain.', 'error');
    }
  };

  // Remove Player from Squad
  const handleRemovePlayer = async (playerId: string) => {
    setActiveMenuSlotCode(null);
    setActiveBenchMenuId(null);
    const prev = [...players];
    setPlayers((p) => p.filter((item) => item.playerId !== playerId));

    try {
      await removePlayerFromSquadApi(squadId, playerId);
      showToast('Đã xóa cầu thủ khỏi đội hình.');
    } catch (err: any) {
      setPlayers(prev);
      showToast(err.message || 'Failed to remove player.', 'error');
    }
  };

  // Global Save Squad
  const handleSaveSquad = async () => {
    if (!squad) return;
    setIsSaving(true);
    try {
      await updateSquadApi(squad.id, {
        name: squad.name,
        formationCode: squad.formationCode,
        visibility: squad.visibility,
      });
      showToast('Đã lưu cấu hình đội hình thành công!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save squad.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Delete Squad
  const handleConfirmDelete = async () => {
    if (!squad) return;
    setSubmittingDelete(true);
    try {
      await deleteSquadApi(squad.id);
      showToast(`Squad "${squad.name}" has been deleted.`);
      if (onBack) onBack();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete squad.', 'error');
      setSubmittingDelete(false);
      setIsDeleteModalOpen(false);
    }
  };

  // Close menus on clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuSlotCode(null);
      setActiveBenchMenuId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Formation Slots Definition
  const currentFormationKey = (squad?.formationCode as string) || '4-4-2';
  const formationRows = FORMATION_CONFIGS[currentFormationKey] || FORMATION_CONFIGS['4-4-2'] || FORMATION_CONFIGS['4-3-3'] || [];
  const tacticalSlots = formationRows.flatMap((r) => r.slots);
  

  const substitutes = players.filter((p) => p.role === 'SUBSTITUTE');

  // Filter pool players strictly by position first, then search query
  const eligiblePoolPlayers = poolPlayers.filter((player) => {
    if (pickerTargetRole !== 'STARTER' || !pickerTargetSlot) return true;
    return isPlayerEligibleForSlot(player, pickerTargetSlot.requiredPosition);
  });  const startingXI = players.filter((p) => p.role === 'STARTER');

  return (
    <div className="scout-tactical-stage scout-squad-builder-stage">
      {/* TOAST NOTIFICATION (Fixed compact pill in top-right) */}
      {toastMessage && (
        <div className={`scout-toast ${toastType === 'error' ? 'scout-toast-error' : 'scout-toast-success'}`}>
          {toastType === 'error' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEWPORT 1: COMPLETE STARTING XI TACTICAL SCENE             */}
      {/* ============================================================ */}
      <div className="scout-tactical-scene">
        {/* COMPACT TACTICAL HUD */}
        <div className="scout-tactical-hud">
          {/* Left: Back + Title + Formation + Starters Count */}
          <div className="scout-hud-left">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="scout-hud-back-btn"
                title="Quay lại danh sách đội hình"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <span>Quay lại</span>
              </button>
            )}

            <div className="scout-hud-title-group">
              {squad && (
                isEditingName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="text"
                      value={nameInputValue}
                      onChange={(e) => setNameInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleSaveSquadName();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                      className="scout-clean-input"
                      style={{ height: '32px', fontSize: '14px', fontWeight: 700, padding: '0 10px', width: '200px' }}
                      autoFocus
                    />
                    <button type="button" onClick={handleSaveSquadName} className="scout-btn scout-btn-sm scout-btn-primary">Lưu</button>
                    <button type="button" onClick={() => setIsEditingName(false)} className="scout-btn scout-btn-sm scout-btn-secondary">Hủy</button>
                  </div>
                ) : (
                  <h1
                    className="scout-hud-title"
                    onClick={handleStartEditName}
                    title="Nhấp để đổi tên đội"
                  >
                    <span>{squad.name}</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </h1>
                )
              )}

              {squad && (
                <div className="scout-hud-subline">
                  <button
                    type="button"
                    className="scout-hud-formation-btn"
                    onClick={() => setIsFormationModalOpen(true)}
                    title="Nhấp để đổi sơ đồ chiến thuật"
                  >
                    <span>{squad.formationCode}</span>
                    <span style={{ fontSize: '9px' }}>▾</span>
                  </button>
                  <span className="scout-hud-starters-badge">
                    STARTERS {startingXI.length}/11
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Save Button + Delete Button */}
          <div className="scout-hud-right">
            <button
              type="button"
              className="scout-hud-save-btn"
              onClick={handleSaveSquad}
              disabled={isSaving}
              title="Lưu cấu hình đội hình"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{isSaving ? 'Đang lưu...' : 'SAVE SQUAD'}</span>
            </button>

            <button
              type="button"
              className="scout-hud-delete-btn"
              onClick={() => setIsDeleteModalOpen(true)}
              title="Xóa đội hình này"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* ERROR / LOADING FEEDBACK */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', padding: '12px 20px', textAlign: 'center', margin: '8px auto', maxWidth: '440px', color: '#fca5a5' }}>
            <h4 style={{ margin: '0 0 4px', color: '#f87171', fontSize: '13px' }}>{error}</h4>
            <button type="button" className="scout-btn scout-btn-secondary" style={{ padding: '3px 12px', fontSize: '11px' }} onClick={fetchSquadData}>↻ Thử lại</button>
          </div>
        )}

        {loading && !error && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: 700 }}>
            Đang tải dữ liệu chiến thuật...
          </div>
        )}

        {/* CENTERED TACTICAL PITCH WITH ILLUMINATED TURF */}
        {!loading && !error && squad && (
          <div className="scout-tactical-pitch-stage">
            <div className="scout-tactical-pitch-canvas">
              {/* Field Markings SVG */}
              <svg
                viewBox="0 0 600 800"
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              >
                {/* Outer Touchlines */}
                <rect x="20" y="20" width="560" height="760" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />

                {/* Halfway line */}
                <line x1="20" y1="400" x2="580" y2="400" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />

                {/* Center Circle & Spot */}
                <circle cx="300" cy="400" r="76" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
                <circle cx="300" cy="400" r="4.5" fill="rgba(255,255,255,0.75)" />

                {/* Corner Arcs */}
                <path d="M 20 40 A 20 20 0 0 0 40 20" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                <path d="M 560 20 A 20 20 0 0 0 580 40" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                <path d="M 20 760 A 20 20 0 0 1 40 780" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                <path d="M 560 780 A 20 20 0 0 1 580 760" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />

                {/* Opponent Goal Box (Top / Attack) */}
                <rect x="175" y="20" width="250" height="115" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
                <rect x="230" y="20" width="140" height="42" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <circle cx="300" cy="90" r="4" fill="rgba(255,255,255,0.6)" />
                <path d="M 240 135 A 65 65 0 0 0 360 135" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />

                {/* Our Goal Box (Bottom / Goalkeeper) */}
                <rect x="175" y="665" width="250" height="115" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
                <rect x="230" y="738" width="140" height="42" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <circle cx="300" cy="710" r="4" fill="rgba(255,255,255,0.6)" />
                <path d="M 240 665 A 65 65 0 0 1 360 665" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
              </svg>

              {/* 11 TACTICAL SLOTS RENDERED ON PITCH */}
              {tacticalSlots.map((slot) => {
                const assignedPlayer = findStarterForSlot(players, slot);
                const isMenuOpen = activeMenuSlotCode === slot.code;
                const cleanPos = getCleanDisplayPosition(slot.requiredPosition || slot.displayRole || slot.code);
                const posCat = getSlotCategory(slot.requiredPosition || slot.code);
                const pillColor = getPillBadgeColor(slot.requiredPosition || slot.code);
                const isLowerHalf = slot.y > 55;

                return (
                  <div
                    key={slot.code}
                    className="scout-tactical-slot"
                    style={{
                      left: `${slot.x}%`,
                      top: `${slot.y}%`,
                      zIndex: isMenuOpen ? 200 : 10,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {assignedPlayer ? (
                      <>
                        {/* OCCUPIED COMPACT FOOTBALL CARD */}
                        <div
                          className={`scout-player-card-compact ${posCat}`}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuSlotCode((prev) => (prev === slot.code ? null : slot.code));
                          }}
                          title={`Quản lý ${assignedPlayer.player?.name || 'Cầu thủ'}`}
                        >
                          {/* Position Pill Badge */}
                          <span className="scout-card-pos-badge" style={{ background: pillColor }}>
                            {cleanPos}
                          </span>

                          {/* Player Avatar */}
                          <div className="scout-card-compact-avatar-wrap">
                            {assignedPlayer.player?.imageUrl ? (
                              <img
                                src={assignedPlayer.player.imageUrl}
                                alt={assignedPlayer.player.name}
                                className="scout-card-compact-avatar"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="scout-card-compact-fallback">
                                <JerseyIcon size={18} />
                              </div>
                            )}
                            {assignedPlayer.isCaptain && (
                              <span className="scout-card-captain-badge" title="Đội trưởng">C</span>
                            )}
                          </div>

                          {/* Player Name */}
                          <div className="scout-card-compact-name" title={assignedPlayer.player?.name}>
                            {assignedPlayer.player?.shortName || assignedPlayer.player?.name || 'Player'}
                          </div>
                        </div>

                        {/* Tactical Action Menu (Glassmorphic Popover with Proper Spacing & Alignment) */}
                        {isMenuOpen && (
                          <div
                            className={`tactical-context-popover ${isLowerHalf ? 'pop-up' : 'pop-down'}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="tactical-popover-header">
                              {assignedPlayer.player?.name || 'Player'}
                            </div>
                            <button
                              type="button"
                              className="tactical-action-item"
                              onClick={() => {
                                setActiveMenuSlotCode(null);
                                handleOpenSwapForSlot(slot, assignedPlayer);
                              }}
                            >
                              <span className="tactical-action-icon">🔄</span>
                              <span>Đổi cầu thủ</span>
                            </button>
                            <button
                              type="button"
                              className="tactical-action-item"
                              onClick={() => {
                                setActiveMenuSlotCode(null);
                                void handleMoveStarterToBench(assignedPlayer.playerId);
                              }}
                            >
                              <span className="tactical-action-icon">⬇️</span>
                              <span>Cho ra ghế dự bị</span>
                            </button>
                            {!assignedPlayer.isCaptain && (
                              <button
                                type="button"
                                className="tactical-action-item"
                                onClick={() => {
                                  setActiveMenuSlotCode(null);
                                  handleSetCaptain(assignedPlayer.playerId);
                                }}
                              >
                                <span className="tactical-action-icon">⭐</span>
                                <span>Chọn làm Đội trưởng</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="tactical-action-item destructive"
                              onClick={() => {
                                setActiveMenuSlotCode(null);
                                void handleRemovePlayer(assignedPlayer.playerId);
                              }}
                            >
                              <span className="tactical-action-icon">🗑️</span>
                              <span>Bỏ khỏi đội</span>
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      // SUBTLE TACTICAL EMPTY SLOT MARKER
                      <button
                        type="button"
                        className="scout-empty-slot-marker"
                        onClick={() => handleOpenPickerForSlot(slot)}
                        title={`Chọn cầu thủ cho vị trí ${cleanPos}`}
                      >
                        <div className="scout-marker-plus">+</div>
                        <div className="scout-marker-role" style={{ color: pillColor }}>
                          {cleanPos}
                        </div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

                {/* MATCHDAY SUBSTITUTES DOCK (Slide-up drawer on hover / click) */}
        <div
          className={`scout-bench-drawer ${isBenchOpen ? 'is-open' : ''}`}
        >
          {/* Drawer Top Tab / Header */}
          <div
            className="scout-bench-drawer-tab"
            onClick={() => setIsBenchOpen((prev) => !prev)}
            title="Nhấp hoặc di chuột để mở/đóng danh sách dự bị"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px' }}>🛡️</span>
              <span style={{ fontWeight: 800 }}>DỰ BỊ / SUBSTITUTES</span>
              <span
                style={{
                  background: substitutes.length > 0 ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  color: substitutes.length > 0 ? '#60a5fa' : '#94a3b8',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {substitutes.length}/7 SLOTS
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#94a3b8' }}>
              <span>{isBenchOpen ? '▼ Thu gọn' : '▲ Di chuột hoặc nhấp để xem'}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '10px',
                }}
              >
                {isBenchOpen ? '✕' : '▲'}
              </span>
            </div>
          </div>

          {/* Drawer Body with 7 Substitutes Cards */}
          <div className="scout-bench-drawer-body">
            <div className="scout-bench-row-7">
              {Array.from({ length: 7 }).map((_, idx) => {
                const sub = substitutes[idx];
                if (sub) {
                  const posCode = getCleanDisplayPosition(sub.player?.primaryPosition || 'SUB');
                  const pillColor = getPillBadgeColor(posCode);
                  const isBenchMenuOpen = activeBenchMenuId === sub.id;

                  return (
                    <div
                      key={sub.id}
                      className="scout-bench-slot-card occupied"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBenchMenuId((prev) => (prev === sub.id ? null : sub.id));
                      }}
                    >
                      <div className="scout-card-header" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>#{idx + 1}</span>
                        <span className="scout-card-pos-badge" style={{ background: pillColor }}>
                          {posCode}
                        </span>
                      </div>

                      <div className="scout-card-compact-avatar-wrap">
                        {sub.player?.imageUrl ? (
                          <img
                            src={sub.player.imageUrl}
                            alt={sub.player.name}
                            className="scout-card-compact-avatar"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="scout-card-compact-fallback">
                            <JerseyIcon size={18} />
                          </div>
                        )}
                      </div>

                      <div className="scout-card-compact-name" title={sub.player?.name}>
                        {sub.player?.shortName || sub.player?.name || 'Player'}
                      </div>

                      {/* Bench Context Popover */}
                      {isBenchMenuOpen && (
                        <div className="tactical-context-popover" onClick={(e) => e.stopPropagation()}>
                          <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>
                            {sub.player?.name || 'Player'}
                          </div>
                          <button
                            type="button"
                            className="tactical-action-item"
                            onClick={() => {
                              setActiveBenchMenuId(null);
                              void handlePromoteBenchPlayerToSlot(sub);
                            }}
                          >
                            <span>⬆️</span>
                            <span>Lên đá chính</span>
                          </button>
                          <button
                            type="button"
                            className="tactical-action-item destructive"
                            onClick={() => {
                              setActiveBenchMenuId(null);
                              void handleRemovePlayer(sub.playerId);
                            }}
                          >
                            <span>🗑️</span>
                            <span>Bỏ khỏi đội</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={`empty-sub-${idx}`}
                    className="scout-bench-slot-card empty"
                    onClick={() => handleOpenPickerForBench()}
                    title="Thêm cầu thủ dự bị"
                  >
                    <div className="scout-marker-plus">+</div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8' }}>Click to Add</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

{/* ---------------------------------------------------- */}
      {/* MODAL 1: TACTICAL PLAYER SELECTION (CLICK-TO-ASSIGN) */}
      {/* ---------------------------------------------------- */}
      {isPickerOpen && (
        <div
          className="scout-modal-clean-overlay"
          onClick={() => setIsPickerOpen(false)}
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
                <h3 id="player-picker-title" style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  {pickerTargetRole === 'STARTER' && pickerTargetSlot ? (
                    <span>
                      Assign Player for <strong style={{ color: '#2563eb' }}>{pickerTargetSlot.displayRole || pickerTargetSlot.label}</strong>
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
                onClick={() => setIsPickerOpen(false)}
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
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: '#1e40af',
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
                  {pickerTargetSlot.displayRole || pickerTargetSlot.requiredPosition}{pickerTargetSlot.displayRole && pickerTargetSlot.displayRole !== pickerTargetSlot.requiredPosition ? ` (${pickerTargetSlot.requiredPosition})` : ''}
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
            <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {poolLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  Searching eligible players...
                </div>
              ) : eligiblePoolPlayers.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>No eligible players found</div>
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
                  const secondaryCodes = player.positions?.filter((p) => !p.isPrimary).map((p) => p.positionCode) || [];

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        {player.imageUrl ? (
                          <img
                            src={player.imageUrl}
                            alt={player.fullName}
                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                            <JerseyIcon size={18} />
                          </div>
                        )}

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {player.fullName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{player.currentTeam?.name || 'Free Agent'}</span>
                            {secondaryCodes.length > 0 && (
                              <span style={{ color: '#94a3b8' }}>• Sec: {secondaryCodes.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
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
                          onClick={() => handleAssignPlayer(player)}
                          disabled={isCurrentTargetOccupant}
                        >
                          {isCurrentTargetOccupant ? 'Current' : alreadyInSquad ? 'Move Here' : 'Select'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                className="scout-btn scout-btn-secondary"
                onClick={() => setIsPickerOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: TACTICAL FORMATION SELECTOR (34 FORMATIONS) */}
      {/* ---------------------------------------------------- */}
      {isFormationModalOpen && (
        <div
          className="scout-modal-clean-overlay"
          onClick={() => setIsFormationModalOpen(false)}
          role="presentation"
        >
          <div
            className="scout-modal-clean-dialog squad-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="formation-modal-title"
            style={{ maxWidth: '640px' }}
          >
            <div className="scout-modal-clean-header" style={{ marginBottom: '14px' }}>
              <div>
                <h3 id="formation-modal-title" style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  Switch Tactical Formation
                </h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                  Choose from 34 professional setups. Players will adapt to the new coordinate slots.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormationModalOpen(false)}
                className="scout-btn-icon scout-btn-ghost"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <FormationSelector
              value={squad?.formationCode || '4-3-3'}
              onChange={handleQuickChangeFormation}
              label="FORMATION PRESETS"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                className="scout-btn scout-btn-secondary"
                onClick={() => setIsFormationModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: DELETE SQUAD CONFIRMATION                   */}
      {/* ---------------------------------------------------- */}
      {isDeleteModalOpen && (
        <div
          className="scout-modal-overlay"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div
            className="scout-modal-dialog"
            style={{ maxWidth: '420px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '38px', marginBottom: '10px' }}>🗑️</div>
            <h3 className="scout-modal-title" style={{ marginBottom: '8px' }}>
              Delete Squad?
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '22px', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>&ldquo;{squad?.name}&rdquo;</strong>? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={submittingDelete}
                className="scout-btn scout-btn-secondary"
                style={{ minWidth: '110px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submittingDelete}
                className="scout-btn scout-btn-danger"
                style={{ minWidth: '120px' }}
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
