import React from 'react';

export interface DeleteSquadModalProps {
  isOpen: boolean;
  squadName: string;
  submittingDelete: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export const DeleteSquadModal: React.FC<DeleteSquadModalProps> = ({
  isOpen,
  squadName,
  submittingDelete,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="scout-modal-overlay"
      onClick={onClose}
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
        <p
          style={{
            fontSize: '13.5px',
            color: '#64748b',
            marginBottom: '22px',
            lineHeight: 1.5,
          }}
        >
          Are you sure you want to delete{' '}
          <strong style={{ color: 'var(--scout-text-primary)' }}>
            &ldquo;{squadName}&rdquo;
          </strong>
          ? This action cannot be undone.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submittingDelete}
            className="scout-btn scout-btn-secondary"
            style={{ minWidth: '110px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={submittingDelete}
            className="scout-btn scout-btn-danger"
            style={{ minWidth: '120px' }}
          >
            {submittingDelete ? 'Deleting...' : 'Delete Squad'}
          </button>
        </div>
      </div>
    </div>
  );
};
