import React, { useState, useEffect } from 'react';
import type { SquadPlayerItem } from '../types/squad.types';
import type { PlayerItem } from '../types/player.types';
import type { FormationSlot } from '../utils/squad-placement.utils';
import { Notification } from '../components/common';
import { FormationSelector } from '../components/modal/FormationSelector';
import {
  useSquadDetail,
  SquadHeader,
  SquadPitch,
  SquadBench,
  PlayerAssignmentModal,
  DeleteSquadModal,
} from '../components/squad';

export interface SquadDetailPageProps {
  squadId: string;
  onBack?: () => void;
  onNavigateToLogin?: () => void;
  isAuthenticated?: boolean;
}

export const SquadDetailPage: React.FC<SquadDetailPageProps> = ({
  squadId,
  onBack,
  onNavigateToLogin,
  isAuthenticated,
}) => {
  const {
    squad,
    players,
    loading,
    error,
    isSaving,
    toastMessage,
    toastType,
    dismissToast,
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
  } = useSquadDetail(squadId);

  // Formation Selector Modal State
  const [isFormationModalOpen, setIsFormationModalOpen] = useState<boolean>(false);

  // Tactical Player Picker Modal State (Click-to-Assign)
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerTargetSlot, setPickerTargetSlot] = useState<FormationSlot | null>(null);
  const [pickerTargetRole, setPickerTargetRole] = useState<'STARTER' | 'SUBSTITUTE'>('STARTER');
  const [replacingPlayer, setReplacingPlayer] = useState<SquadPlayerItem | null>(null);

  // Context Popovers
  const [activeMenuSlotCode, setActiveMenuSlotCode] = useState<string | null>(null);
  const [activeBenchMenuId, setActiveBenchMenuId] = useState<string | null>(null);

  // Matchday Substitutes Drawer State
  const [isBenchOpen, setIsBenchOpen] = useState<boolean>(false);

  // Delete Squad Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [submittingDelete, setSubmittingDelete] = useState<boolean>(false);

  // Close menus on clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuSlotCode(null);
      setActiveBenchMenuId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenPickerForSlot = (slot: FormationSlot) => {
    setActiveMenuSlotCode(null);
    setPickerTargetRole('STARTER');
    setPickerTargetSlot(slot);
    setReplacingPlayer(null);
    setIsPickerOpen(true);
  };

  const handleOpenPickerForBench = () => {
    setActiveMenuSlotCode(null);
    setActiveBenchMenuId(null);
    setPickerTargetRole('SUBSTITUTE');
    setPickerTargetSlot(null);
    setReplacingPlayer(null);
    setIsPickerOpen(true);
  };

  const handleOpenSwapForSlot = (slot: FormationSlot, currentPlayer: SquadPlayerItem) => {
    setActiveMenuSlotCode(null);
    setPickerTargetRole('STARTER');
    setPickerTargetSlot(slot);
    setReplacingPlayer(currentPlayer);
    setIsPickerOpen(true);
  };

  const onAssignPlayerFromModal = (player: PlayerItem) => {
    setIsPickerOpen(false);
    void handleAssignPlayer(player, pickerTargetSlot, pickerTargetRole);
  };

  const onConfirmDeleteSquad = async () => {
    setSubmittingDelete(true);
    const success = await handleConfirmDelete();
    setSubmittingDelete(false);
    setIsDeleteModalOpen(false);
    if (success && onBack) {
      onBack();
    }
  };

  const isUnauthorized = error === 'UNAUTHORIZED' || isAuthenticated === false;

  return (
    <div className="scout-tactical-stage scout-squad-builder-stage">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <Notification
          variant={toastType}
          mode="toast"
          message={toastMessage}
          onDismiss={dismissToast}
          autoDismissMs={3500}
        />
      )}

      {/* VIEWPORT 1: COMPLETE STARTING XI TACTICAL SCENE */}
      <div className="scout-tactical-scene">
        {/* COMPACT TACTICAL HUD */}
        <SquadHeader
          squad={squad}
          startingXI={startingXI}
          isEditingName={isEditingName}
          nameInputValue={nameInputValue}
          isSaving={isSaving}
          onBack={onBack}
          onSetNameInputValue={setNameInputValue}
          onStartEditName={handleStartEditName}
          onSaveSquadName={handleSaveSquadName}
          onCancelEditName={() => setIsEditingName(false)}
          onOpenFormationModal={() => setIsFormationModalOpen(true)}
          onSaveSquad={handleSaveSquad}
          onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
        />

        {/* ERROR / LOADING FEEDBACK */}
        {(error || isUnauthorized) && (
          <Notification
            variant="error"
            message={
              isUnauthorized
                ? 'Your session has expired. Please sign in again.'
                : error
            }
            compact
            style={{ margin: '8px auto', maxWidth: '440px' }}
            actions={isUnauthorized && !onNavigateToLogin ? undefined : (
              <button
                type="button"
                className="scout-btn scout-btn-secondary"
                onClick={isUnauthorized ? onNavigateToLogin : fetchSquadData}
              >
                {isUnauthorized ? 'Sign In' : 'Try Again'}
              </button>
            )}
          />
        )}

        {loading && !error && !isUnauthorized && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            Loading tactical squad...
          </div>
        )}

        {/* CENTERED TACTICAL PITCH WITH ILLUMINATED TURF */}
        {!loading && !error && !isUnauthorized && squad && (
          <SquadPitch
            tacticalSlots={tacticalSlots}
            players={players}
            activeMenuSlotCode={activeMenuSlotCode}
            onToggleMenuSlot={(code) => setActiveMenuSlotCode(code)}
            onOpenPickerForSlot={handleOpenPickerForSlot}
            onOpenSwapForSlot={handleOpenSwapForSlot}
            onMoveStarterToBench={(id) => void handleMoveStarterToBench(id)}
            onSetCaptain={(id) => void handleSetCaptain(id)}
            onRemovePlayer={(id) => void handleRemovePlayer(id)}
          />
        )}

        {/* MATCHDAY SUBSTITUTES DOCK */}
        {!loading && !error && !isUnauthorized && squad && (
          <SquadBench
            substitutes={substitutes}
            isBenchOpen={isBenchOpen}
            onToggleBenchOpen={() => setIsBenchOpen((prev) => !prev)}
            activeBenchMenuId={activeBenchMenuId}
            onToggleBenchMenu={(id) => setActiveBenchMenuId(id)}
            onOpenPickerForBench={handleOpenPickerForBench}
            onPromoteBenchPlayerToSlot={handlePromoteBenchPlayerToSlot}
            onRemovePlayer={(id) => void handleRemovePlayer(id)}
          />
        )}
      </div>

      {/* MODAL 1: TACTICAL PLAYER SELECTION */}
      <PlayerAssignmentModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        pickerTargetRole={pickerTargetRole}
        pickerTargetSlot={pickerTargetSlot}
        replacingPlayer={replacingPlayer}
        players={players}
        onAssignPlayer={onAssignPlayerFromModal}
      />

      {/* MODAL 2: TACTICAL FORMATION SELECTOR */}
      {isFormationModalOpen && (
        <div
          className="scout-modal-clean-overlay"
          onClick={() => setIsFormationModalOpen(false)}
          role="presentation"
        >
          <div
            className="scout-modal-clean-dialog squad-dialog scout-squad-formation-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="formation-modal-title"
            style={{ maxWidth: '640px' }}
          >
            <div className="scout-modal-clean-header" style={{ marginBottom: '14px' }}>
              <div>
                <h3
                  id="formation-modal-title"
                  style={{
                    margin: '0 0 4px',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--scout-text-primary)',
                  }}
                >
                  Switch Tactical Formation
                </h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                  Choose from 34 professional setups. Players will adapt to the new coordinate
                  slots.
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
              onChange={(code) => void handleQuickChangeFormation(code)}
              label="FORMATION PRESETS"
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
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

      {/* MODAL 3: DELETE SQUAD CONFIRMATION */}
      <DeleteSquadModal
        isOpen={isDeleteModalOpen}
        squadName={squad?.name || ''}
        submittingDelete={submittingDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={() => void onConfirmDeleteSquad()}
      />
    </div>
  );
};
