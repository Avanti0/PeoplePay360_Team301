import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'slate';
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  trend,
  onClick,
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 text-blue-600 border-blue-100',
      badge: 'bg-blue-100/60 text-blue-700',
    },
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      badge: 'bg-emerald-100/60 text-emerald-700',
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600 border-purple-100',
      badge: 'bg-purple-100/60 text-purple-700',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600 border-amber-100',
      badge: 'bg-amber-100/60 text-amber-700',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600 border-rose-100',
      badge: 'bg-rose-100/60 text-rose-700',
    },
    slate: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      badge: 'bg-slate-200 text-slate-700',
    },
  };

  const scheme = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {title}
          </p>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        </div>
        <div className={`p-2.5 rounded-xl border ${scheme.bg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          {trend && (
            <span
              className={`font-semibold px-1.5 py-0.5 rounded-md ${
                trend.isPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {trend.value}
            </span>
          )}
          {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
