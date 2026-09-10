import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'default' | 'compact';
  options?: SelectOption[];
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      size = 'default',
      options,
      children,
      error = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isCompact = size === 'compact';
    const classes = [
      'scout-select',
      isCompact ? 'scout-select-sm' : '',
      error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <select
        ref={ref}
        disabled={disabled}
        className={classes}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    );
  }
);

Select.displayName = 'Select';
