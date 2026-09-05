import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Shield,
  KeyRound,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  AlertCircle,
  HelpCircle,
  X,
  UserPlus,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Login form state
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Form feedback state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user is already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors: Record<string, string> = {};
    const cleanIdentifier = usernameOrEmail.trim();

    if (!cleanIdentifier) {
      errors.usernameOrEmail = 'Username or email address is required';
    } else if (cleanIdentifier.includes('@')) {
      // Basic email validation if user entered an email address
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanIdentifier)) {
        errors.usernameOrEmail = 'Please enter a valid email address';
      }
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login(cleanIdentifier, password);
      success(`Welcome back! You have successfully signed in.`);
      navigate('/dashboard');
    } catch (err: any) {
      const errMsg =
        err.message || 'Invalid username or password. Please verify your credentials.';
      setFormError(errMsg);
      error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-2xl shadow-xl shadow-blue-500/30 mb-3">
            P3
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">PeoplePay360</h2>
          <p className="text-sm text-slate-400 mt-1">Enterprise HR, Attendance & Payroll Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sign In</h3>
              <p className="text-xs text-slate-500">Access your organization workspace</p>
            </div>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </Link>
          </div>

          {formError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSignInSubmit} className="space-y-4">
            {/* Username or Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Username or Corporate Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. admin or employee@company.com"
                  value={usernameOrEmail}
                  onChange={(e) => {
                    setUsernameOrEmail(e.target.value);
                    if (fieldErrors.usernameOrEmail) setFieldErrors({ ...fieldErrors, usernameOrEmail: '' });
                    if (formError) setFormError(null);
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                    fieldErrors.usernameOrEmail
                      ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  } text-sm font-medium text-slate-900 outline-none transition-all`}
                  required
                />
              </div>
              {fieldErrors.usernameOrEmail && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.usernameOrEmail}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                    if (formError) setFormError(null);
                  }}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border ${
                    fieldErrors.password
                      ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  } text-sm font-medium text-slate-900 outline-none transition-all`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {/* Sign In Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign Up Redirect */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account yet?{' '}
              <Link
                to="/signup"
                className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          Role-Based Access Control enforced at API & UI layers
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Password Reset Support</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Enterprise account passwords in PeoplePay360 are managed securely by your organization's administrators.
            </p>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 mb-4 space-y-1">
              <p className="font-semibold">Need to reset your credentials?</p>
              <p className="text-blue-700 text-[11px]">
                Please contact your HR Manager or System Administrator (e.g., <code>admin@peoplepay360.demo</code>) to request a secure password reset.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Got it, close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
