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
  const maxTrendGross = Math.max(...salaryTrend.map((t) => t.gross), 1);

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
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-300 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-400/30 mb-3">
              Operational Overview
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.employeeName || 'Operations Lead'}
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Payruns are aligned with resolved employee contracts and active salary rule sequences.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasRole('hr_payroll_user') && (
              <button
                onClick={() => navigate('/payruns')}
                className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Run Payroll Wizard</span>
              </button>
            )}
            {hasRole('hr_manager') && (
              <button
                onClick={() => navigate('/employees')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all"
              >
                Manage Staff
              </button>
            )}
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          title="Total Net Salary Paid"
          value={formatCurrency(kpis?.totalNetSalaryPaid || 0)}
          subtitle="Latest closed payrun (Aug 2026)"
          icon={DollarSign}
          color="emerald"
          trend={{ value: '+4.2%', isPositive: true }}
          onClick={() => navigate('/payruns')}
        />
        <KpiCard
          title="Active Headcount"
          value={kpis?.activeEmployeesCount || 0}
          subtitle="Permanent & Contract roles"
          icon={Users}
          color="blue"
          onClick={() => navigate('/employees')}
        />
        <KpiCard
          title="Attendance Health"
          value={`${kpis?.attendanceHealthPercentage || 92}%`}
          subtitle="Punctual check-ins recorded"
          icon={CheckCircle}
          color="purple"
          trend={{ value: '+1.5%', isPositive: true }}
          onClick={() => navigate('/attendance')}
        />
        <KpiCard
          title="Approved Time Off"
          value={`${kpis?.approvedTimeOffDays || 0} Days`}
          subtitle={`${kpis?.pendingLeaveRequestsCount || 0} requests awaiting review`}
          icon={CalendarCheck}
          color="amber"
          onClick={() => navigate('/time-off')}
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Payslips Generated
            </p>
            <p className="text-xl font-bold text-slate-900">{kpis?.payslipsGenerated || 0}</p>
            <p className="text-[11px] text-slate-400">All periods combined</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Avg Employee Net Salary
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

      {/* Analytics & Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Net Salary Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Salary Trend & Payouts</h3>
              <p className="text-xs text-slate-500">Gross vs Net monthly distribution</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Last 5 Months
            </span>
          </div>

          {/* SVG Bar / Trend Chart */}
          <div className="space-y-4">
            <div className="h-56 flex items-end gap-6 pt-4 px-2 border-b border-slate-100">
              {salaryTrend.map((item) => {
                const grossHeightPercent = Math.round((item.gross / maxTrendGross) * 100);
                const netHeightPercent = Math.round((item.net / maxTrendGross) * 100);

                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-full">
                      {/* Gross Bar */}
                      <div
                        style={{ height: `${grossHeightPercent}%` }}
                        className="w-1/2 max-w-[28px] bg-blue-200 hover:bg-blue-300 rounded-t-lg transition-all relative group/bar"
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          Gross: {formatCurrency(item.gross)}
                        </div>
                      </div>
                      {/* Net Bar */}
                      <div
                        style={{ height: `${netHeightPercent}%` }}
                        className="w-1/2 max-w-[28px] bg-blue-600 hover:bg-blue-700 rounded-t-lg transition-all relative group/bar"
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          Net: {formatCurrency(item.net)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 mt-2 truncate max-w-[70px]">
                      {item.month.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-2 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-blue-200" />
                <span>Gross Payout</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-blue-600" />
                <span>Net Credited to Employees</span>
              </div>
            </div>
          </div>
        </div>

        {/* Salary Cost by Department */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Cost by Department</h3>
                <p className="text-xs text-slate-500">Live allocation across units</p>
              </div>
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

          <button
            onClick={() => navigate('/employees')}
            className="w-full mt-6 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>View Department Hierarchy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
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
