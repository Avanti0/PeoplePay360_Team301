import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { RoleName } from '../../types';
import {
  LogOut,
  Shield,
  ChevronDown,
  UserCheck,
  Check,
} from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { user, role, switchUserRole, logout } = useAuth();
  const { success } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowRoleSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    success('Logged out successfully');
  };

  const displayName = user?.employeeName || user?.username || 'User';
  const displayRole = role ? role.replace(/_/g, ' ') : 'Employee';
  const initial = displayName.charAt(0).toUpperCase();

  const rolesList: { id: RoleName; label: string; emp: string }[] = [
    { id: 'admin', label: 'Admin', emp: 'System Admin (EMP-009)' },
    { id: 'hr_payroll_manager', label: 'HR Payroll Manager', emp: 'Vikram Rao (EMP-004)' },
    { id: 'hr_payroll_user', label: 'HR Payroll User', emp: 'Sneha Deshmukh (EMP-005)' },
    { id: 'hr_manager', label: 'HR Manager', emp: 'Ananya Iyer (EMP-001)' },
    { id: 'employee', label: 'Employee', emp: 'Rahul Sharma (EMP-002)' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-2xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 text-left group"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
          {initial}
        </div>

        <div className="hidden md:block">
          <p className="text-xs font-bold text-slate-800 truncate leading-tight group-hover:text-blue-600 transition-colors">
            {displayName}
          </p>
          <p className="text-[10px] text-slate-400 capitalize leading-tight">
            {displayRole}
          </p>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header info */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
            <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email || 'user@peoplepay360.demo'}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 uppercase">
                <Shield className="w-2.5 h-2.5" />
                {displayRole}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center justify-between transition-colors font-medium"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-500" />
                <span>Switch Persona / Role</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showRoleSelector ? 'rotate-180' : ''}`} />
            </button>

            {showRoleSelector && (
              <div className="bg-slate-50 border-y border-slate-100 py-1 px-1 my-1">
                {rolesList.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      switchUserRole(r.id);
                      setShowRoleSelector(false);
                      setIsOpen(false);
                      success(`Switched to persona: ${r.label}`);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs rounded-lg flex items-center justify-between transition-colors ${
                      role === r.id ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-200/60'
                    }`}
                  >
                    <div>
                      <p className="text-[11px] leading-tight">{r.label}</p>
                      <p className={`text-[9px] leading-tight ${role === r.id ? 'text-blue-100' : 'text-slate-400'}`}>{r.emp}</p>
                    </div>
                    {role === r.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="pt-1 border-t border-slate-100 mt-1">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors font-semibold"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
