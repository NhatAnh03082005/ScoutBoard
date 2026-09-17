import React from 'react';
import type { Squad, SquadPlayerItem } from '../../types/squad.types';

export interface SquadHeaderProps {
  squad: Squad | null;
  startingXI: SquadPlayerItem[];
  isEditingName: boolean;
  nameInputValue: string;
  isSaving: boolean;
  onBack?: () => void;
  onSetNameInputValue: (val: string) => void;
  onStartEditName: () => void;
  onSaveSquadName: () => void;
  onCancelEditName: () => void;
  onOpenFormationModal: () => void;
  onSaveSquad: () => void;
  onOpenDeleteModal: () => void;
}

export const SquadHeader: React.FC<SquadHeaderProps> = ({
  squad,
  startingXI,
  isEditingName,
  nameInputValue,
  isSaving,
  onBack,
  onSetNameInputValue,
  onStartEditName,
  onSaveSquadName,
  onCancelEditName,
  onOpenFormationModal,
  onSaveSquad,
  onOpenDeleteModal,
}) => {
  return (
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
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Quay lại</span>
          </button>
        )}

        <div className="scout-hud-title-group">
          {squad &&
            (isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  value={nameInputValue}
                  onChange={(e) => onSetNameInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveSquadName();
                    if (e.key === 'Escape') onCancelEditName();
                  }}
                  className="scout-clean-input"
                  style={{
                    height: '32px',
                    fontSize: '14px',
                    fontWeight: 700,
                    padding: '0 10px',
                    width: '200px',
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={onSaveSquadName}
                  className="scout-btn scout-btn-sm scout-btn-primary"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={onCancelEditName}
                  className="scout-btn scout-btn-sm scout-btn-secondary"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <h1
                className="scout-hud-title"
                onClick={onStartEditName}
                title="Nhấp để đổi tên đội"
              >
                <span>{squad.name}</span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.6 }}
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </h1>
            ))}

          {squad && (
            <div className="scout-hud-subline">
              <button
                type="button"
                className="scout-hud-formation-btn"
                onClick={onOpenFormationModal}
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
          onClick={onSaveSquad}
          disabled={isSaving}
          title="Lưu cấu hình đội hình"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>{isSaving ? 'Đang lưu...' : 'SAVE SQUAD'}</span>
        </button>

        <button
          type="button"
          className="scout-hud-delete-btn"
          onClick={onOpenDeleteModal}
          title="Xóa đội hình này"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
