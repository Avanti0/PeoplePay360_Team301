import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  DashboardKPIs,
  DepartmentSalaryCost,
  MonthlySalaryTrend,
  DashboardAlert,
} from '../../types';
import { KpiCard } from '../../components/common/KpiCard';
import { useAuth } from '../../context/AuthContext';
import { EmployeeDashboardView } from './EmployeeDashboardView';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  CalendarCheck,
  CheckCircle,
  AlertTriangle,
  Users,
  PlusCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [deptCosts, setDeptCosts] = useState<DepartmentSalaryCost[]>([]);
  const [salaryTrend, setSalaryTrend] = useState<MonthlySalaryTrend[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isManagement =
    hasRole('hr_manager') ||
    hasRole('hr_payroll_user') ||
    hasRole('hr_payroll_manager') ||
    hasRole('admin') ||
    (user && user.role !== 'employee');

  // If user is a standard employee, render the dedicated Employee Dashboard directly
  if (!isManagement) {
    return <EmployeeDashboardView currentUser={user} />;
  }

  useEffect(() => {
    if (isManagement) {
      loadDashboardData();
    }
  }, [user, isManagement]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [kpiRes, deptRes, trendRes, alertRes] = await Promise.all([
        api.dashboard.getKpis(),
        api.dashboard.getSalaryByDept(),
        api.dashboard.getSalaryTrend(),
        api.dashboard.getAlerts(),
      ]);
      setKpis(kpiRes);
      setDeptCosts(deptRes);
      setSalaryTrend(trendRes);
      setAlerts(alertRes);
    } catch (err) {
      console.error('Failed loading dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const maxDeptCost = Math.max(...deptCosts.map((d) => d.cost), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading payroll intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Payroll & HR Core
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.employeeName || user?.username || 'Administrator'}
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Real-time monitoring across organization headcount, monthly compensation payouts,
              working schedule fulfillment, and pre-payroll compliance alerts.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/payruns')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Process Payrun</span>
            </button>
            <button
              onClick={() => navigate('/employees')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/10 backdrop-blur-sm transition-all cursor-pointer"
            >
              <span>Employee Directory</span>
            </button>
          </div>
        </div>
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          title="Total Paid Payroll"
          value={formatCurrency(kpis?.totalNetSalaryPaid || 0)}
          subtitle="Cumulated net disbursed"
          icon={DollarSign}
          color="blue"
          trend={{ value: '+4.2%', isPositive: true }}
        />
        <KpiCard
          title="Generated Payslips"
          value={kpis?.payslipsGenerated || 0}
          subtitle="All historical records"
          icon={Receipt}
          color="emerald"
        />
        <KpiCard
          title="Attendance Health"
          value={`${kpis?.attendanceHealthPercentage || 100}%`}
          subtitle="Regular on-time logs"
          icon={CalendarCheck}
          color="purple"
          trend={{ value: '+1.5%', isPositive: true }}
        />
        <KpiCard
          title="Active Headcount"
          value={kpis?.activeEmployeesCount || 0}
          subtitle="Full-time active contracts"
          icon={Users}
          color="amber"
        />
      </div>

      {/* Secondary Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Pending Leave Approvals
            </p>
            <p className="text-xl font-bold text-slate-900">
              {kpis?.pendingLeaveRequestsCount || 0}
            </p>
            <p className="text-[11px] text-slate-400">Awaiting management action</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Average Net Salary
            </p>
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(kpis?.averageSalary || 0)}
            </p>
            <p className="text-[11px] text-slate-400">Monthly payout index</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Compliance & Warnings
            </p>
            <p className="text-xl font-bold text-slate-900">{alerts.length}</p>
            <p className="text-[11px] text-rose-600 font-medium">Requires action before next payrun</p>
          </div>
        </div>
      </div>

      {/* Salary Cost by Department */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Cost by Department</h3>
            <p className="text-xs text-slate-500">Live allocation across units</p>
          </div>
          <button
            onClick={() => navigate('/employees')}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <span>View Department Hierarchy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-4 mt-4">
          {deptCosts.map((dept) => {
            const percent = Math.round((dept.cost / maxDeptCost) * 100);
            return (
              <div key={dept.department} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-800">{dept.department}</span>
                  <span className="text-slate-900 font-bold">{formatCurrency(dept.cost)}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${percent}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{dept.employeeCount} active members</span>
                  <span>{percent}% of peak</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compliance & Payroll Warnings Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Pre-Payroll Validation Alerts</h3>
              <p className="text-xs text-slate-500">
                Live checks for missing bank accounts, contract validity, and attendance exceptions
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            {alerts.length} Issues Identified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{alert.employeeName}</span>
                  <span className="text-[10px] font-semibold uppercase bg-white border border-amber-200 text-amber-800 px-2 py-0.5 rounded">
                    {alert.warningType.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={() => navigate('/employees')}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                  >
                    Resolve in Employee Profile &rarr;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
