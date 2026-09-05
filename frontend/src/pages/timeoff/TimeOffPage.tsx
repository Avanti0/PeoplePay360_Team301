import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { TimeOffRequest, Allocation, TimeOffType, Employee } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CalendarCheck, Plus, Check, X, Layers, PieChart } from 'lucide-react';

interface TimeOffPageProps {
  defaultTab?: 'requests' | 'allocations' | 'types';
}

export const TimeOffPage: React.FC<TimeOffPageProps> = ({ defaultTab }) => {
  const { hasRole } = useAuth();
  const { success, error, warning } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTabFromLocation = (): 'requests' | 'allocations' | 'types' => {
    if (defaultTab) return defaultTab;
    if (location.pathname.includes('/time-off/allocations')) return 'allocations';
    if (location.pathname.includes('/time-off/types')) return 'types';
    if (location.pathname.includes('/time-off/requests')) return 'requests';
    const tabParam = searchParams.get('tab');
    if (tabParam === 'allocations' || tabParam === 'types') return tabParam;
    return 'requests';
  };

  const [activeTab, setActiveTab] = useState<'requests' | 'allocations' | 'types'>(getActiveTabFromLocation());

  useEffect(() => {
    setActiveTab(getActiveTabFromLocation());
  }, [location.pathname, searchParams, defaultTab]);

  const handleTabChange = (tab: 'requests' | 'allocations' | 'types') => {
    setActiveTab(tab);
    if (location.pathname.startsWith('/time-off/')) {
      navigate(`/time-off/${tab}`);
    } else {
      setSearchParams({ tab });
    }
  };
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<TimeOffType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqEmployeeId, setReqEmployeeId] = useState<number>(2);
  const [reqTypeId, setReqTypeId] = useState<number>(1);
  const [reqStart, setReqStart] = useState('2026-09-10');
  const [reqEnd, setReqEnd] = useState('2026-09-11');
  const [reqDuration, setReqDuration] = useState(2);
  const [reqReason, setReqReason] = useState('');

  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [allocEmployeeId, setAllocEmployeeId] = useState<number>(2);
  const [allocTypeId, setAllocTypeId] = useState<number>(1);
  const [allocDays, setAllocDays] = useState(20);
  const [allocFrom, setAllocFrom] = useState('2026-01-01');
  const [allocTo, setAllocTo] = useState('2026-12-31');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reqs, allocs, types, emps] = await Promise.all([
        api.timeOffRequests.getAll(),
        api.allocations.getAll(),
        api.timeOffTypes.getAll(),
        api.employees.getAll(),
      ]);
      setRequests(reqs);
      setAllocations(allocs);
      setLeaveTypes(types);
      setEmployees(emps);
    } catch {
      error('Failed loading time off records');
    }
  };

  const handleApprove = async (reqId: string | number) => {
    try {
      await api.timeOffRequests.approve(reqId);
      success('Leave request approved. Allocation balance deducted automatically (FR-06).');
      loadData();
    } catch {
      error('Failed to approve request');
    }
  };

  const handleRefuse = async (reqId: string | number) => {
    try {
      await api.timeOffRequests.refuse(reqId);
      warning('Leave request refused.');
      loadData();
    } catch {
      error('Failed to refuse request');
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((em) => em.id === reqEmployeeId);
    const lType = leaveTypes.find((t) => t.id === reqTypeId);
    const alloc = allocations.find(
      (a) => a.employeeId === reqEmployeeId && a.timeOffTypeId === reqTypeId && a.status === 'approved'
    );

    if (alloc && alloc.remaining < reqDuration) {
      warning(`Insufficient leave balance! Available: ${alloc.remaining} days, Requested: ${reqDuration} days.`);
      return;
    }

    try {
      await api.timeOffRequests.create({
        employeeId: reqEmployeeId,
        employeeName: emp?.name,
        employeeCode: emp?.employeeCode,
        departmentName: emp?.departmentName,
        timeOffTypeId: reqTypeId,
        timeOffTypeName: lType?.name,
        allocationId: alloc?.id || null,
        dateFrom: reqStart,
        dateTo: reqEnd,
        duration: reqDuration,
        reason: reqReason,
      });
      success('Time off request submitted.');
      setIsRequestModalOpen(false);
      setReqReason('');
      loadData();
    } catch {
      error('Failed submitting leave request');
    }
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((em) => em.id === allocEmployeeId);
    const lType = leaveTypes.find((t) => t.id === allocTypeId);

    try {
      await api.allocations.create({
        employeeId: allocEmployeeId,
        employeeName: emp?.name,
        employeeCode: emp?.employeeCode,
        timeOffTypeId: allocTypeId,
        timeOffTypeName: lType?.name,
        numberOfDays: allocDays,
        dateFrom: allocFrom,
        dateTo: allocTo,
        status: 'approved',
      });
      success(`Granted ${allocDays} days allocation to ${emp?.name}`);
      setIsAllocModalOpen(false);
      loadData();
    } catch {
      error('Error creating allocation');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Time Off & Leave Management</h2>
          <p className="text-xs text-slate-500">
            Leave types, balance allocations, and automated request approval deduction (FR-05, FR-06).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasRole('hr_manager') && (
            <button
              onClick={() => setIsAllocModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <PieChart className="w-3.5 h-3.5 text-blue-600" />
              <span>Grant Allocation</span>
            </button>
          )}
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Request Time Off</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => handleTabChange('requests')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Requests ({requests.length})</span>
        </button>
        <button
          onClick={() => handleTabChange('allocations')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'allocations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Balance Allocations ({allocations.length})</span>
        </button>
        <button
          onClick={() => handleTabChange('types')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'types' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Leave Types ({leaveTypes.length})</span>
        </button>
      </div>

      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Leave Type</th>
                  <th className="py-3.5 px-4">Period</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  {hasRole('hr_manager') && <th className="py-3.5 px-4 text-right">Approval Workflow</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{req.employeeName}</p>
                        <p className="text-[10px] text-slate-400">{req.departmentName}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{req.timeOffTypeName}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {req.dateFrom} &rarr; {req.dateTo}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{req.duration}</span> days
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{req.reason || '-'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={req.status} />
                    </td>
                    {hasRole('hr_manager') && (
                      <td className="py-3 px-4 text-right">
                        {(req.status === 'submitted' || req.status === 'draft') ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRefuse(req.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Refuse</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Completed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'allocations' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4">Allocated</th>
                  <th className="py-3.5 px-4">Taken</th>
                  <th className="py-3.5 px-4">Remaining Balance</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{alloc.employeeName}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{alloc.timeOffTypeName}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {alloc.dateFrom} &rarr; {alloc.dateTo || 'Ongoing'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{alloc.numberOfDays} days</td>
                    <td className="py-3 px-4 text-rose-600 font-semibold">{alloc.taken} days</td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-emerald-600 text-sm">
                        {alloc.remaining} days
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={alloc.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'types' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leaveTypes.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-900">{t.name}</h4>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 uppercase">
                  {t.unit}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 mt-3">
                <p className="flex items-center justify-between">
                  <span>Requires Allocation Balance:</span>
                  <span className="font-bold">{t.requiresAllocation ? 'Yes' : 'No'}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Affects Payroll Calculation:</span>
                  <span className="font-bold">{t.affectsPayroll ? 'Yes' : 'No'}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Submit Time Off Request"
        subtitle="Request will auto-deduct approved duration from remaining allocation balance"
        maxWidth="md"
      >
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Employee</label>
            <select
              value={reqEmployeeId}
              onChange={(e) => setReqEmployeeId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Leave Type</label>
            <select
              value={reqTypeId}
              onChange={(e) => setReqTypeId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                value={reqStart}
                onChange={(e) => setReqStart(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                value={reqEnd}
                onChange={(e) => setReqEnd(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Days)</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={reqDuration}
              onChange={(e) => setReqDuration(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
            <textarea
              rows={2}
              value={reqReason}
              onChange={(e) => setReqReason(e.target.value)}
              placeholder="e.g. Attending personal family event"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAllocModalOpen}
        onClose={() => setIsAllocModalOpen(false)}
        title="Grant Leave Allocation"
        subtitle="Credits balance directly to employee's time off account (FR-05)"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAllocation} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Employee</label>
            <select
              value={allocEmployeeId}
              onChange={(e) => setAllocEmployeeId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Leave Type</label>
            <select
              value={allocTypeId}
              onChange={(e) => setAllocTypeId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Number of Days Allocated</label>
            <input
              type="number"
              min="1"
              value={allocDays}
              onChange={(e) => setAllocDays(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valid From</label>
              <input
                type="date"
                value={allocFrom}
                onChange={(e) => setAllocFrom(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valid To</label>
              <input
                type="date"
                value={allocTo}
                onChange={(e) => setAllocTo(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAllocModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              Approve & Grant
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
