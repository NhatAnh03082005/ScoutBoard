import React from 'react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  retryText = 'Try Again',
  className = '',
}) => {
  return (
    <div className={`scout-error-banner ${className}`.trim()} role="alert">
      <span className="scout-error-banner-icon">⚠️</span>
      <div className="scout-error-banner-body">
        {title && <div className="scout-error-banner-title">{title}</div>}
        <div>{message}</div>
      </div>
      {onRetry && (
        <div className="scout-error-banner-actions">
          <button
            type="button"
            onClick={onRetry}
            className="scout-btn scout-btn-sm scout-btn-secondary"
          >
            {retryText}
          </button>
        </div>
      )}
    </div>
  );
};
