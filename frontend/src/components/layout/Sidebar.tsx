import React from 'react';
import { NavLink } from 'react-router-dom';
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
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleName } from '../../types';

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole: RoleName;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { hasRole, role } = useAuth();

  const navItems: NavItem[] = [
    {
      name: 'Payroll Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
      minRole: 'employee',
    },
    {
      name: 'Employees',
      to: '/employees',
      icon: Users,
      minRole: 'hr_manager',
    },
    {
      name: 'Contracts',
      to: '/contracts',
      icon: FileSignature,
      minRole: 'hr_manager',
    },
    {
      name: 'Working Schedules',
      to: '/working-schedules',
      icon: CalendarDays,
      minRole: 'hr_manager',
    },
    {
      name: 'Attendance',
      to: '/attendance',
      icon: Clock,
      minRole: 'employee',
    },
    {
      name: 'Time Off',
      to: '/time-off',
      icon: CalendarCheck,
      minRole: 'employee',
    },
    {
      name: 'Salary Structures',
      to: '/salary-structures',
      icon: Layers,
      minRole: 'hr_payroll_user',
    },
    {
      name: 'Payrun Processing',
      to: '/payruns',
      icon: Calculator,
      minRole: 'hr_payroll_user',
    },
    {
      name: 'Payslips',
      to: '/payslips',
      icon: Receipt,
      minRole: 'employee',
    },
  ];

  const visibleItems = navItems.filter((item) => hasRole(item.minRole));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
          P3
        </div>
        <div>
          <span className="font-bold text-white text-base tracking-tight">PeoplePay</span>
          <span className="text-blue-400 font-extrabold text-base tracking-tight">360</span>
          <div className="text-[10px] text-slate-400 -mt-0.5 tracking-wider uppercase font-medium">
            HR & Payroll Engine
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Core Operations
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* RBAC Badge Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="overflow-hidden">
            <p className="text-[11px] text-slate-400 font-medium truncate">Role Authorization</p>
            <p className="text-xs font-semibold text-emerald-300 truncate capitalize">
              {role.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
