import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  size = 'md',
  fullPage = false,
}) => {
  const spinnerSizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size];

  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div
        className={`rounded-full border-blue-600 border-t-transparent animate-spin ${spinnerSizes}`}
      />
      {message && <p className="text-xs font-semibold text-slate-500 animate-pulse">{message}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return <div className="w-full flex items-center justify-center min-h-[220px]">{content}</div>;
};
