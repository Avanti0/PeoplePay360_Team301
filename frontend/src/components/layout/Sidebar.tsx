import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileSignature,
  CalendarDays,
  Clock,
  CalendarCheck,
  Calculator,
  Receipt,
  Layers,
  ChevronDown,
  ListTodo,
  PieChart,
  Sliders,
  X,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavChild {
  name: string;
  to: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  children?: NavChild[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const location = useLocation();
  const { hasRole, user } = useAuth();
  const isAdmin = hasRole('admin') || user?.role === 'admin';

  const isHrManager =
    hasRole('hr_manager') ||
    hasRole('hr_payroll_user') ||
    hasRole('hr_payroll_manager') ||
    hasRole('admin');

  const isPayrollUser =
    hasRole('hr_payroll_user') ||
    hasRole('hr_payroll_manager') ||
    hasRole('admin');

  // Navigation Groups matching RBAC permissions
  const navGroups: NavGroup[] = [
    {
      name: 'Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
    },
    ...(isHrManager
      ? [
          {
            name: 'People',
            icon: Users,
            children: [
              { name: 'Employees', to: '/employees', icon: Users },
              { name: 'Contracts', to: '/contracts', icon: FileSignature },
              { name: 'Working Schedules', to: '/working-schedules', icon: CalendarDays },
            ],
          },
        ]
      : []),
    {
      name: 'Attendance',
      icon: Clock,
      children: [
        { name: 'Attendance Logs', to: '/attendance', icon: Clock },
      ],
    },
    {
      name: 'Time Off',
      icon: CalendarCheck,
      children: [
        ...(isHrManager
          ? [
              { name: 'Leave Types', to: '/time-off/types', icon: Layers },
              { name: 'Allocations', to: '/time-off/allocations', icon: PieChart },
            ]
          : []),
        { name: 'Requests', to: '/time-off/requests', icon: CalendarCheck },
      ],
    },
    {
      name: 'Payroll',
      icon: Calculator,
      children: [
        ...(isPayrollUser
          ? [
              { name: 'Salary Structures', to: '/salary-structures', icon: Layers },
              { name: 'Salary Rules', to: '/salary-rules', icon: Sliders },
              { name: 'Payruns', to: '/payruns', icon: Calculator },
            ]
          : []),
        { name: 'Payslips', to: '/payslips', icon: Receipt },
      ],
    },
    ...(isAdmin
      ? [
          {
            name: 'Administration',
            icon: ShieldCheck,
            children: [
              { name: 'User Management', to: '/users', icon: ShieldCheck },
            ],
          },
        ]
      : []),
  ];

  // Track expanded groups (all expanded by default for quick access)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    People: true,
    Attendance: true,
    'Time Off': true,
    Payroll: true,
    Administration: true,
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const isChildActive = (to: string) => {
    const basePath = to.split('?')[0];
    const baseCurrent = location.pathname.split('?')[0];

    if (to.includes('?tab=')) {
      const tabParam = new URLSearchParams(to.split('?')[1]).get('tab');
      const currentParams = new URLSearchParams(location.search);
      return baseCurrent === basePath && currentParams.get('tab') === tabParam;
    }

    return baseCurrent === basePath || baseCurrent.startsWith(`${basePath}/`);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 select-none
          transform transition-transform duration-200 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/60">
          <NavLink to="/dashboard" className="flex items-center gap-3 group" onClick={onCloseMobile}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              P3
            </div>
            <div>
              <div className="flex items-center">
                <span className="font-bold text-white text-base tracking-tight">PeoplePay</span>
                <span className="text-blue-400 font-extrabold text-base tracking-tight">360</span>
              </div>
              <div className="text-[10px] text-slate-400 -mt-0.5 tracking-wider uppercase font-semibold">
                HR & Payroll
              </div>
            </div>
          </NavLink>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {navGroups.map((group) => {
            const GroupIcon = group.icon;
            const hasChildren = group.children && group.children.length > 0;
            const isExpanded = expandedGroups[group.name] !== false;

            if (!hasChildren && group.to) {
              return (
                <NavLink
                  key={group.name}
                  to={group.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`
                  }
                >
                  <GroupIcon className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110" />
                  <span className="truncate">{group.name}</span>
                </NavLink>
              );
            }

            return (
              <div key={group.name} className="space-y-1">
                {/* Group Header Button */}
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <GroupIcon className="w-4 h-4 text-slate-400" />
                    <span className="uppercase tracking-wider text-[11px] font-extrabold">{group.name}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Submenu Children */}
                {isExpanded && (
                  <div className="space-y-0.5 pl-3 border-l border-slate-800/80 ml-4 py-0.5">
                    {group.children?.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isChildActive(child.to);

                      return (
                        <NavLink
                          key={child.name}
                          to={child.to}
                          onClick={onCloseMobile}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            active
                              ? 'bg-blue-600/90 text-white shadow-xs font-bold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                          }`}
                        >
                          {ChildIcon && <ChildIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />}
                          <span className="truncate">{child.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Brand Info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="overflow-hidden">
              <p className="text-[10px] text-slate-400 font-medium truncate">PeoplePay360 Platform</p>
              <p className="text-[11px] font-bold text-slate-200 truncate">v1.0.0 &bull; Ready</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
