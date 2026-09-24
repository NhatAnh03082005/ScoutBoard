import React from 'react';
import { Notification } from './Notification';

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
  const notification = (
    <Notification
      variant="error"
      message={title ? `${title}: ${message}` : message}
      actions={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="scout-btn scout-btn-sm scout-btn-secondary"
          >
            {retryText}
          </button>
        ) : undefined
      }
    />
  );

  return className ? <div className={className}>{notification}</div> : notification;
};
