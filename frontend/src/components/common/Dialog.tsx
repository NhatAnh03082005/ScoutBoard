import React, { useEffect, useRef } from 'react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  className?: string;
  ariaLabelledBy?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '580px',
  className = '',
  ariaLabelledBy = 'dialog-title',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="scout-modal-clean-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={`scout-modal-clean-dialog ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        style={{ maxWidth }}
      >
        <div className="scout-modal-clean-header">
          <div className="scout-modal-clean-header-content">
            <h2 id={ariaLabelledBy} className="scout-modal-clean-title">
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
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="scout-modal-clean-body">
          {children}
        </div>

        {footer && (
          <div className="scout-modal-clean-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
