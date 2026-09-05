import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Employee, Department, JobPosition } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  LayoutGrid,
  List as ListIcon,
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  Briefcase,
  ChevronRight,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

const ALLOWED_LIMITS = [10, 25, 50, 100];
const DEFAULT_LIMIT = 10;
const ALLOWED_STATUSES = ['active', 'inactive', 'all'];
const DEFAULT_STATUS = 'active';

function parsePage(raw: string | null): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function parseLimit(raw: string | null): number {
  const n = parseInt(raw ?? '', 10);
  return ALLOWED_LIMITS.includes(n) ? n : DEFAULT_LIMIT;
}

function parseStatus(raw: string | null): string {
  return raw && ALLOWED_STATUSES.includes(raw) ? raw : DEFAULT_STATUS;
}

function getPageNumbers(current: number, total: number): number[] {
  const maxButtons = 5;
  if (total <= maxButtons) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, current - 2);
  const end = Math.min(total, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export const EmployeesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query params (status/search/department/page/limit) are the source
  // of truth for pagination/filter state, so refresh, back/forward, and
  // shared links all reproduce the same view. All filtering happens
  // server-side, across the full dataset, not just the loaded page.
  const status = parseStatus(searchParams.get('status'));
  const search = searchParams.get('search') || '';
  const department = searchParams.get('department') || 'all';
  const page = parsePage(searchParams.get('page'));
  const limit = parseLimit(searchParams.get('limit'));

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban'); // FR-01: Support Kanban and List views
  // Local, immediate text-field value; debounced into the `search` URL
  // param so the server isn't queried on every keystroke.
  const [searchInput, setSearchInput] = useState(search);
  const [isLoading, setIsLoading] = useState(true);

  // New Employee Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    jobPosition: '',
    department: 'Engineering',
    employmentStatus: 'active' as const,
    bankAccountNumber: '',
    bankName: '',
    bankIfsc: '',
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, department, page, limit]);

  // Debounce the search text field into the URL (and thus the server
  // query) instead of firing a request on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== search) {
        updateParams({ search: searchInput, page: '1' });
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Keep the text field in sync if the URL's search param changes from
  // outside the field itself (e.g. browser back/forward navigation).
  useEffect(() => {
    setSearchInput(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadDepartments = async () => {
    try {
      setDepartments(await api.departments.getAll());
    } catch {
      // Department dropdown is a non-critical filter aid; ignore failures here
      // since employee loading below already surfaces a toast on error.
    }
  };

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const result = await api.employees.list({
        status,
        page,
        limit,
        search: search || undefined,
        department: department !== 'all' ? department : undefined,
      });
      setEmployees(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      error('Failed to load employee list');
      setEmployees([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  };

  const handleStatusChange = (newStatus: string) => {
    updateParams({ status: newStatus, page: '1' });
  };

  const handleLimitChange = (newLimit: number) => {
    updateParams({ limit: String(newLimit), page: '1' });
  };

  const handleDeptChange = (newDept: string) => {
    updateParams({ department: newDept === 'all' ? '' : newDept, page: '1' });
  };

  const goToPage = (targetPage: number) => {
    const clamped = Math.min(Math.max(1, targetPage), totalPages);
    updateParams({ page: String(clamped) });
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const cleanName = formData.name.trim();
    if (!cleanName) {
      errors.name = 'Full name is required';
    } else if (cleanName.length < 2) {
      errors.name = 'Full name must be at least 2 characters';
    }

    const cleanEmail = formData.email.trim();
    if (!cleanEmail) {
      errors.email = 'Email address is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    const cleanPhone = formData.phone.trim();
    if (cleanPhone) {
      const digits = cleanPhone.replace(/[^0-9]/g, '');
      if (digits.length < 7 || digits.length > 15) {
        errors.phone = 'Phone number must be between 7 and 15 digits';
      }
    }

    const cleanIfsc = formData.bankIfsc.trim().toUpperCase();
    if (cleanIfsc && !/^[A-Z0-9]{4,11}$/.test(cleanIfsc)) {
      errors.bankIfsc = 'IFSC code must be between 4 and 11 alphanumeric characters';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);
    try {
      const created = await api.employees.create({
        ...formData,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || undefined,
        jobPosition: formData.jobPosition.trim() || undefined,
        bankAccountNumber: formData.bankAccountNumber.trim() || undefined,
        bankName: formData.bankName.trim() || undefined,
        bankIfsc: cleanIfsc || undefined,
      });
      success(`Employee ${created.name} created successfully!`);
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        jobPosition: '',
        department: departments[0]?.name || 'Engineering',
        employmentStatus: 'active',
        bankAccountNumber: '',
        bankName: '',
        bankIfsc: '',
      });
      loadEmployees();
    } catch (err) {
      const detail = err instanceof Error ? err.message.replace(/^HTTP \d+:\s*/, '') : '';
      error(detail || 'Failed to create employee profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Employee Directory
          </h2>
          <p className="text-xs text-slate-500">
            Profiles, departments, and linked contract & attendance history (FR-01).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Kanban / List Toggle Button Group */}
          <div className="flex items-center p-1 bg-slate-200/80 rounded-xl border border-slate-300/60">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          {hasRole('hr_manager') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, code, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={department}
            onChange={(e) => handleDeptChange(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>

          <select
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {ALLOWED_LIMITS.map((l) => (
              <option key={l} value={l}>
                {l} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 shadow-sm flex flex-col items-center justify-center gap-2 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs font-medium">Loading employees...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && employees.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 shadow-sm flex flex-col items-center justify-center gap-2 text-slate-400">
          <Users className="w-8 h-8 text-slate-300" />
          <span className="text-xs font-medium">No employees found matching the current filters.</span>
        </div>
      )}

      {/* Kanban View */}
      {!isLoading && employees.length > 0 && viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {employees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => navigate(`/employees/${emp.id}`)}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-sm flex items-center justify-center shadow-md">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {emp.name}
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {emp.jobPosition}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={emp.employmentStatus} />
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-800">{emp.jobPosition || 'Team Member'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{emp.department || 'General Operations'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                </div>

                {/* Missing bank alert warning */}
                {!emp.bankAccountNumber && (
                  <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>Missing bank details for payroll</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{emp.workingScheduleName || 'Standard schedule'}</span>
                <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Profile &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!isLoading && employees.length > 0 && viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Role / Title</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Schedule</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {emp.name}
                          </p>
                          <p className="text-[10px] text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{emp.jobPosition}</td>
                    <td className="py-3 px-4">{emp.department}</td>
                    <td className="py-3 px-4 text-slate-500">{emp.email}</td>
                    <td className="py-3 px-4 text-slate-600">{emp.workingScheduleName || 'Standard'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={emp.employmentStatus} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
          <p className="text-xs text-slate-500">
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} employees
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            {getPageNumbers(page, totalPages).map((p) => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  p === page ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Employee"
        subtitle="Create an employee record and link to department, schedule, and manager"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  formErrors.name ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
                placeholder="e.g. Aditi Rao"
                required
              />
              {formErrors.name && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  formErrors.email ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
                placeholder="e.g. aditi.rao@peoplepay360.demo"
                required
              />
              {formErrors.email && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                }}
                placeholder="+91 98765 00000"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  formErrors.phone ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {formErrors.phone && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{formErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Job Position / Title</label>
              <input
                type="text"
                value={formData.jobPosition}
                onChange={(e) => setFormData({ ...formData, jobPosition: e.target.value })}
                placeholder="e.g. Senior Software Engineer"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Statutory Bank Details (For Payroll Processing)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Bank Account No.
                </label>
                <input
                  type="text"
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                  placeholder="ACC-XXXX-XXXX"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="National Trust Bank"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.bankIfsc}
                  onChange={(e) => {
                    setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() });
                    if (formErrors.bankIfsc) setFormErrors({ ...formErrors, bankIfsc: '' });
                  }}
                  placeholder="NTBK0001234"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    formErrors.bankIfsc ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                  } focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono`}
                />
                {formErrors.bankIfsc && (
                  <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.bankIfsc}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
