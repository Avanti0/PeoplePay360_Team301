import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { RoleName } from '../../types';
import {
  Clock,
  UserCheck,
  ChevronDown,
  LogOut,
  Bell,
  Sparkles,
} from 'lucide-react';

export const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user, role, switchUserRole, logout } = useAuth();
  const { success } = useToast();
  const [clockedIn, setClockedIn] = useState(true);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const handleQuickClock = async () => {
    if (clockedIn) {
      await api.attendance.create({
        employeeId: user?.employeeId || 2,
        checkIn: new Date(Date.now() - 8 * 3600000).toISOString(),
        checkOut: new Date().toISOString(),
        status: 'present',
      });
      setClockedIn(false);
      success(`Checked out successfully at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } else {
      await api.attendance.create({
        employeeId: user?.employeeId || 2,
        checkIn: new Date().toISOString(),
        status: 'present',
      });
      setClockedIn(true);
      success(`Checked in successfully at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }
  };

  const rolesList: { id: RoleName; label: string; emp: string }[] = [
    { id: 'admin', label: 'Admin', emp: 'System Admin (EMP-009)' },
    { id: 'hr_payroll_manager', label: 'HR Payroll Manager', emp: 'Vikram Rao (EMP-004)' },
    { id: 'hr_payroll_user', label: 'HR Payroll User', emp: 'Sneha Deshmukh (EMP-005)' },
    { id: 'hr_manager', label: 'HR Manager', emp: 'Ananya Iyer (EMP-001)' },
    { id: 'employee', label: 'Employee', emp: 'Rahul Sharma (EMP-002)' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between z-20">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">
          {title || 'HR & Payroll Central'}
        </h1>
        <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200/60">
          <Sparkles className="w-3 h-3" /> Live Demo Mode
        </span>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Check In/Out */}
        <button
          onClick={handleQuickClock}
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            clockedIn
              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
          }`}
          title="Quickly record check-in or check-out"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{clockedIn ? 'Punch Out' : 'Punch In'}</span>
        </button>

        {/* Interactive Role Switcher for Hackathon Demo */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline text-slate-500">Role:</span>
            <span className="font-bold text-slate-900 capitalize">{role.replace(/_/g, ' ')}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">Switch Demo Persona</p>
                <p className="text-[11px] text-slate-500">Test role-specific RBAC views & actions</p>
              </div>
              <div className="py-1">
                {rolesList.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      switchUserRole(r.id);
                      setIsRoleMenuOpen(false);
                      success(`Switched persona to ${r.label}`);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs flex flex-col transition-colors ${
                      role === r.id ? 'bg-blue-50/80 text-blue-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-medium text-slate-900">{r.label}</span>
                    <span className="text-[10px] text-slate-500">{r.emp}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
        </button>

        {/* User Avatar & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {user?.employeeName ? user.employeeName.charAt(0) : 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-900 truncate leading-tight">
              {user?.employeeName || user?.username || 'User'}
            </p>
            <p className="text-[10px] text-slate-500 capitalize leading-tight">
              {role.replace(/_/g, ' ')}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
