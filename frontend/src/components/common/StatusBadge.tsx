import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const normalized = status ? status.toLowerCase().replace('-', '_') : 'unknown';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  switch (normalized) {
    // Contract / General active states
    case 'active':
    case 'running':
    case 'approved':
    case 'paid':
    case 'present':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotColor = 'bg-emerald-500';
      break;

    // Draft / Pending states
    case 'draft':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      dotColor = 'bg-amber-400';
      break;

    // Processed / intermediate states
    case 'computed':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      dotColor = 'bg-blue-500';
      break;

    case 'validated':
    case 'confirmed':
    case 'submitted':
      colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      dotColor = 'bg-indigo-500';
      break;

    case 'late':
    case 'half_day':
      colorClasses = 'bg-orange-50 text-orange-700 border-orange-200';
      dotColor = 'bg-orange-500';
      break;

    case 'overtime':
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
      dotColor = 'bg-purple-500';
      break;

    // Inactive / Refused / Terminated states
    case 'refused':
    case 'cancelled':
    case 'terminated':
    case 'absent':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      dotColor = 'bg-rose-500';
      break;

    case 'expired':
    case 'inactive':
    case 'on_leave':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-300';
      dotColor = 'bg-slate-400';
      break;
  }

  const formatText = (text: string) => {
    return text.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${colorClasses} ${
        isSmall ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {formatText(status)}
    </span>
  );
};
