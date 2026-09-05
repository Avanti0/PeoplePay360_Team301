import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Contract, Employee, SalaryStructure, WorkingSchedule } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  FileSignature,
  Plus,
  Search,
  AlertCircle,
  Calendar,
  Building2,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

export const ContractsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: 2,
    dateStart: '2026-09-01',
    dateEnd: '',
    wage: 1200000,
    salaryStructureId: 1,
    workingScheduleId: 1,
    employmentType: 'permanent' as const,
    status: 'draft' as const,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cList, eList, sList, schedList] = await Promise.all([
        api.contracts.getAll(),
        api.employees.getAll(),
        api.salaryStructures.getAll(),
        api.workingSchedules.getAll(),
      ]);
      setContracts(cList);
      setEmployees(eList);
      setStructures(sList);
      setSchedules(schedList);
    } catch {
      error('Failed to load contracts');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      (c.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.employeeCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((em) => String(em.id) === String(formData.employeeId));
    const struct = structures.find((s) => String(s.id) === String(formData.salaryStructureId));
    const sched = schedules.find((sc) => String(sc.id) === String(formData.workingScheduleId));

    try {
      const newContract = await api.contracts.create({
        ...formData,
        employeeName: emp?.name || `${emp?.firstName} ${emp?.lastName}`,
        employeeCode: emp?.employeeCode,
        salaryStructureName: struct?.name,
        workingScheduleName: sched?.name,
        departmentName: emp?.departmentName,
        jobPositionTitle: emp?.jobTitle,
        dateEnd: formData.dateEnd || null,
      });

      success(`Contract created for ${newContract.employeeName}`);
      setIsModalOpen(false);
      loadData();
    } catch {
      error('Error creating contract');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Employment Contracts
          </h2>
          <p className="text-xs text-slate-500">
            Historical period-aware contracts driving salary structure resolution (FR-02).
          </p>
        </div>

        {hasRole('hr_manager') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Contract</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Contract Statuses</option>
            <option value="active">Active / Running</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Role & Dept</th>
                <th className="py-3.5 px-4">Validity Period</th>
                <th className="py-3.5 px-4">Salary Structure</th>
                <th className="py-3.5 px-4">Gross Wage</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredContracts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <Link to={`/contracts/${c.id}`} className="group block">
                      <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{c.employeeName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{c.employeeCode} &bull; #{c.id}</p>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">{c.jobPositionTitle || 'Software Engineer'}</p>
                    <p className="text-[10px] text-slate-400">{c.departmentName || 'Engineering'}</p>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.dateStart}</span>
                      <span className="text-slate-400">&rarr;</span>
                      <span>{c.dateEnd ? c.dateEnd : 'Open-Ended'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                      {c.salaryStructureName || 'Regular Salary'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 text-sm">
                      {formatCurrency(c.wage)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Annual</span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/contracts/${c.id}`}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                    >
                      <span>View</span>
                      <span>&rarr;</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Contract Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Employment Contract"
        subtitle="Specify start date, optional end date, wage, and assigned salary structure"
        maxWidth="xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Employee</label>
            <select
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.dateStart}
                onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                End Date <span className="text-slate-400 font-normal">(Leave blank if open)</span>
              </label>
              <input
                type="date"
                value={formData.dateEnd}
                onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Gross Annual Wage (₹)
            </label>
            <input
              type="number"
              value={formData.wage}
              onChange={(e) => setFormData({ ...formData, wage: Number(e.target.value) })}
              step="10000"
              min="0"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Salary Structure
              </label>
              <select
                value={formData.salaryStructureId}
                onChange={(e) =>
                  setFormData({ ...formData, salaryStructureId: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contract Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="draft">Draft</option>
                <option value="active">Active (Running)</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
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
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              Save Contract
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
