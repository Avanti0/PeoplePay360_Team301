import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Payrun, SalaryStructure, Employee } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Calculator,
  Plus,
  Calendar,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Users,
  ArrowRight,
} from 'lucide-react';

export const PayrunsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error, warning } = useToast();
  const navigate = useNavigate();

  const [payruns, setPayruns] = useState<Payrun[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Two-Step Wizard Modal State (FR-09)
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [payrunName, setPayrunName] = useState('October 2026 Monthly Payrun');
  const [selectedStructureId, setSelectedStructureId] = useState<string>('1');
  const [periodStart, setPeriodStart] = useState('2026-10-01');
  const [periodEnd, setPeriodEnd] = useState('2026-10-31');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);

  useEffect(() => {
    loadPayruns();
  }, []);

  const loadPayruns = async () => {
    setIsLoading(true);
    try {
      const [pList, sList, eList] = await Promise.all([
        api.payruns.getAll(),
        api.salaryStructures.getAll(),
        api.employees.getAll(),
      ]);
      setPayruns(pList);
      setStructures(sList);
      setEmployees(eList);
      // Default all active employees in step 2
      setSelectedEmployeeIds(
        eList.filter((e) => e.employmentStatus === 'active').map((e) => Number(e.id))
      );
    } catch {
      error('Failed to load payruns');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSelectAllEmployees = () => {
    if (selectedEmployeeIds.length === employees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(employees.map((e) => Number(e.id)));
    }
  };

  const toggleEmployeeSelection = (id: number) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreatePayrun = async () => {
    if (selectedEmployeeIds.length === 0) {
      warning('Please select at least 1 employee for the payrun.');
      return;
    }

    try {
      const created = await api.payruns.create({
        name: payrunName,
        salaryStructureId: selectedStructureId,
        periodStart,
        periodEnd,
        employeeIds: selectedEmployeeIds,
      });

      success(`Payrun "${created.name}" created as draft. Proceed to compute payslips.`);
      setIsWizardOpen(false);
      setWizardStep(1);
      loadPayruns();
      navigate(`/payruns/${created.id}`);
    } catch {
      error('Error launching payrun wizard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Payrun Processing
          </h2>
          <p className="text-xs text-slate-500">
            Two-step wizard, compute &rarr; validate &rarr; paid lifecycle, and validation warnings (FR-09).
          </p>
        </div>

        {hasRole('hr_payroll_user') && (
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Launch Payrun Wizard</span>
          </button>
        )}
      </div>

      {/* Payruns List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3.5 px-4">Payrun Name</th>
                <th className="py-3.5 px-4">Salary Structure</th>
                <th className="py-3.5 px-4">Payroll Period</th>
                <th className="py-3.5 px-4">Employees</th>
                <th className="py-3.5 px-4">Total Net Payout</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {payruns.map((pr) => (
                <tr
                  key={pr.id}
                  onClick={() => navigate(`/payruns/${pr.id}`)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900 text-sm">{pr.name}</p>
                    <p className="text-[10px] text-slate-400">
                      ID: #{pr.id} &bull; Created {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString() : 'Recent'}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                      {pr.salaryStructureName || 'Regular Salary'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{pr.periodStart}</span>
                      <span className="text-slate-400">&rarr;</span>
                      <span>{pr.periodEnd}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {pr.employeeCount || 8} staff
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {formatCurrency(pr.totalNet)}
                    </span>
                    {pr.totalGross ? (
                      <span className="text-[10px] text-slate-400 block">
                        Gross: {formatCurrency(pr.totalGross)}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={pr.status} />
                      {pr.warningsCount && pr.warningsCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {pr.warningsCount} warning
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-blue-600 font-bold text-xs inline-flex items-center gap-1">
                      Manage &rarr;
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-Step Wizard Modal (FR-09) */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setWizardStep(1);
        }}
        title="Payrun Creation Wizard (FR-09)"
        subtitle={
          wizardStep === 1
            ? 'Step 1 of 2: Select Salary Structure and Pay Period Window'
            : 'Step 2 of 2: Select Participating Employees for Computation'
        }
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {/* Step Indicator */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold ${
                wizardStep === 1 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-400'
              }`}
            >
              1. Structure & Period
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300" />
            <div
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold ${
                wizardStep === 2 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-400'
              }`}
            >
              2. Select Employees
            </div>
          </div>

          {/* Step 1 Fields */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payrun Name</label>
                <input
                  type="text"
                  value={payrunName}
                  onChange={(e) => setPayrunName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Salary Structure</label>
                <select
                  value={selectedStructureId}
                  onChange={(e) => setSelectedStructureId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Period Start</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Period End</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <span>Continue to Step 2</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 Fields */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-semibold">
                  Selected: <strong className="text-blue-600">{selectedEmployeeIds.length}</strong> of{' '}
                  {employees.length} employees
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllEmployees}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  {selectedEmployeeIds.length === employees.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {employees.map((emp) => {
                  const isChecked = selectedEmployeeIds.includes(Number(emp.id));
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleEmployeeSelection(Number(emp.id))}
                      className={`p-2.5 flex items-center justify-between cursor-pointer text-xs transition-colors ${
                        isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-bold text-slate-900">
                            {emp.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {emp.department}
                          </p>
                        </div>
                      </div>

                      {!emp.bankAccountNumber && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                          Missing Bank Acc
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  &larr; Back to Step 1
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWizardOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreatePayrun}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                  >
                    Create Payrun (Draft)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
