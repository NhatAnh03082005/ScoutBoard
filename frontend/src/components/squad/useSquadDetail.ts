import { useState, useEffect, useCallback } from 'react';
import {
  getSquadByIdApi,
  getPlayersInSquadApi,
  addPlayerToSquadApi,
  updateSquadPlayerApi,
  removePlayerFromSquadApi,
  updateSquadApi,
  deleteSquadApi,
} from '../../services/squad.service';
import type {
  Squad,
  SquadPlayerItem,
  FormationCode,
} from '../../types/squad.types';
import type { PlayerItem } from '../../types/player.types';
import {
  FORMATION_CONFIGS,
  applyMoveStarter,
  applyStarterToBench,
  isPlayerEligibleForSlot,
  type FormationSlot,
} from '../../utils/squad-placement.utils';

export interface UseSquadDetailResult {
  squad: Squad | null;
  players: SquadPlayerItem[];
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error';
  showToast: (message: string, type?: 'success' | 'error') => void;
  fetchSquadData: () => Promise<void>;

  // Inline rename state
  isEditingName: boolean;
  setIsEditingName: (editing: boolean) => void;
  nameInputValue: string;
  setNameInputValue: (name: string) => void;
  handleStartEditName: () => void;
  handleSaveSquadName: () => Promise<void>;

  // Tactical operations
  handleQuickChangeFormation: (newFormation: FormationCode) => Promise<void>;
  handleAssignPlayer: (
    selectedPlayer: PlayerItem,
    pickerTargetSlot: FormationSlot | null,
    pickerTargetRole: 'STARTER' | 'SUBSTITUTE',
  ) => Promise<void>;
  handleMoveStarterToBench: (playerId: string) => Promise<void>;
  handlePromoteBenchPlayerToSlot: (benchPlayer: SquadPlayerItem) => void;
  handleSetCaptain: (playerId: string) => Promise<void>;
  handleRemovePlayer: (playerId: string) => Promise<void>;
  handleSaveSquad: () => Promise<void>;
  handleConfirmDelete: () => Promise<boolean>;

  // Derived layout lists
  tacticalSlots: FormationSlot[];
  startingXI: SquadPlayerItem[];
  substitutes: SquadPlayerItem[];
}

export function useSquadDetail(squadId: string): UseSquadDetailResult {
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

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const fetchSquadData = useCallback(async () => {
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
  }, [squadId]);

  useEffect(() => {
    void fetchSquadData();
  }, [fetchSquadData]);

  // Quick Change Formation
  const handleQuickChangeFormation = async (newFormation: FormationCode) => {
    if (!squad || squad.formationCode === newFormation) {
      return;
    }
    const previousFormation = squad.formationCode;
    setSquad((prev) => (prev ? { ...prev, formationCode: newFormation } : prev));

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

  // Formation Slots Definition
  const currentFormationKey = (squad?.formationCode as string) || '4-4-2';
  const formationRows =
    FORMATION_CONFIGS[currentFormationKey] ||
    FORMATION_CONFIGS['4-4-2'] ||
    FORMATION_CONFIGS['4-3-3'] ||
    [];
  const tacticalSlots = formationRows.flatMap((r) => r.slots);

  const startingXI = players.filter((p) => p.role === 'STARTER');
  const substitutes = players.filter((p) => p.role === 'SUBSTITUTE');

  // Assign Player from Picker
  const handleAssignPlayer = async (
    selectedPlayer: PlayerItem,
    pickerTargetSlot: FormationSlot | null,
    pickerTargetRole: 'STARTER' | 'SUBSTITUTE',
  ) => {
    if (!squad) return;
    const targetSlotCode = pickerTargetSlot ? pickerTargetSlot.code : null;
    const isStarter = pickerTargetRole === 'STARTER';

    const existingInSquad = players.find((p) => p.playerId === selectedPlayer.id);

    if (existingInSquad) {
      // Reassigning existing squad player
      if (isStarter && targetSlotCode) {
        const { nextPlayers } = applyMoveStarter(players, selectedPlayer.id, targetSlotCode);
        setPlayers(nextPlayers);

        try {
          await updateSquadPlayerApi(squadId, selectedPlayer.id, {
            role: 'STARTER',
            slotCode: targetSlotCode,
          });
          showToast(
            `Đã thêm ${selectedPlayer.fullName || 'cầu thủ'} vào vị trí ${
              pickerTargetSlot?.displayRole || pickerTargetSlot?.label
            }`,
          );
        } catch (err: any) {
          showToast(err.message || 'Failed to move player.', 'error');
          void fetchSquadData();
        }
      } else {
        // Move to bench
        const nextPlayers = applyStarterToBench(players, selectedPlayer.id);
        setPlayers(nextPlayers);

        try {
          await updateSquadPlayerApi(squadId, selectedPlayer.id, {
            role: 'SUBSTITUTE',
            slotCode: null,
          });
          showToast(`Đã chuyển ${selectedPlayer.fullName || 'cầu thủ'} sang ghế dự bị.`);
        } catch (err: any) {
          showToast(err.message || 'Failed to move to bench.', 'error');
          void fetchSquadData();
        }
      }
      return;
    }

    // Adding NEW player from pool
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
        currentTeam: selectedPlayer.currentTeam
          ? {
              id: selectedPlayer.currentTeam.id,
              name: selectedPlayer.currentTeam.name,
              shortName: selectedPlayer.currentTeam.shortName,
              logoUrl: selectedPlayer.currentTeam.logoUrl,
            }
          : null,
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
      showToast(`Đã thêm ${selectedPlayer.fullName || 'cầu thủ'} vào đội hình.`);
      void fetchSquadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add player.', 'error');
      void fetchSquadData();
    }
  };

  // Move starter to bench
  const handleMoveStarterToBench = async (playerId: string) => {
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
      showToast(
        `No empty tactical slot available for ${benchPlayer.player?.name || 'player'}.`,
        'error',
      );
      return;
    }

    const { nextPlayers } = applyMoveStarter(players, benchPlayer.playerId, emptySlot.code);
    setPlayers(nextPlayers);
    void updateSquadPlayerApi(squadId, benchPlayer.playerId, {
      role: 'STARTER',
      slotCode: emptySlot.code,
    })
      .then(() => {
        showToast(`Promoted to starting XI (${emptySlot.displayRole || emptySlot.label})`);
      })
      .catch((err: any) => {
        showToast(err.message || 'Failed to promote player.', 'error');
        void fetchSquadData();
      });
  };

  // Captaincy
  const handleSetCaptain = async (playerId: string) => {
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
  const handleConfirmDelete = async (): Promise<boolean> => {
    if (!squad) return false;
    try {
      await deleteSquadApi(squad.id);
      showToast(`Squad "${squad.name}" has been deleted.`);
      return true;
    } catch (err: any) {
      showToast(err.message || 'Failed to delete squad.', 'error');
      return false;
    }
  };

  return {
    squad,
    players,
    loading,
    error,
    isSaving,
    toastMessage,
    toastType,
    showToast,
    fetchSquadData,
    isEditingName,
    setIsEditingName,
    nameInputValue,
    setNameInputValue,
    handleStartEditName,
    handleSaveSquadName,
    handleQuickChangeFormation,
    handleAssignPlayer,
    handleMoveStarterToBench,
    handlePromoteBenchPlayerToSlot,
    handleSetCaptain,
    handleRemovePlayer,
    handleSaveSquad,
    handleConfirmDelete,
    tacticalSlots,
    startingXI,
    substitutes,
  };
}
