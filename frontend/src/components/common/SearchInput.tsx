import React from 'react';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'default' | 'compact';
  onClear?: () => void;
  showClearButton?: boolean;
  wrapperClassName?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      size = 'default',
      value,
      onChange,
      onClear,
      showClearButton = true,
      placeholder = 'Search...',
      disabled,
      className = '',
      wrapperClassName = '',
      ...props
    },
    ref
  ) => {
    const isCompact = size === 'compact';
    const hasValue = Boolean(value && String(value).length > 0);

    return (
      <div className={`scout-search-input-wrapper ${wrapperClassName}`.trim()}>
        <span className={`scout-search-icon ${isCompact ? 'scout-icon-sm' : ''}`.trim()} aria-hidden="true">
          <svg
            width={isCompact ? 14 : 15}
            height={isCompact ? 14 : 15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`scout-search-input ${isCompact ? 'scout-input-sm' : ''} ${className}`.trim()}
          {...props}
        />

        {showClearButton && hasValue && onClear && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="scout-search-clear-btn"
            title="Clear search"
            aria-label="Clear search"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
