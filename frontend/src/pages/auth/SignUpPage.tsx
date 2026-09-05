import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import {
  Shield,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  Mail,
  AlertCircle,
  UserPlus,
  LogIn,
  CheckCircle2,
} from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form Feedback
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors: Record<string, string> = {};
    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanFullName) {
      errors.fullName = 'Full Name is required';
    }

    if (!cleanEmail) {
      errors.email = 'Email address is required';
    } else if (!validateEmail(cleanEmail)) {
      errors.email = 'Please enter a valid email address (e.g. name@company.com)';
    }

    if (!cleanUsername) {
      errors.username = 'Username is required';
    } else if (cleanUsername.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
      errors.username = 'Username can only contain letters, numbers, dots, dashes, and underscores';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      // 1. Call Backend Registration Endpoint
      await api.auth.register({
        fullName: cleanFullName,
        email: cleanEmail,
        username: cleanUsername,
        password,
        role: 'employee',
      });

      // 2. Automatically log the user in
      await login(cleanUsername, password);
      success(`Welcome to PeoplePay360, ${cleanFullName || cleanUsername}!`);
      navigate('/dashboard');
    } catch (err: any) {
      const errMsg =
        err.message ||
        'Registration failed. Username or email may already be in use.';
      setFormError(errMsg);
      error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full my-8">
        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-2xl shadow-xl shadow-blue-500/30 mb-3">
            P3
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">PeoplePay360</h2>
          <p className="text-sm text-slate-400 mt-1">Create your Employee Account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sign Up</h3>
              <p className="text-xs text-slate-500">Employee Portal Registration</p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In instead</span>
            </Link>
          </div>

          {formError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: '' });
                    if (formError) setFormError(null);
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                    fieldErrors.fullName
                      ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  } text-sm font-medium text-slate-900 outline-none transition-all`}
                  required
                />
              </div>
              {fieldErrors.fullName && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Corporate or Personal Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="e.g. john.doe@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                    if (formError) setFormError(null);
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                    fieldErrors.email
                      ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  } text-sm font-medium text-slate-900 outline-none transition-all`}
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Username <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. jdoe or john.doe"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: '' });
                    if (formError) setFormError(null);
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                    fieldErrors.username
                      ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  } text-sm font-medium text-slate-900 outline-none transition-all`}
                  required
                />
              </div>
              {fieldErrors.username && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.username}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Password (Min 6 Characters) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter strong password"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                    if (formError) setFormError(null);
                  }}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border ${
                    fieldErrors.confirmPassword
                      ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  } text-sm font-medium text-slate-900 outline-none transition-all`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Account Role Notice */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                New registrations are created as standard <strong>Employee</strong> accounts with self-service attendance, leave, and payslip access.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account & Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer toggle */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
              >
                Sign In
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
    </div>
  );
};

export default SignUpPage;
