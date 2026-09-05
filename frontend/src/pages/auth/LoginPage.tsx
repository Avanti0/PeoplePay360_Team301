import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { demoUsers } from '../../services/mockData';
import { RoleName } from '../../types';
import {
  Shield,
  KeyRound,
  UserCheck,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  WifiOff,
  Lock,
  User as UserIcon,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, switchUserRole } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  // Form State
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation & Error States
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [authError, setAuthError] = useState<{
    type: 'invalid_credentials' | 'api_error' | null;
    message: string;
  }>({ type: null, message: '' });

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      errors.username = 'Username or email is required';
    } else if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError({ type: null, message: '' });

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      success(`Welcome back, ${username.trim()}!`);
      navigate('/dashboard');
    } catch (err: any) {
      const isNetworkError =
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('500') ||
        err?.message?.includes('502') ||
        err?.message?.includes('503');

      if (isNetworkError) {
        setAuthError({
          type: 'api_error',
          message: 'Unable to connect to authentication server. Please check your network or try again.',
        });
      } else {
        setAuthError({
          type: 'invalid_credentials',
          message: 'Invalid username or password. Please verify your credentials and try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (role: RoleName) => {
    setAuthError({ type: null, message: '' });
    setValidationErrors({});
    switchUserRole(role);
    success(`Signed in as ${role.replace(/_/g, ' ').toUpperCase()}`);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-2xl shadow-xl shadow-blue-500/30 mb-4 transform hover:scale-105 transition-transform">
            P3
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            PeoplePay<span className="text-blue-400">360</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Next-Gen HR, Attendance & Multi-Rule Payroll Suite
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
          <div className="mb-6">
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Sign In</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your corporate credentials to access your workspace
            </p>
          </div>

          {/* Invalid Credentials Banner */}
          {authError.type === 'invalid_credentials' && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-rose-800">Authentication Failed</p>
                <p className="text-[11px] text-rose-600 mt-0.5 leading-relaxed">
                  {authError.message}
                </p>
              </div>
            </div>
          )}

          {/* API Server / Network Error Banner */}
          {authError.type === 'api_error' && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 animate-in fade-in duration-200">
              <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-900">API Connection Error</p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  {authError.message}
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="mt-2 text-[11px] font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 underline underline-offset-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Connection</span>
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username / Email Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Username or Corporate Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  disabled={isSubmitting}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (validationErrors.username) {
                      setValidationErrors((prev) => ({ ...prev, username: undefined }));
                    }
                  }}
                  placeholder="admin or emp code..."
                  className={`
                    w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium text-slate-900 bg-slate-50 border outline-none transition-all
                    ${
                      validationErrors.username || authError.type === 'invalid_credentials'
                        ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
                        : 'border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                />
              </div>
              {validationErrors.username && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{validationErrors.username}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Min. 4 characters</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.password) {
                      setValidationErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="Enter password..."
                  className={`
                    w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium text-slate-900 bg-slate-50 border outline-none transition-all
                    ${
                      validationErrors.password || authError.type === 'invalid_credentials'
                        ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
                        : 'border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{validationErrors.password}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating Session...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In to PeoplePay360</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Persona Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Quick Login by Demo Persona</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Live Demo
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoUsers.map((u) => {
                let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                if (u.role === 'admin') badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                if (u.role === 'hr_payroll_manager') badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                if (u.role === 'hr_payroll_user') badgeClass = 'bg-cyan-50 text-cyan-700 border-cyan-200';
                if (u.role === 'hr_manager') badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (u.role === 'employee') badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <button
                    key={u.role}
                    type="button"
                    onClick={() => handleQuickLogin(u.role)}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-600 font-bold text-[11px] transition-colors">
                        {(u.employeeName || u.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {u.employeeName || u.username}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          @{u.username}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${badgeClass}`}>
                      {u.role.replace(/_/g, ' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Security / RBAC Notice */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>JWT Access Token held in memory &bull; httpOnly Refresh Token</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            Role-Based Access Control enforced at both API & UI layers
          </p>
        </div>
      </div>
    </div>
  );
};
