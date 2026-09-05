import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Retry',
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-rose-200 bg-rose-50/40 ${className}`}
    >
      <div className="p-3 rounded-2xl bg-rose-100/80 text-rose-600 mb-3">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h3 className="text-sm font-bold text-rose-900">{title}</h3>
      <p className="text-xs text-rose-700 max-w-md mt-1 mb-4 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={RefreshCw}
          className="bg-white border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400"
        >
          {retryText}
        </Button>
      )}
    </div>
  );
};
