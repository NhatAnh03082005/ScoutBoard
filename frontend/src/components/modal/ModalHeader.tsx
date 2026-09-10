import React from 'react';
import { CloseIcon } from './ModalIcons';

export interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  id?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  onClose,
  id,
}) => {
  return (
    <div className="scout-modal-clean-header">
      <div className="scout-modal-clean-header-content">
        <h2 id={id} className="scout-modal-clean-title">
          {title}
        </h2>
        {subtitle && (
          <p className="scout-modal-clean-subtitle">
            {subtitle}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="scout-modal-clean-close-btn"
        aria-label="Close modal"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
};
