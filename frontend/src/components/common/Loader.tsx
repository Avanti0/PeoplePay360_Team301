import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'slate';
  text?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  color = 'primary',
  text,
  className = '',
}) => {
  const sizeMap = {
    xs: 'w-3.5 h-3.5 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-3',
    lg: 'w-10 h-10 border-4',
  }[size];

  const colorMap = {
    primary: 'border-blue-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    slate: 'border-slate-500 border-t-transparent',
  }[color];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className={`rounded-full animate-spin ${sizeMap} ${colorMap}`} />
      {text && <span className="text-xs font-semibold text-slate-500 animate-pulse">{text}</span>}
    </div>
  );
};
