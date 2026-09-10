import React from 'react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div className={`scout-loading-container ${className}`.trim()}>
      <div className="scout-loading-spinner" />
      {message && <div className="scout-loading-text">{message}</div>}
    </div>
  );
};
