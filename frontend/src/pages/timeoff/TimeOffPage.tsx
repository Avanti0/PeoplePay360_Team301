import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { TimeOffRequest, Allocation, TimeOffType, Employee } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CalendarCheck, Plus, Check, X, Layers, PieChart, UserCheck } from 'lucide-react';

interface TimeOffPageProps {
  defaultTab?: 'requests' | 'allocations' | 'types';
}

export const TimeOffPage: React.FC<TimeOffPageProps> = ({ defaultTab }) => {
  const { hasRole, user } = useAuth();
  const { success, error, warning } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isHR = hasRole('hr_manager');
  const currentEmployeeId = user?.employeeId;
  const currentEmployeeName = user?.employeeName || user?.username || 'Employee';
  const currentDepartment = user?.department || 'General';

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
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [reqErrors, setReqErrors] = useState<Record<string, string>>({});
  const [reqEmployeeId, setReqEmployeeId] = useState<string>('');
  const [reqTypeId, setReqTypeId] = useState<string>('');
  const [reqStart, setReqStart] = useState(new Date().toISOString().slice(0, 10));
  const [reqEnd, setReqEnd] = useState(new Date().toISOString().slice(0, 10));
  const [reqDuration, setReqDuration] = useState(1);
  const [reqReason, setReqReason] = useState('');

  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [isSubmittingAlloc, setIsSubmittingAlloc] = useState(false);
  const [allocErrors, setAllocErrors] = useState<Record<string, string>>({});
  const [allocEmployeeId, setAllocEmployeeId] = useState<string>('');
  const [allocTypeId, setAllocTypeId] = useState<string>('');
  const [allocDays, setAllocDays] = useState(20);
  const [allocFrom, setAllocFrom] = useState(new Date().toISOString().slice(0, 4) + '-01-01');
  const [allocTo, setAllocTo] = useState(new Date().toISOString().slice(0, 4) + '-12-31');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [reqsRes, allocsRes, typesRes, empsRes] = await Promise.allSettled([
        api.timeOffRequests.getAll(),
        api.allocations.getAll(),
        api.timeOffTypes.getAll(),
        isHR ? api.employees.getAll() : Promise.resolve([]),
      ]);
      const reqs = reqsRes.status === 'fulfilled' ? reqsRes.value : [];
      const allocs = allocsRes.status === 'fulfilled' ? allocsRes.value : [];
      const types = typesRes.status === 'fulfilled' ? typesRes.value : [];
      const emps = empsRes.status === 'fulfilled' ? empsRes.value : [];

      setRequests(reqs);
      setAllocations(allocs);
      setLeaveTypes(types);
      setEmployees(emps);

      if (emps.length > 0) {
        setReqEmployeeId((prev) => prev || String(emps[0].id));
        setAllocEmployeeId((prev) => prev || String(emps[0].id));
      }
      if (types.length > 0) {
        setReqTypeId((prev) => prev || String(types[0].id));
        setAllocTypeId((prev) => prev || String(types[0].id));
      }
    } catch {
      error('Failed loading time off records');
    }
  };

  const handleApprove = async (reqId: string | number) => {
    if (!isHR) return;
    try {
      await api.timeOffRequests.approve(reqId);
      success('Leave request approved. Allocation balance deducted automatically (FR-06).');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to approve request');
    }
  };

  const handleRefuse = async (reqId: string | number) => {
    if (!isHR) return;
    try {
      await api.timeOffRequests.refuse(reqId);
      warning('Leave request refused.');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to refuse request');
    }
  };

  const handleDateChange = (start: string, end: string) => {
    setReqStart(start);
    setReqEnd(end);
    if (start && end && new Date(end) >= new Date(start)) {
      const diffMs = new Date(end).getTime() - new Date(start).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      setReqDuration(Math.max(1, diffDays));
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const effectiveEmployeeId = isHR ? reqEmployeeId : currentEmployeeId;

    if (isHR && !effectiveEmployeeId) {
      errors.employeeId = 'Please select an employee';
    }
    if (!reqTypeId) {
      errors.typeId = 'Please select a leave type';
    }
    if (!reqStart) {
      errors.dateFrom = 'Start date is required';
    }
    if (!reqEnd) {
      errors.dateTo = 'End date is required';
    }
    if (reqStart && reqEnd && new Date(reqEnd) < new Date(reqStart)) {
      errors.dateTo = 'End date cannot be earlier than start date';
    }
    if (isNaN(Number(reqDuration)) || Number(reqDuration) <= 0) {
      errors.duration = 'Duration must be greater than 0 days';
    }

    const emp = isHR
      ? employees.find((em) => String(em.id) === String(effectiveEmployeeId))
      : { name: currentEmployeeName, department: currentDepartment };

    const lType = leaveTypes.find((t) => String(t.id) === String(reqTypeId));
    const alloc = allocations.find(
      (a) =>
        String(a.employeeId) === String(effectiveEmployeeId) &&
        String(a.timeOffTypeId) === String(reqTypeId) &&
        a.status === 'approved'
    );

    if (lType?.requiresAllocation) {
      if (!alloc) {
        errors.duration = `No approved allocation found for ${emp?.name || 'this employee'} under ${lType.name}.`;
      } else if (Number(alloc.remaining) < Number(reqDuration)) {
        errors.duration = `Insufficient leave balance! Available: ${alloc.remaining} days, Requested: ${reqDuration} days.`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setReqErrors(errors);
      return;
    }

    setReqErrors({});
    setIsSubmittingReq(true);

    try {
      await api.timeOffRequests.create({
        employeeId: effectiveEmployeeId,
        employeeName: emp?.name,
        timeOffTypeId: reqTypeId,
        timeOffTypeName: lType?.name,
        allocationId: alloc?.id || null,
        dateFrom: reqStart,
        dateTo: reqEnd,
        duration: Number(reqDuration),
        note: reqReason.trim() || null,
      });
      success('Time off request submitted.');
      setIsRequestModalOpen(false);
      setReqReason('');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed submitting leave request');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHR) return;
    const errors: Record<string, string> = {};

    if (!allocEmployeeId) {
      errors.employeeId = 'Please select an employee';
    }
    if (!allocTypeId) {
      errors.typeId = 'Please select a leave type';
    }
    if (isNaN(Number(allocDays)) || Number(allocDays) <= 0) {
      errors.days = 'Allocated days must be greater than 0';
    }
    if (!allocFrom) {
      errors.dateFrom = 'Valid from date is required';
    }
    if (allocTo && allocFrom && new Date(allocTo) < new Date(allocFrom)) {
      errors.dateTo = 'Valid to date cannot be earlier than from date';
    }

    if (Object.keys(errors).length > 0) {
      setAllocErrors(errors);
      return;
    }

    setAllocErrors({});
    setIsSubmittingAlloc(true);

    const emp = employees.find((em) => String(em.id) === String(allocEmployeeId));
    const lType = leaveTypes.find((t) => String(t.id) === String(allocTypeId));

    try {
      await api.allocations.create({
        employeeId: allocEmployeeId,
        employeeName: emp?.name,
        timeOffTypeId: allocTypeId,
        timeOffTypeName: lType?.name,
        numberOfDays: Number(allocDays),
        dateFrom: allocFrom,
        dateTo: allocTo || null,
        status: 'approved',
      });
      success(`Granted ${allocDays} days allocation to ${emp?.name || 'employee'}`);
      setIsAllocModalOpen(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Error creating allocation');
    } finally {
      setIsSubmittingAlloc(false);
    }
  };

  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');

  const visibleRequests = (isHR
    ? requests
    : requests.filter((r) => !currentEmployeeId || String(r.employeeId) === String(currentEmployeeId))
  ).filter((req) => {
    const type = leaveTypes.find((t) => String(t.id) === String(req.timeOffTypeId));
    const emp = employees.find((e) => String(e.id) === String(req.employeeId));
    const typeName = req.timeOffTypeName || type?.name || '';
    const empName = req.employeeName || emp?.name || '';
    const note = req.note || '';

    const matchesSearch = isHR
      ? empName.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        typeName.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        note.toLowerCase().includes(requestSearchQuery.toLowerCase())
      : typeName.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        note.toLowerCase().includes(requestSearchQuery.toLowerCase());

    const matchesStatus = requestStatusFilter === 'all' || req.status === requestStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const visibleAllocations = isHR
    ? allocations
    : allocations.filter((a) => !currentEmployeeId || String(a.employeeId) === String(currentEmployeeId));

  const selectedReqType = leaveTypes.find((t) => String(t.id) === String(reqTypeId));
  const selectedReqAlloc = allocations.find(
    (a) =>
      String(a.employeeId) === String(isHR ? reqEmployeeId : currentEmployeeId) &&
      String(a.timeOffTypeId) === String(reqTypeId) &&
      a.status === 'approved'
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {isHR ? 'Time Off & Leave Management' : 'My Time Off'}
          </h2>
          <p className="text-xs text-slate-500">
            {isHR
              ? 'Leave types, balance allocations, and automated request approval deduction (FR-05, FR-06).'
              : 'View your leave balances and submit time off requests.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isHR && (
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

      {/* My Leave Balance Summary Cards for Employees */}
      {!isHR && visibleAllocations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">My Leave Balance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {visibleAllocations.map((alloc) => {
              const type = leaveTypes.find((t) => String(t.id) === String(alloc.timeOffTypeId));
              const typeName = alloc.timeOffTypeName || type?.name || 'Leave';
              const percentRemaining = alloc.numberOfDays
                ? Math.min(100, Math.max(0, Math.round((alloc.remaining / alloc.numberOfDays) * 100)))
                : 0;

              return (
                <div
                  key={alloc.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{typeName}</span>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {alloc.remaining} days remaining
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between text-xs text-slate-500">
                    <span>
                      Allocated: <strong className="text-slate-800">{alloc.numberOfDays}d</strong>
                    </span>
                    <span>
                      Taken: <strong className="text-rose-600">{alloc.taken}d</strong>
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${percentRemaining}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => handleTabChange('requests')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>{isHR ? 'All Requests' : 'My Requests'} ({visibleRequests.length})</span>
        </button>
        <button
          onClick={() => handleTabChange('allocations')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'allocations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>{isHR ? 'Balance Allocations' : 'My Leave Balances'} ({visibleAllocations.length})</span>
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

      {/* Filter Bar for Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-80">
            <input
              type="text"
              placeholder={isHR ? 'Search by employee, leave type, note...' : 'Search by leave type or note...'}
              value={requestSearchQuery}
              onChange={(e) => setRequestSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={requestStatusFilter}
              onChange={(e) => setRequestStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Request Statuses</option>
              <option value="approved">Approved</option>
              <option value="confirmed">Pending / Confirmed</option>
              <option value="refused">Refused</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                  {isHR && <th className="py-3.5 px-4">Employee</th>}
                  <th className="py-3.5 px-4">Leave Type</th>
                  <th className="py-3.5 px-4">Period</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  {isHR && <th className="py-3.5 px-4 text-right">Approval Workflow</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {visibleRequests.length === 0 ? (
                  <tr>
                    <td colSpan={isHR ? 7 : 5} className="py-8 text-center text-slate-400">
                      No time off requests found.
                    </td>
                  </tr>
                ) : (
                  visibleRequests.map((req) => {
                    const emp = employees.find((e) => String(e.id) === String(req.employeeId));
                    const type = leaveTypes.find((t) => String(t.id) === String(req.timeOffTypeId));
                    const empName = req.employeeName || emp?.name || "Employee";
                    const deptName = req.departmentName || emp?.department || "";
                    const typeName = req.timeOffTypeName || type?.name || "Leave";
                    return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      {isHR && (
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-bold text-slate-900">{empName}</p>
                            <p className="text-[10px] text-slate-400">{deptName}</p>
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-4 font-semibold text-slate-800">{typeName}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {req.dateFrom} &rarr; {req.dateTo}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">{req.duration}</span> days
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{req.note || '-'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={req.status} />
                      </td>
                      {isHR && (
                        <td className="py-3 px-4 text-right">
                          {(req.status === 'confirmed' || req.status === 'draft') ? (
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
                    );
                  })
                )}
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
                  {isHR && <th className="py-3.5 px-4">Employee</th>}
                  <th className="py-3.5 px-4">Leave Type</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4">Allocated</th>
                  <th className="py-3.5 px-4">Taken</th>
                  <th className="py-3.5 px-4">Remaining Balance</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {visibleAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={isHR ? 7 : 6} className="py-8 text-center text-slate-400">
                      No leave allocations found.
                    </td>
                  </tr>
                ) : (
                  visibleAllocations.map((alloc) => {
                    const emp = employees.find((e) => String(e.id) === String(alloc.employeeId));
                    const type = leaveTypes.find((t) => String(t.id) === String(alloc.timeOffTypeId));
                    const empName = alloc.employeeName || emp?.name || "Employee";
                    const typeName = alloc.timeOffTypeName || type?.name || "Leave";
                    return (
                    <tr key={alloc.id} className="hover:bg-slate-50/80 transition-colors">
                      {isHR && <td className="py-3 px-4 font-bold text-slate-900">{empName}</td>}
                      <td className="py-3 px-4 font-semibold text-slate-800">{typeName}</td>
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
                    );
                  })
                )}
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
          {isHR ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={reqEmployeeId}
                onChange={(e) => {
                  setReqEmployeeId(e.target.value);
                  if (reqErrors.employeeId) setReqErrors({ ...reqErrors, employeeId: '' });
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  reqErrors.employeeId ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              {reqErrors.employeeId && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{reqErrors.employeeId}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Employee</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{currentEmployeeName}</p>
                  <p className="text-[10px] text-slate-500">{currentDepartment} &bull; Self-Service Request</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Leave Type <span className="text-rose-500">*</span>
              </label>
              {selectedReqType && (
                <span className="text-[11px] font-semibold text-slate-500">
                  {selectedReqAlloc
                    ? `Available: ${selectedReqAlloc.remaining} days`
                    : selectedReqType.requiresAllocation
                    ? 'Available: 0 days'
                    : 'Unlimited (No balance limit)'}
                </span>
              )}
            </div>
            <select
              value={reqTypeId}
              onChange={(e) => {
                setReqTypeId(e.target.value);
                if (reqErrors.typeId) setReqErrors({ ...reqErrors, typeId: '' });
              }}
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                reqErrors.typeId ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500 outline-none`}
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.unit})
                </option>
              ))}
            </select>
            {reqErrors.typeId && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">{reqErrors.typeId}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                From Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={reqStart}
                onChange={(e) => {
                  handleDateChange(e.target.value, reqEnd);
                  if (reqErrors.dateFrom) setReqErrors({ ...reqErrors, dateFrom: '' });
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  reqErrors.dateFrom ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
                required
              />
              {reqErrors.dateFrom && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{reqErrors.dateFrom}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                To Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={reqEnd}
                onChange={(e) => {
                  handleDateChange(reqStart, e.target.value);
                  if (reqErrors.dateTo) setReqErrors({ ...reqErrors, dateTo: '' });
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  reqErrors.dateTo ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
                required
              />
              {reqErrors.dateTo && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{reqErrors.dateTo}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Duration (Days) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={reqDuration}
              onChange={(e) => {
                setReqDuration(Number(e.target.value));
                if (reqErrors.duration) setReqErrors({ ...reqErrors, duration: '' });
              }}
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                reqErrors.duration ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500 outline-none`}
              required
            />
            {reqErrors.duration && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">{reqErrors.duration}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason (Optional)</label>
            <textarea
              rows={2}
              value={reqReason}
              onChange={(e) => setReqReason(e.target.value)}
              placeholder="e.g. Attending personal family event"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
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
              disabled={isSubmittingReq}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingReq ? 'Submitting...' : 'Submit Request'}
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Employee <span className="text-rose-500">*</span>
            </label>
            <select
              value={allocEmployeeId}
              onChange={(e) => {
                setAllocEmployeeId(e.target.value);
                if (allocErrors.employeeId) setAllocErrors({ ...allocErrors, employeeId: '' });
              }}
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                allocErrors.employeeId ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500 outline-none`}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {allocErrors.employeeId && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">{allocErrors.employeeId}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Leave Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={allocTypeId}
              onChange={(e) => {
                setAllocTypeId(e.target.value);
                if (allocErrors.typeId) setAllocErrors({ ...allocErrors, typeId: '' });
              }}
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                allocErrors.typeId ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500 outline-none`}
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {allocErrors.typeId && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">{allocErrors.typeId}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Number of Days Allocated <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={allocDays}
              onChange={(e) => {
                setAllocDays(Number(e.target.value));
                if (allocErrors.days) setAllocErrors({ ...allocErrors, days: '' });
              }}
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                allocErrors.days ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500 outline-none`}
              required
            />
            {allocErrors.days && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">{allocErrors.days}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Valid From <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={allocFrom}
                onChange={(e) => {
                  setAllocFrom(e.target.value);
                  if (allocErrors.dateFrom) setAllocErrors({ ...allocErrors, dateFrom: '' });
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  allocErrors.dateFrom ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
                required
              />
              {allocErrors.dateFrom && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{allocErrors.dateFrom}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valid To</label>
              <input
                type="date"
                value={allocTo}
                onChange={(e) => {
                  setAllocTo(e.target.value);
                  if (allocErrors.dateTo) setAllocErrors({ ...allocErrors, dateTo: '' });
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  allocErrors.dateTo ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {allocErrors.dateTo && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{allocErrors.dateTo}</p>
              )}
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
              disabled={isSubmittingAlloc}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingAlloc ? 'Granting...' : 'Approve & Grant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
