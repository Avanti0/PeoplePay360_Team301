import React, { forwardRef } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  fullWidth?: boolean;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      icon: Icon,
      fullWidth = true,
      placeholder,
      children,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`${fullWidth ? 'w-full' : ''} space-y-1.5`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold text-slate-700 select-none"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
              <Icon className="w-4 h-4" />
            </div>
          )}

          <select
            ref={ref}
            id={selectId}
            className={`
              w-full text-xs font-medium text-slate-900 rounded-xl border appearance-none transition-all outline-none cursor-pointer
              ${Icon ? 'pl-9' : 'pl-3.5'}
              pr-9 py-2.5
              ${
                error
                  ? 'border-rose-300 bg-rose-50/30 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                  : 'border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-400'
              }
              disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3 text-slate-400 pointer-events-none flex items-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {error && <p className="text-[11px] font-semibold text-rose-600 mt-1">{error}</p>}
        {!error && helperText && (
          <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
