import React, { useEffect } from 'react';
import type { SquadVisibility, FormationCode } from '../../types/squad.types';
import { ModalHeader } from './ModalHeader';
import { FormationSelector } from './FormationSelector';
import { VisibilitySelector } from './VisibilitySelector';
import { ModalFooter } from './ModalFooter';
import { AlertCircleIcon } from './ModalIcons';

export interface CreateSquadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  onNameChange: (val: string) => void;
  formation: FormationCode;
  onFormationChange: (fmt: FormationCode) => void;
  formationOptions?: FormationCode[];
  description: string;
  onDescriptionChange: (val: string) => void;
  visibility: SquadVisibility;
  onVisibilityChange: (val: SquadVisibility) => void;
  isSubmitting: boolean;
  error: string | null;
}

export const CreateSquadModal: React.FC<CreateSquadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  name,
  onNameChange,
  formation,
  onFormationChange,
  formationOptions,
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
        className="scout-modal-clean-dialog squad-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-squad-title"
      >
        <ModalHeader
          id="create-squad-title"
          title="Create New Squad"
          subtitle="Build a squad for your tactical setup and matchday preparation"
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
            <label htmlFor="squad-name-input" className="scout-field-label">
              SQUAD NAME <span className="scout-field-required">*</span>
            </label>
            <input
              id="squad-name-input"
              type="text"
              required
              maxLength={150}
              autoFocus
              disabled={isSubmitting}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Dream Team EPL 2026"
              className="scout-clean-input"
            />
          </div>

          <FormationSelector
            options={formationOptions}
            value={formation}
            onChange={onFormationChange}
            disabled={isSubmitting}
            label="TACTICAL FORMATION"
            required
          />

          <div className="scout-field-group">
            <label htmlFor="squad-desc-input" className="scout-field-label">
              TACTICAL NOTES & DESCRIPTION <span className="scout-field-optional">(OPTIONAL)</span>
            </label>
            <textarea
              id="squad-desc-input"
              rows={3}
              disabled={isSubmitting}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Notes on pressing style, attacking build, set pieces..."
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
            submitText="Create Squad"
            submittingText="Creating Squad..."
            isSubmitting={isSubmitting}
            isSubmitDisabled={!name.trim()}
          />
        </form>
      </div>
    </div>
  );
};
