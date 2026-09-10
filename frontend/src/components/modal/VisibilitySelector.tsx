import React from 'react';
import { LockIcon, GlobeIcon } from './ModalIcons';

export type VisibilityType = 'PRIVATE' | 'PUBLIC';

export interface VisibilitySelectorProps {
  value: VisibilityType;
  onChange: (val: VisibilityType) => void;
  disabled?: boolean;
  label?: string;
  privateTitle?: string;
  privateDescription?: string;
  publicTitle?: string;
  publicDescription?: string;
}

export const VisibilitySelector: React.FC<VisibilitySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  label = 'VISIBILITY',
  privateTitle = 'PRIVATE',
  privateDescription = 'Only you can view and edit.',
  publicTitle = 'PUBLIC',
  publicDescription = 'Visible to all members.',
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, targetValue: VisibilityType) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(targetValue);
    }
  };

  return (
    <div className="scout-field-group">
      <label className="scout-field-label">
        {label}
      </label>
      <div className="scout-visibility-grid" role="radiogroup" aria-label={label}>
        {/* PRIVATE CARD */}
        <div
          role="radio"
          aria-checked={value === 'PRIVATE'}
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && onChange('PRIVATE')}
          onKeyDown={(e) => handleKeyDown(e, 'PRIVATE')}
          className={`scout-visibility-card ${value === 'PRIVATE' ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        >
          <div className="scout-visibility-card-icon">
            <LockIcon size={18} />
          </div>
          <div className="scout-visibility-card-info">
            <span className="scout-visibility-card-title">{privateTitle}</span>
            <span className="scout-visibility-card-desc">{privateDescription}</span>
          </div>
        </div>

        {/* PUBLIC CARD */}
        <div
          role="radio"
          aria-checked={value === 'PUBLIC'}
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && onChange('PUBLIC')}
          onKeyDown={(e) => handleKeyDown(e, 'PUBLIC')}
          className={`scout-visibility-card ${value === 'PUBLIC' ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        >
          <div className="scout-visibility-card-icon">
            <GlobeIcon size={18} />
          </div>
          <div className="scout-visibility-card-info">
            <span className="scout-visibility-card-title">{publicTitle}</span>
            <span className="scout-visibility-card-desc">{publicDescription}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
