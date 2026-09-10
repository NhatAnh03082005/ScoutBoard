import React from 'react';

export interface ModalFooterProps {
  onCancel: () => void;
  submitText?: string;
  submittingText?: string;
  isSubmitting?: boolean;
  isSubmitDisabled?: boolean;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  onCancel,
  submitText = 'Create',
  submittingText = 'Creating...',
  isSubmitting = false,
  isSubmitDisabled = false,
  cancelText = 'Cancel',
  variant = 'primary',
  className = '',
}) => {
  const submitClass = variant === 'danger'
    ? 'scout-btn scout-btn-md scout-btn-danger'
    : 'scout-btn scout-btn-md scout-btn-primary';

  return (
    <div className={`scout-modal-clean-footer ${className}`.trim()}>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="scout-btn scout-btn-md scout-btn-secondary"
      >
        {cancelText}
      </button>
      <button
        type="submit"
        disabled={isSubmitting || isSubmitDisabled}
        className={submitClass}
      >
        {isSubmitting ? submittingText : submitText}
      </button>
    </div>
  );
};
