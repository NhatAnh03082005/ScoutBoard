import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'compare';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isIconOnly?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function getButtonClassName({
  variant = 'primary',
  size = 'md',
  isIconOnly = false,
  fullWidth = false,
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isIconOnly?: boolean;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  const classes: string[] = ['scout-btn'];

  if (variant === 'primary') classes.push('scout-btn-primary');
  else if (variant === 'secondary') classes.push('scout-btn-secondary');
  else if (variant === 'ghost') classes.push('scout-btn-ghost');
  else if (variant === 'destructive') classes.push('scout-btn-danger');
  else if (variant === 'compare') classes.push('scout-btn-compare');

  if (size === 'sm') classes.push('scout-btn-sm');
  else if (size === 'lg') classes.push('scout-btn-lg');

  if (isIconOnly) classes.push('scout-btn-icon');
  if (fullWidth) classes.push('w-full');
  if (className) classes.push(className);

  return classes.join(' ');
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isIconOnly = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const computedClassName = getButtonClassName({
      variant,
      size,
      isIconOnly,
      fullWidth,
      className,
    });

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={computedClassName}
        {...props}
      >
        {isLoading ? (
          <span className="scout-btn-spinner" aria-hidden="true" />
        ) : (
          leftIcon && <span className="scout-btn-icon-wrapper">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="scout-btn-icon-wrapper">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
