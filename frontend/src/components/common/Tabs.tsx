import React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pills';
  fullWidth?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab,
  onChange,
  variant = 'underline',
  fullWidth = false,
  className = '',
  ariaLabel = 'Navigation Tabs',
}) => {
  const isPills = variant === 'pills';
  const containerClass = isPills
    ? `scout-tabs-segmented ${fullWidth ? 'w-full flex' : ''} ${className}`.trim()
    : `scout-tabs-list ${fullWidth ? 'w-full' : ''} ${className}`.trim();

  const buttonBaseClass = isPills ? 'scout-tab-segmented-btn' : 'scout-tab-btn';

  return (
    <div role="tablist" aria-label={ariaLabel} className={containerClass}>
      {items.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            disabled={tab.disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`${buttonBaseClass} ${isActive ? 'active' : ''} ${fullWidth ? 'flex-1' : ''}`.trim()}
          >
            {tab.icon && <span className="scout-tab-icon">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span className="scout-tab-badge">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};
