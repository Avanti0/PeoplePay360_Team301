import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleName } from '../../types';
import {
  ShieldAlert,
  ArrowLeft,
  LayoutDashboard,
  UserCheck,
  Lock,
  ChevronRight,
} from 'lucide-react';

interface UnauthorizedPageProps {
  requiredRole?: RoleName | RoleName[];
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({ requiredRole }) => {
  const { user, role, switchUserRole } = useAuth();
  const navigate = useNavigate();

  const roleLabels: Record<RoleName, string> = {
    employee: 'Employee',
    hr_manager: 'HR Manager',
    hr_payroll_user: 'HR Payroll User',
    hr_payroll_manager: 'HR Payroll Manager',
    admin: 'System Administrator',
  };

  const allowedRolesDisplay = Array.isArray(requiredRole)
    ? requiredRole.map((r) => roleLabels[r] || r).join(', ')
    : requiredRole
    ? roleLabels[requiredRole] || requiredRole
    : 'Elevated Corporate Permissions';

  const availableRoles: { id: RoleName; label: string; desc: string }[] = [
    { id: 'admin', label: 'Admin', desc: 'Full unrestricted access to all modules' },
    { id: 'hr_payroll_manager', label: 'HR Payroll Manager', desc: 'Payroll, structures, and payrun authority' },
    { id: 'hr_manager', label: 'HR Manager', desc: 'Employee, contract, and leave management' },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 select-none font-sans">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-2xl text-center relative overflow-hidden">
        {/* Top Gradient Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600" />

        {/* 403 Icon */}
        <div className="w-20 h-20 bg-rose-50 border-8 border-rose-100/60 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-600 shadow-sm animate-bounce">
          <ShieldAlert className="w-10 h-10" />
        </div>

        {/* Title */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black uppercase tracking-widest mb-3">
          <Lock className="w-3 h-3" />
          HTTP 403 &bull; Access Forbidden
        </span>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          Restricted Resource
        </h1>

        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
          Your current active role (<strong className="text-slate-800 uppercase">{role.replace(/_/g, ' ')}</strong>) does not have sufficient RBAC clearance to view or perform operations on this route.
        </p>

        {/* Role Comparison Box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left mb-6 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Your Role:</span>
            <span className="font-bold text-slate-800 uppercase bg-slate-200/80 px-2 py-0.5 rounded-md">
              {roleLabels[role] || role}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Required Clearance:</span>
            <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
              {allowedRolesDisplay}
            </span>
          </div>
        </div>

        {/* Quick Switch Persona for Demo / Evaluation */}
        <div className="mb-6 text-left">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Switch to an Authorized Persona:
          </p>
          <div className="space-y-1.5">
            {availableRoles.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  switchUserRole(r.id);
                  navigate('/dashboard');
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{r.label}</p>
                    <p className="text-[10px] text-slate-400">{r.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
