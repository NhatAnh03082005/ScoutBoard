import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'control' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'lg',
  interactive = false,
  className = '',
  children,
  ...props
}) => {
  const variantClass =
    variant === 'elevated'
      ? 'scout-card-elevated'
      : variant === 'control'
      ? 'scout-card-control'
      : variant === 'flat'
      ? 'scout-card-flat'
      : '';

  const paddingClass =
    padding === 'none'
      ? 'scout-card-p-none'
      : padding === 'sm'
      ? 'scout-card-p-sm'
      : padding === 'md'
      ? 'scout-card-p-md'
      : 'scout-card-p-lg';

  const interactiveClass = interactive ? 'scout-card-interactive' : '';

  const combinedClasses = [
    'scout-card',
    variantClass,
    paddingClass,
    interactiveClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={combinedClasses} {...props}>
      {children}
    </div>
  );
};

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  withDivider?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  withDivider = false,
  className = '',
  children,
  ...props
}) => {
  const classes = [
    'scout-card-header',
    withDivider ? 'with-divider' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  variant?: 'primary' | 'dark';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'div';
  className?: string;
  children?: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  variant = 'primary',
  as: Component = 'h3',
  className = '',
  children,
  ...props
}) => {
  const variantClass = variant === 'dark' ? 'scout-card-title-dark' : '';
  const classes = ['scout-card-title', variantClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
};

export interface CardSubtitleProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
  children?: React.ReactNode;
}

export const CardSubtitle: React.FC<CardSubtitleProps> = ({
  className = '',
  children,
  ...props
}) => {
  const classes = ['scout-card-subtitle', className].filter(Boolean).join(' ');
  return (
    <p className={classes} {...props}>
      {children}
    </p>
  );
};

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({
  className = '',
  children,
  ...props
}) => {
  const classes = ['scout-card-content', className].filter(Boolean).join(' ');
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  className = '',
  children,
  ...props
}) => {
  const classes = ['scout-card-footer', className].filter(Boolean).join(' ');
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};
