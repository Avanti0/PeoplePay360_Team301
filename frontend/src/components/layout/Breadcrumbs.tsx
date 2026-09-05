import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  contracts: 'Contracts',
  'working-schedules': 'Working Schedules',
  attendance: 'Attendance',
  'time-off': 'Time Off',
  types: 'Leave Types',
  allocations: 'Allocations',
  requests: 'Leave Requests',
  'salary-structures': 'Salary Structures',
  'salary-rules': 'Salary Rules',
  payruns: 'Payruns',
  payslips: 'Payslips',
};

export const Breadcrumbs: React.FC<{ className?: string }> = ({ className = '' }) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'dashboard')) {
    return null;
  }

  return (
    <nav className={`flex items-center gap-1.5 text-xs text-slate-400 font-medium select-none ${className}`}>
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-slate-700 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = ROUTE_LABELS[value] || (value.startsWith('EMP-') || !isNaN(Number(value)) ? `#${value}` : value.replace(/_/g, ' '));

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 capitalize truncate max-w-[150px]">
                {label}
              </span>
            ) : (
              <Link to={to} className="hover:text-slate-700 transition-colors capitalize truncate max-w-[120px]">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
