import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { EmployeeDashboardData, User } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Clock,
  CalendarCheck,
  AlertTriangle,
  CalendarDays,
  DollarSign,
  CheckCircle2,
  Receipt,
  FileText,
  Download,
  ArrowRight,
  Sparkles,
  Building2,
  Briefcase,
  CreditCard,
  Info,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Activity,
  PlusCircle,
  RefreshCw,
  XCircle,
  Calendar,
} from 'lucide-react';

interface EmployeeDashboardViewProps {
  currentUser: User | null;
}

type TabType =
  | 'attendance'
  | 'timeoff'
  | 'warnings'
  | 'schedule'
  | 'salary';

export const EmployeeDashboardView: React.FC<EmployeeDashboardViewProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [data, setData] = useState<EmployeeDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPunching, setIsPunching] = useState<boolean>(false);

  useEffect(() => {
    loadPersonalDashboard();
  }, [currentUser]);

  const loadPersonalDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await api.dashboard.getEmployeeDashboard();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load employee dashboard', err);
      error(err.message || 'Failed to load personal dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPunch = async () => {
    setIsPunching(true);
    try {
      await api.attendance.create({
        status: 'present',
        note: 'Quick punch from personal dashboard',
      });
      success('Attendance punch recorded successfully!');
      await loadPersonalDashboard();
    } catch (err: any) {
      error(err.message || 'Failed to record attendance punch');
    } finally {
      setIsPunching(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '—';
    if (timeStr.includes('T')) {
      return new Date(timeStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return timeStr.substring(0, 5);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading your personal employee portal...</p>
        </div>
      </div>
    );
  }

  const attendance = data?.attendanceHealth;
  const leaves = data?.approvedLeaves || [];
  const allocations = data?.leaveAllocations || [];
  const warnings = data?.warnings || [];
  const schedule = data?.schedule;
  const salary = data?.salary;
  const employeeProfile = data?.employee;

  return (
    <div className="space-y-6">
      {/* Personalized Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-400/30">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                Employee Self-Service Portal
              </span>
              {employeeProfile?.employmentStatus && (
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  {employeeProfile.employmentStatus}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Welcome, {employeeProfile?.name || currentUser?.employeeName || currentUser?.username}
            </h1>
            <p className="text-purple-200/80 text-xs md:text-sm max-w-2xl flex flex-wrap items-center gap-x-3 gap-y-1">
              {employeeProfile?.jobPosition && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-purple-300" />
                  {employeeProfile.jobPosition}
                </span>
              )}
              {employeeProfile?.department && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-purple-300" />
                  {employeeProfile.department}
                </span>
              )}
              <span className="text-purple-300/60">•</span>
              <span className="text-purple-200/90 font-mono text-[11px]">
                {employeeProfile?.email || currentUser?.email || 'Authenticated User'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRecordPunch}
              disabled={isPunching}
              className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              <span>{isPunching ? 'Recording...' : 'Record Attendance Punch'}</span>
            </button>
            <button
              onClick={loadPersonalDashboard}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all"
              title="Refresh personal data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Decorative circle */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Top 5 Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div
          onClick={() => setActiveTab('attendance')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-purple-50/80 border-purple-300 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Attendance
            </span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">
            {attendance?.attendanceHealthPercentage || 100}%
          </p>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
            {attendance?.presentDays || 0} Present / {attendance?.totalRecords || 0} Logs
          </p>
        </div>

        <div
          onClick={() => setActiveTab('timeoff')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'timeoff'
              ? 'bg-amber-50/80 border-amber-300 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Approved Leave
            </span>
            <CalendarCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">
            {data?.totalApprovedLeaveDays || 0} Days
          </p>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
            {leaves.length} Approved Requests
          </p>
        </div>

        <div
          onClick={() => setActiveTab('warnings')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'warnings'
              ? 'bg-rose-50/80 border-rose-300 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Warnings / Alerts
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">{warnings.length}</p>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
            {warnings.filter((w) => w.status === 'pending').length} Pending Action
          </p>
        </div>

        <div
          onClick={() => setActiveTab('schedule')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-blue-50/80 border-blue-300 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Weekly Shift
            </span>
            <CalendarDays className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">
            {schedule?.totalWeeklyHours || 40} hrs
          </p>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
            {schedule?.weeklyWorkingDays || 5} Working Days
          </p>
        </div>

        <div
          onClick={() => setActiveTab('salary')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'salary'
              ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Latest Net Pay
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-600 mt-2 truncate">
            {formatCurrency(salary?.latestNetSalary || 0)}
          </p>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
            {salary?.totalPayoutsCount || 0} Processed Payslips
          </p>
        </div>
      </div>

      {/* Tabs Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'attendance'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>1. Attendance Health</span>
          </button>

          <button
            onClick={() => setActiveTab('timeoff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'timeoff'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>2. Approved Time Off</span>
            {leaves.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'timeoff' ? 'bg-purple-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {leaves.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('warnings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'warnings'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>3. Complaints & Warnings</span>
            {warnings.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'warnings' ? 'bg-purple-800 text-white' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {warnings.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'schedule'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>4. Shifts / Working Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('salary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'salary'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>5. Net Salary</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ATTENDANCE HEALTH */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Health Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Health Index
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {attendance?.attendanceHealthPercentage || 100}%
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                {attendance?.attendanceHealthPercentage && attendance.attendanceHealthPercentage >= 90
                  ? 'Excellent punctuality rating'
                  : 'Regular attendance recorded'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Present Days
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {attendance?.presentDays || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Full shift compliance</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Hours Logged
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-600 mt-2">
                {attendance?.totalHoursWorked || 0} hrs
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Calculated worked time</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Late / Exceptions
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">
                {attendance?.lateDays || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Check-in delays flagged</p>
            </div>
          </div>

          {/* Personal Attendance Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Your Recent Attendance Logs</h3>
                <p className="text-xs text-slate-500">Personal clock-in and clock-out timestamps</p>
              </div>
              <button
                onClick={() => navigate('/attendance')}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                <span>Full Attendance View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5">Check In</th>
                    <th className="py-3 px-5">Check Out</th>
                    <th className="py-3 px-5">Worked Hours</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Shift Compliance</th>
                    <th className="py-3 px-5">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {data?.recentAttendance && data.recentAttendance.length > 0 ? (
                    data.recentAttendance.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-800">
                          {formatDate(log.checkIn || (log as any).createdAt)}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-700">
                          {formatTime(log.checkIn)}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-700">
                          {log.checkOut ? formatTime(log.checkOut) : (
                            <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                              Active Shift
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 font-bold text-slate-900">
                          {log.workedHours !== null && log.workedHours !== undefined
                            ? `${log.workedHours} hrs`
                            : '—'}
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              log.status === 'present'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.status === 'late'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          {log.expectedWorkingDay === false ? (
                            <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-semibold">
                              Weekend / Off Day Shift
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-medium">Scheduled Workday</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 max-w-xs truncate">
                          {log.note || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No personal attendance records found yet. Click "Record Attendance Punch" to check in!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPROVED TIME OFF */}
      {activeTab === 'timeoff' && (
        <div className="space-y-6">
          {/* Leave Entitlement Allocations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Your Leave Balances & Allocations</h3>
                <p className="text-xs text-slate-500">Approved allocations and remaining quota</p>
              </div>
              <button
                onClick={() => navigate('/time-off')}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Apply for Leave</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {allocations.length > 0 ? (
                allocations.map((alloc) => {
                  const percentTaken = alloc.allocatedDays
                    ? Math.round((alloc.takenDays / alloc.allocatedDays) * 100)
                    : 0;
                  return (
                    <div
                      key={alloc.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">
                          {alloc.timeOffTypeName}
                        </span>
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                          {alloc.remainingDays} {alloc.unit} left
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(percentTaken, 100)}%` }}
                          className="bg-purple-600 h-full rounded-full transition-all"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Allocated: {alloc.allocatedDays} {alloc.unit}</span>
                        <span>Taken: {alloc.takenDays} {alloc.unit}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 bg-white rounded-2xl border border-slate-200/80 p-6 text-center text-slate-400">
                  No explicit leave allocations mapped. Standard annual leave policies apply.
                </div>
              )}
            </div>
          </div>

          {/* Approved Time Off Records Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Your Approved Leave Records</h3>
                <p className="text-xs text-slate-500">
                  Showing ONLY time-off requests with <strong className="text-emerald-700 font-semibold">Approved</strong> status
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                {leaves.length} Approved Requests
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <th className="py-3 px-5">Leave Type</th>
                    <th className="py-3 px-5">Date Range</th>
                    <th className="py-3 px-5">Duration</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Reason / Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {leaves.length > 0 ? (
                    leaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-900">
                          {leave.timeOffTypeName}
                        </td>
                        <td className="py-3.5 px-5 text-slate-700">
                          {formatDate(leave.dateFrom)} &rarr; {formatDate(leave.dateTo)}
                        </td>
                        <td className="py-3.5 px-5 font-bold text-purple-700">
                          {leave.duration} {leave.duration === 1 ? 'Day' : 'Days'}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-600 max-w-sm">
                          {leave.reason || 'Personal Leave'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No approved time off requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPLAINTS & WARNINGS */}
      {activeTab === 'warnings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Personal Complaints & Compliance Notices</h3>
                  <p className="text-xs text-slate-500">
                    Disciplinary, pre-payroll verification, and profile compliance items for your account
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full ${
                  warnings.length === 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {warnings.length} Active Items
              </span>
            </div>
          </div>

          {warnings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warnings.map((w) => (
                <div
                  key={w.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    w.severity === 'critical'
                      ? 'bg-rose-50/50 border-rose-200'
                      : w.severity === 'warning'
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          w.severity === 'critical'
                            ? 'text-rose-600'
                            : w.severity === 'warning'
                            ? 'text-amber-600'
                            : 'text-slate-600'
                        }`}
                      />
                      <h4 className="text-xs font-black text-slate-900">{w.title}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        w.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 mt-2.5 leading-relaxed">{w.message}</p>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Source: {w.source}</span>
                    <span>{formatDate(w.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900">Good Standing — No Warnings or Complaints</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your employee profile, attendance logs, and pre-payroll records are fully compliant with zero disciplinary flags.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SHIFTS / WORKING SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Schedule Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {schedule?.scheduleName || 'Standard Working Hours'}
                </h3>
                <p className="text-xs text-slate-500">
                  Assigned working schedule & shift hours policy
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                {schedule?.totalWeeklyHours || 40} Weekly Hours
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                {schedule?.weeklyWorkingDays || 5} Workdays / Week
              </div>
            </div>
          </div>

          {/* 7-Day Shift Grid */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Weekly Shift Pattern</h3>
              <p className="text-xs text-slate-500">Day-by-day expected shift timing and break allocations</p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {schedule?.lines && schedule.lines.length > 0 ? (
                schedule.lines.map((line) => (
                  <div
                    key={line.dayOfWeek}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      line.isWorkingDay ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <span className="font-bold text-slate-900 text-xs">{line.dayName}</span>
                      {line.isWorkingDay ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          Working Day
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase">
                          Weekly Off
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-slate-600">
                      {line.isWorkingDay ? (
                        <>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Shift Timing
                            </span>
                            <span className="font-mono font-semibold text-slate-800">
                              {formatTime(line.startTime)} &rarr; {formatTime(line.endTime)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Break
                            </span>
                            <span className="font-semibold text-slate-800">
                              {line.breakMinutes} mins
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Net Expected Hours
                            </span>
                            <span className="font-bold text-purple-700">
                              {line.dailyHours} hrs
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No shift scheduled</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">
                  Standard 40 hours (Mon-Fri 09:00 - 18:00) applies.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: NET SALARY */}
      {activeTab === 'salary' && (
        <div className="space-y-6">
          {/* Salary Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Latest Net Payout
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {formatCurrency(salary?.latestNetSalary || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Take-home salary</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Gross Earnings
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {formatCurrency(salary?.latestGrossSalary || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Pre-deduction wage</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Deductions
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-600 mt-2">
                {formatCurrency(salary?.latestDeductions || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">PF, Tax & statutory cuts</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Disbursement Account
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <p className="text-sm font-black text-slate-900 mt-2 truncate">
                {salary?.bankName || 'Direct Credit'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                {salary?.bankAccountMasked || '••••8821'}
              </p>
            </div>
          </div>

          {/* Latest Payslip Breakdown & History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Latest Payslip Lines */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Latest Salary Breakdown</h3>
                  <p className="text-xs text-slate-500">Structure line items</p>
                </div>
                <FileText className="w-5 h-5 text-purple-600" />
              </div>

              <div className="space-y-2.5 pt-2">
                {salary?.latestPayslipLines && salary.latestPayslipLines.length > 0 ? (
                  salary.latestPayslipLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 block">{line.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{line.code}</span>
                      </div>
                      <span
                        className={`font-bold ${
                          line.category === 'deduction' ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {line.category === 'deduction' ? '-' : '+'}
                        {formatCurrency(line.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No individual line breakdown available for this pay cycle.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Payslips Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Your Payslip History</h3>
                  <p className="text-xs text-slate-500">View and download your monthly salary slips</p>
                </div>
                <button
                  onClick={() => navigate('/payslips')}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                >
                  <span>All Payslips</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <th className="py-3 px-5">Pay Period</th>
                      <th className="py-3 px-5">Gross</th>
                      <th className="py-3 px-5">Deductions</th>
                      <th className="py-3 px-5">Net Take-Home</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Slip PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {salary?.monthlyTrend && salary.monthlyTrend.length > 0 ? (
                      salary.monthlyTrend.map((slip) => (
                        <tr key={slip.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-5 font-bold text-slate-900">
                            {formatDate(slip.periodStart)} &rarr; {formatDate(slip.periodEnd)}
                          </td>
                          <td className="py-3.5 px-5 text-slate-700">
                            {formatCurrency(slip.grossSalary)}
                          </td>
                          <td className="py-3.5 px-5 text-rose-600">
                            -{formatCurrency(slip.deductions)}
                          </td>
                          <td className="py-3.5 px-5 font-black text-emerald-600">
                            {formatCurrency(slip.netSalary)}
                          </td>
                          <td className="py-3.5 px-5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                slip.status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {slip.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => navigate(`/payslips/${slip.id}`)}
                              className="px-2.5 py-1.5 rounded-lg border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              <span>View Slip</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No payslips issued yet for your account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
