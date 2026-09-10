import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({
  wrapperClassName = '',
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`scout-table-wrapper ${wrapperClassName}`.trim()}>
      <table className={`scout-table ${className}`.trim()} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => <thead className={className} {...props}>{children}</thead>;

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => <tbody className={className} {...props}>{children}</tbody>;

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className = '',
  children,
  ...props
}) => <tr className={className} {...props}>{children}</tr>;

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
}

export const TableHead: React.FC<TableHeadProps> = ({
  align = 'left',
  className = '',
  children,
  ...props
}) => {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : '';
  return (
    <th className={`${alignClass} ${className}`.trim()} {...props}>
      {children}
    </th>
  );
};

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
}

export const TableCell: React.FC<TableCellProps> = ({
  align = 'left',
  className = '',
  children,
  ...props
}) => {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : '';
  return (
    <td className={`${alignClass} ${className}`.trim()} {...props}>
      {children}
    </td>
  );
};
