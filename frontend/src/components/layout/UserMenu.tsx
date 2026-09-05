import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  LogOut,
  Shield,
  ChevronDown,
} from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { success } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
