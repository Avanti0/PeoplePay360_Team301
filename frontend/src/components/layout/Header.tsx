import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import {
  Clock,
  LogOut,
  Bell,
} from 'lucide-react';

export const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user, role, logout } = useAuth();
  const { success } = useToast();
  const [clockedIn, setClockedIn] = useState(true);

  const handleQuickClock = async () => {
    if (clockedIn) {
      await api.attendance.create({
        employeeId: user?.employeeId || '2',
        checkIn: new Date(Date.now() - 8 * 3600000).toISOString(),
        checkOut: new Date().toISOString(),
        status: 'present',
      });
      setClockedIn(false);
      success(`Checked out successfully at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } else {
      await api.attendance.create({
        employeeId: user?.employeeId || '2',
        checkIn: new Date().toISOString(),
        status: 'present',
      });
      setClockedIn(true);
      success(`Checked in successfully at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between z-20">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">
          {title || 'HR & Payroll Central'}
        </h1>
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
