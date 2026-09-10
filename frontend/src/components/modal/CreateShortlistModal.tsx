import React, { useEffect } from 'react';
import type { ShortlistVisibility } from '../../types/shortlist.types';
import { ModalHeader } from './ModalHeader';
import { VisibilitySelector } from './VisibilitySelector';
import { ModalFooter } from './ModalFooter';
import { AlertCircleIcon } from './ModalIcons';

export interface CreateShortlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  onNameChange: (val: string) => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  visibility: ShortlistVisibility;
  onVisibilityChange: (val: ShortlistVisibility) => void;
  isSubmitting: boolean;
  error: string | null;
}

export const CreateShortlistModal: React.FC<CreateShortlistModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  visibility,
  onVisibilityChange,
  isSubmitting,
  error,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="scout-modal-clean-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="scout-modal-clean-dialog shortlist-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-shortlist-title"
      >
        <ModalHeader
          id="create-shortlist-title"
          title="Create New Shortlist"
          subtitle="Add a dedicated watchlist for scouting targets"
          onClose={onClose}
        />

        {error && (
          <div className="scout-modal-alert-error" role="alert">
            <AlertCircleIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="scout-modal-clean-form">
          <div className="scout-field-group">
            <label htmlFor="shortlist-name-input" className="scout-field-label">
              NAME <span className="scout-field-required">*</span>
            </label>
            <input
              id="shortlist-name-input"
              type="text"
              required
              maxLength={150}
              autoFocus
              disabled={isSubmitting}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. European U21 Targets"
              className="scout-clean-input"
            />
          </div>

          <div className="scout-field-group">
            <label htmlFor="shortlist-desc-input" className="scout-field-label">
              DESCRIPTION <span className="scout-field-optional">(OPTIONAL)</span>
            </label>
            <textarea
              id="shortlist-desc-input"
              rows={3}
              disabled={isSubmitting}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Add notes about this watchlist's purpose. E.g. Focus on young prospects, defensive depth, etc."
              className="scout-clean-textarea"
            />
          </div>

          <VisibilitySelector
            value={visibility}
            onChange={onVisibilityChange}
            disabled={isSubmitting}
            label="VISIBILITY"
            privateTitle="PRIVATE"
            privateDescription="Only you can view and edit."
            publicTitle="PUBLIC"
            publicDescription="Visible to all members."
          />

          <ModalFooter
            onCancel={onClose}
            submitText="Create"
            submittingText="Creating..."
            isSubmitting={isSubmitting}
            isSubmitDisabled={!name.trim()}
          />
        </form>
      </div>
    </div>
  );
};
