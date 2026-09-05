import React from 'react';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm bg-white">
    <table className={`w-full text-left border-collapse text-xs ${className}`} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <thead className={`bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider select-none ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <tbody className={`divide-y divide-slate-100 font-medium text-slate-700 ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableFooter: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <tfoot className={`bg-slate-50/60 border-t border-slate-200 font-bold text-slate-900 ${className}`} {...props}>
    {children}
  </tfoot>
);

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  clickable?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  clickable = false,
  className = '',
  ...props
}) => (
  <tr
    className={`
      transition-colors
      ${clickable ? 'hover:bg-blue-50/40 cursor-pointer' : 'hover:bg-slate-50/70'}
      ${className}
    `}
    {...props}
  >
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <th className={`py-3.5 px-4 ${className}`} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <td className={`py-3 px-4 ${className}`} {...props}>
    {children}
  </td>
);

export const TableCaption: React.FC<React.HTMLAttributes<HTMLTableCaptionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <caption className={`py-2 text-xs text-slate-500 italic ${className}`} {...props}>
    {children}
  </caption>
);
