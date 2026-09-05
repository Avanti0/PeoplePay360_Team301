import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  title?: string;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'info',
  title,
  onClose,
  className = '',
}) => {
  const isSuccess = variant === 'success';
  const isError = variant === 'error';
  const isWarning = variant === 'warning';

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl shadow-lg border backdrop-blur-sm transition-all ${
        isSuccess
          ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
          : isError
          ? 'bg-rose-50/95 border-rose-200 text-rose-900'
          : isWarning
          ? 'bg-amber-50/95 border-amber-200 text-amber-900'
          : 'bg-slate-900/90 border-slate-700 text-white'
      } ${className}`}
    >
      {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
      {isError && <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />}
      {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
      {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />}

      <div className="flex-1">
        {title && <p className="text-xs font-bold uppercase tracking-wider mb-0.5">{title}</p>}
        <p className="text-xs font-medium leading-relaxed">{message}</p>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded-lg hover:bg-black/5"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
