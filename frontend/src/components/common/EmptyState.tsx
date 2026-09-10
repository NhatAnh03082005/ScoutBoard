import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '⚽',
  title,
  description,
  action,
  compact = false,
  className = '',
}) => {
  return (
    <div className={`scout-empty-state ${compact ? 'compact' : ''} ${className}`.trim()}>
      {icon && <div className="scout-empty-state-icon">{icon}</div>}
      <h3 className="scout-empty-state-title">{title}</h3>
      {description && <p className="scout-empty-state-desc">{description}</p>}
      {action && <div className="scout-empty-state-actions">{action}</div>}
    </div>
  );
};
