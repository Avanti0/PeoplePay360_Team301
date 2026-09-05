import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Employee, Contract, AttendanceRecord, TimeOffRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  User,
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  CreditCard,
  FileSignature,
  Clock,
  CalendarCheck,
  UserX,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'attendance' | 'timeOff'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadEmployeeDetails(id);
    }
  }, [id]);

  const loadEmployeeDetails = async (empId: string) => {
    setIsLoading(true);
    try {
      const [emp, contractList, attList, toList] = await Promise.all([
        api.employees.getById(empId),
        api.employees.getContracts(empId),
        api.employees.getAttendance(empId),
        api.employees.getTimeOff(empId),
      ]);
      setEmployee(emp);
      setContracts(contractList);
      setAttendance(attList);
      setTimeOff(toList);
    } catch {
      error('Failed to load employee details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!employee) return;
    const newStatus = employee.employmentStatus === 'active' ? 'inactive' : 'active';
    try {
      const updated = await api.employees.update(employee.id, {
        employmentStatus: newStatus,
      });
      setEmployee(updated || { ...employee, employmentStatus: newStatus });
      success(`Employee status updated to ${newStatus}`);
    } catch {
      error('Failed to update status');
    }
  };

  if (isLoading || !employee) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/employees')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employee Directory</span>
        </button>

        {hasRole('hr_manager') && (
          <button
            onClick={handleToggleStatus}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
              employee.employmentStatus === 'active'
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {employee.employmentStatus === 'active' ? (
              <>
                <UserX className="w-3.5 h-3.5" />
                <span>Deactivate Employee</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reactivate Employee</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Profile Card Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            {employee.firstName.charAt(0)}
            {employee.lastName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-slate-900">
                {employee.firstName} {employee.lastName}
              </h2>
              <StatusBadge status={employee.employmentStatus} />
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {employee.jobTitle || 'Team Member'} &bull; {employee.departmentName} &bull;{' '}
              <span className="font-mono text-blue-600">{employee.employeeCode}</span>
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{employee.email}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{employee.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Joined {employee.dateJoined}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Warning Notice if Missing */}
        {!employee.bankAccountNumber && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 max-w-sm flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">Missing Bank Details</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Statutory payout cannot proceed during payrun validation until account details are provided.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs (FR-01: View related contracts, attendance, time off) */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('contracts')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'contracts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span>Contracts ({contracts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'attendance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Attendance ({attendance.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('timeOff')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'timeOff'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Time Off ({timeOff.length})</span>
        </button>
      </div>

      {/* Tab 1: Profile Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Employment Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Department</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{employee.departmentName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Position</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{employee.jobTitle || 'Team Member'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Reports To</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{employee.managerName || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Schedule</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {employee.workingScheduleName || 'Standard 9-to-6'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Statutory Bank Credentials
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2">
                <span className="text-slate-400 block font-medium">Bank Account Number</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                  {employee.bankAccountNumber || 'Not Configured (Warning flagged)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Bank Name</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {employee.bankName || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">IFSC Code</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                  {employee.bankIfsc || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Related Contracts */}
      {activeTab === 'contracts' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Historical & Active Contracts</h3>
            <span className="text-xs text-slate-500">Period-aware payroll resolution</span>
          </div>

          <div className="space-y-3">
            {contracts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No contracts found for this employee.</p>
            ) : (
              contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-slate-900">
                        {contract.jobPositionTitle || employee.jobTitle}
                      </span>
                      <StatusBadge status={contract.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Period: <span className="font-semibold text-slate-700">{contract.dateStart}</span> to{' '}
                      <span className="font-semibold text-slate-700">
                        {contract.dateEnd ? contract.dateEnd : 'Present (Open-ended)'}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Structure: {contract.salaryStructureName || 'Regular Salary'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-slate-900">
                      {formatCurrency(contract.wage)}
                    </span>
                    <span className="text-[11px] text-slate-500 block">Gross Annual Wage</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Attendance Logs */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Attendance Log History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400">
                      No attendance records logged yet.
                    </td>
                  </tr>
                ) : (
                  attendance.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{att.workDate}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-blue-600">{att.workedHours}h</td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={att.status} />
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {att.isManual ? 'Manual Correction' : 'Biometric/Web'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Time Off */}
      {activeTab === 'timeOff' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Time Off Requests & Balances</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timeOff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      No leave requests filed.
                    </td>
                  </tr>
                ) : (
                  timeOff.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{req.timeOffTypeName}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {req.dateFrom} to {req.dateTo}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{req.duration} Days</td>
                      <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">{req.reason || '-'}</td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={req.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
