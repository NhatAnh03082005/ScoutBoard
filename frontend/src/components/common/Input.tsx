import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'default' | 'compact';
  error?: boolean;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'default',
      error = false,
      disabled,
      leftAdornment,
      rightAdornment,
      className = '',
      ...props
    },
    ref
  ) => {
    const isCompact = size === 'compact';

    if (leftAdornment || rightAdornment) {
      return (
        <div className="relative flex items-center w-full">
          {leftAdornment && (
            <span className="absolute left-3 flex items-center text-slate-400 pointer-events-none">
              {leftAdornment}
            </span>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={`scout-input ${isCompact ? 'scout-input-sm' : ''} ${leftAdornment ? 'pl-9' : ''} ${rightAdornment ? 'pr-9' : ''} ${error ? 'border-red-500' : ''} ${className}`.trim()}
            {...props}
          />
          {rightAdornment && (
            <span className="absolute right-3 flex items-center text-slate-400">
              {rightAdornment}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        disabled={disabled}
        className={`scout-input ${isCompact ? 'scout-input-sm' : ''} ${error ? 'border-red-500' : ''} ${className}`.trim()}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
