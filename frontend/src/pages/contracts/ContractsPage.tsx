import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Contract,
  Employee,
  SalaryStructure,
  WorkingSchedule,
  ContractStatus,
  BulkOperationResult,
} from '../../types';
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
  Users,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  CheckSquare,
  Square,
  MinusSquare,
  Layers,
  ArrowRight,
  Info,
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
  const [isLoading, setIsLoading] = useState(true);

  // Multi-selection state
  const [selectedContractIds, setSelectedContractIds] = useState<Set<string>>(new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Single Create Modal State
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);
  const [singleFormErrors, setSingleFormErrors] = useState<Record<string, string | undefined>>({});
  const [singleFormData, setSingleFormData] = useState({
    employeeId: '',
    dateStart: new Date().toISOString().slice(0, 10),
    dateEnd: '',
    wage: 600000,
    salaryStructureId: '',
    workingScheduleId: '',
    status: 'draft' as ContractStatus,
  });

  // Bulk Create Modal State
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [bulkCreateEmpSearch, setBulkCreateEmpSearch] = useState('');
  const [bulkCreateSelectedEmpIds, setBulkCreateSelectedEmpIds] = useState<Set<string>>(new Set());
  const [isSubmittingBulkCreate, setIsSubmittingBulkCreate] = useState(false);
  const [bulkCreateErrors, setBulkCreateErrors] = useState<Record<string, string | undefined>>({});
  const [bulkCreateFormData, setBulkCreateFormData] = useState({
    dateStart: new Date().toISOString().slice(0, 10),
    dateEnd: '',
    wage: 600000,
    salaryStructureId: '',
    workingScheduleId: '',
    status: 'draft' as ContractStatus,
  });

  // Bulk Update Modal State
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isSubmittingBulkUpdate, setIsSubmittingBulkUpdate] = useState(false);
  const [bulkUpdateErrors, setBulkUpdateErrors] = useState<Record<string, string | undefined>>({});
  const [bulkUpdateFields, setBulkUpdateFields] = useState({
    updateDateStart: false,
    dateStart: new Date().toISOString().slice(0, 10),
    updateDateEnd: false,
    dateEnd: '',
    updateWage: false,
    wage: 650000,
    updateSalaryStructureId: false,
    salaryStructureId: '',
    updateWorkingScheduleId: false,
    workingScheduleId: '',
    updateStatus: false,
    status: 'active' as ContractStatus,
  });

  // Bulk Delete Modal State
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isSubmittingBulkDelete, setIsSubmittingBulkDelete] = useState(false);

  // Bulk Operation Result Modal State
  const [bulkResult, setBulkResult] = useState<BulkOperationResult | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cRes, eRes, sRes, schedRes] = await Promise.allSettled([
        api.contracts.getAll(),
        api.employees.getAll(),
        api.salaryStructures.getAll(),
        api.workingSchedules.getAll(),
      ]);
      const cList = cRes.status === 'fulfilled' ? cRes.value : [];
      const eList = eRes.status === 'fulfilled' ? eRes.value : [];
      const sList = sRes.status === 'fulfilled' ? sRes.value : [];
      const schedList = schedRes.status === 'fulfilled' ? schedRes.value : [];

      setContracts(cList);
      setEmployees(eList);
      setStructures(sList);
      setSchedules(schedList);

      // Default single form IDs
      setSingleFormData((prev) => ({
        ...prev,
        employeeId: prev.employeeId || (eList[0]?.id ? String(eList[0].id) : ''),
        salaryStructureId: prev.salaryStructureId || (sList[0]?.id ? String(sList[0].id) : ''),
        workingScheduleId: prev.workingScheduleId || (schedList[0]?.id ? String(schedList[0].id) : ''),
      }));

      // Default bulk create IDs
      setBulkCreateFormData((prev) => ({
        ...prev,
        salaryStructureId: prev.salaryStructureId || (sList[0]?.id ? String(sList[0].id) : ''),
        workingScheduleId: prev.workingScheduleId || (schedList[0]?.id ? String(schedList[0].id) : ''),
      }));
    } catch {
      error('Failed to load contracts');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      (c.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(c.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.jobPosition || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Manage indeterminate checkbox
  useEffect(() => {
    if (headerCheckboxRef.current) {
      const totalFiltered = filteredContracts.length;
      const selectedCountInView = filteredContracts.filter((c) => selectedContractIds.has(String(c.id))).length;
      if (selectedCountInView === 0) {
        headerCheckboxRef.current.checked = false;
        headerCheckboxRef.current.indeterminate = false;
      } else if (selectedCountInView === totalFiltered && totalFiltered > 0) {
        headerCheckboxRef.current.checked = true;
        headerCheckboxRef.current.indeterminate = false;
      } else {
        headerCheckboxRef.current.checked = false;
        headerCheckboxRef.current.indeterminate = true;
      }
    }
  }, [filteredContracts, selectedContractIds]);

  const handleToggleSelectAll = () => {
    const newSelected = new Set(selectedContractIds);
    const allInViewSelected = filteredContracts.every((c) => newSelected.has(String(c.id)));

    if (allInViewSelected) {
      filteredContracts.forEach((c) => newSelected.delete(String(c.id)));
    } else {
      filteredContracts.forEach((c) => newSelected.add(String(c.id)));
    }
    setSelectedContractIds(newSelected);
  };

  const handleToggleRowSelect = (id: string) => {
    const newSelected = new Set(selectedContractIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContractIds(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedContractIds(new Set());
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Single Contract Creation
  const handleSingleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorsMap: Record<string, string> = {};

    if (!singleFormData.employeeId) {
      errorsMap.employeeId = 'Please select an employee';
    }
    if (!singleFormData.dateStart) {
      errorsMap.dateStart = 'Start date is required';
    }
    if (
      singleFormData.dateEnd &&
      singleFormData.dateStart &&
      new Date(singleFormData.dateEnd) < new Date(singleFormData.dateStart)
    ) {
      errorsMap.dateEnd = 'End date cannot be earlier than start date';
    }
    if (isNaN(Number(singleFormData.wage)) || Number(singleFormData.wage) < 0) {
      errorsMap.wage = 'Gross annual wage must be a non-negative number';
    }

    if (Object.keys(errorsMap).length > 0) {
      setSingleFormErrors(errorsMap);
      return;
    }

    setSingleFormErrors({});
    setIsSubmittingSingle(true);

    const emp = employees.find((em) => String(em.id) === String(singleFormData.employeeId));
    const struct = structures.find((s) => String(s.id) === String(singleFormData.salaryStructureId));
    const sched = schedules.find((sc) => String(sc.id) === String(singleFormData.workingScheduleId));

    try {
      const newContract = await api.contracts.create({
        ...singleFormData,
        employeeId: singleFormData.employeeId,
        salaryStructureId: singleFormData.salaryStructureId || undefined,
        workingScheduleId: singleFormData.workingScheduleId || undefined,
        wage: Number(singleFormData.wage),
        employeeName: emp?.name,
        salaryStructureName: struct?.name,
        workingScheduleName: sched?.name,
        department: emp?.department,
        jobPosition: emp?.jobPosition,
        dateEnd: singleFormData.dateEnd || null,
      });

      success(`Contract created for ${newContract.employeeName || 'employee'}`);
      setIsSingleModalOpen(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Error creating contract');
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  // Bulk Create Contracts
  const handleOpenBulkCreate = () => {
    setBulkCreateSelectedEmpIds(new Set());
    setBulkCreateEmpSearch('');
    setBulkCreateErrors({});
    setIsBulkCreateOpen(true);
  };

  const handleToggleBulkEmpSelect = (empId: string) => {
    const newSelected = new Set(bulkCreateSelectedEmpIds);
    if (newSelected.has(empId)) {
      newSelected.delete(empId);
    } else {
      newSelected.add(empId);
    }
    setBulkCreateSelectedEmpIds(newSelected);
  };

  const handleSelectAllBulkEmps = () => {
    const filteredEmps = getFilteredBulkEmployees();
    const allSelected = filteredEmps.every((e) => bulkCreateSelectedEmpIds.has(String(e.id)));
    const newSelected = new Set(bulkCreateSelectedEmpIds);
    if (allSelected) {
      filteredEmps.forEach((e) => newSelected.delete(String(e.id)));
    } else {
      filteredEmps.forEach((e) => newSelected.add(String(e.id)));
    }
    setBulkCreateSelectedEmpIds(newSelected);
  };

  const getFilteredBulkEmployees = () => {
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(bulkCreateEmpSearch.toLowerCase()) ||
        (e.department || '').toLowerCase().includes(bulkCreateEmpSearch.toLowerCase()) ||
        (e.jobPosition || '').toLowerCase().includes(bulkCreateEmpSearch.toLowerCase()) ||
        e.email.toLowerCase().includes(bulkCreateEmpSearch.toLowerCase())
    );
  };

  const handleBulkCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorsMap: Record<string, string> = {};

    if (bulkCreateSelectedEmpIds.size === 0) {
      errorsMap.employees = 'Please select at least one employee for bulk contract generation';
    }
    if (!bulkCreateFormData.dateStart) {
      errorsMap.dateStart = 'Start date is required';
    }
    if (
      bulkCreateFormData.dateEnd &&
      bulkCreateFormData.dateStart &&
      new Date(bulkCreateFormData.dateEnd) < new Date(bulkCreateFormData.dateStart)
    ) {
      errorsMap.dateEnd = 'End date cannot be earlier than start date';
    }
    if (isNaN(Number(bulkCreateFormData.wage)) || Number(bulkCreateFormData.wage) < 0) {
      errorsMap.wage = 'Gross annual wage must be a non-negative number';
    }

    if (Object.keys(errorsMap).length > 0) {
      setBulkCreateErrors(errorsMap);
      return;
    }

    setBulkCreateErrors({});
    setIsSubmittingBulkCreate(true);

    try {
      const res = await api.contracts.bulkCreate({
        employeeIds: Array.from(bulkCreateSelectedEmpIds),
        dateStart: bulkCreateFormData.dateStart,
        dateEnd: bulkCreateFormData.dateEnd || null,
        wage: Number(bulkCreateFormData.wage),
        salaryStructureId: bulkCreateFormData.salaryStructureId || null,
        workingScheduleId: bulkCreateFormData.workingScheduleId || null,
        status: bulkCreateFormData.status,
      });

      setIsBulkCreateOpen(false);
      setBulkResult(res);
      setIsResultModalOpen(true);
      loadData();
    } catch (err: any) {
      error(err.message || 'Error processing bulk contract creation');
    } finally {
      setIsSubmittingBulkCreate(false);
    }
  };

  // Bulk Update Submit
  const handleBulkUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorsMap: Record<string, string> = {};

    const hasAnyUpdateField =
      bulkUpdateFields.updateDateStart ||
      bulkUpdateFields.updateDateEnd ||
      bulkUpdateFields.updateWage ||
      bulkUpdateFields.updateSalaryStructureId ||
      bulkUpdateFields.updateWorkingScheduleId ||
      bulkUpdateFields.updateStatus;

    if (!hasAnyUpdateField) {
      errorsMap.general = 'Please select at least one field to update.';
    }

    if (bulkUpdateFields.updateDateStart && !bulkUpdateFields.dateStart) {
      errorsMap.dateStart = 'Start date is required when updating start date.';
    }

    if (
      bulkUpdateFields.updateDateEnd &&
      bulkUpdateFields.dateEnd &&
      bulkUpdateFields.updateDateStart &&
      bulkUpdateFields.dateStart &&
      new Date(bulkUpdateFields.dateEnd) < new Date(bulkUpdateFields.dateStart)
    ) {
      errorsMap.dateEnd = 'End date cannot be earlier than start date.';
    }

    if (bulkUpdateFields.updateWage) {
      if (isNaN(Number(bulkUpdateFields.wage)) || Number(bulkUpdateFields.wage) < 0) {
        errorsMap.wage = 'Gross annual wage must be a non-negative number.';
      }
    }

    if (bulkUpdateFields.updateSalaryStructureId && !bulkUpdateFields.salaryStructureId) {
      errorsMap.salaryStructureId = 'Please select a salary structure.';
    }

    if (bulkUpdateFields.updateWorkingScheduleId && !bulkUpdateFields.workingScheduleId) {
      errorsMap.workingScheduleId = 'Please select a working schedule.';
    }

    if (Object.keys(errorsMap).length > 0) {
      setBulkUpdateErrors(errorsMap);
      if (errorsMap.general) error(errorsMap.general);
      return;
    }

    setBulkUpdateErrors({});
    setIsSubmittingBulkUpdate(true);
    try {
      const res = await api.contracts.bulkUpdate({
        contractIds: Array.from(selectedContractIds),
        updateDateStart: bulkUpdateFields.updateDateStart,
        dateStart: bulkUpdateFields.updateDateStart ? bulkUpdateFields.dateStart : undefined,
        updateDateEnd: bulkUpdateFields.updateDateEnd,
        dateEnd: bulkUpdateFields.updateDateEnd ? (bulkUpdateFields.dateEnd || null) : undefined,
        updateWage: bulkUpdateFields.updateWage,
        wage: bulkUpdateFields.updateWage ? Number(bulkUpdateFields.wage) : undefined,
        updateSalaryStructureId: bulkUpdateFields.updateSalaryStructureId,
        salaryStructureId: bulkUpdateFields.updateSalaryStructureId ? (bulkUpdateFields.salaryStructureId || null) : undefined,
        updateWorkingScheduleId: bulkUpdateFields.updateWorkingScheduleId,
        workingScheduleId: bulkUpdateFields.updateWorkingScheduleId ? (bulkUpdateFields.workingScheduleId || null) : undefined,
        updateStatus: bulkUpdateFields.updateStatus,
        status: bulkUpdateFields.updateStatus ? bulkUpdateFields.status : undefined,
      });

      setIsBulkUpdateOpen(false);
      setBulkResult(res);
      setIsResultModalOpen(true);
      loadData();
    } catch (err: any) {
      error(err.message || 'Error processing bulk contract update');
    } finally {
      setIsSubmittingBulkUpdate(false);
    }
  };

  // Bulk Delete Submit
  const handleBulkDeleteSubmit = async () => {
    setIsSubmittingBulkDelete(true);
    try {
      const res = await api.contracts.bulkDelete({
        contractIds: Array.from(selectedContractIds),
      });

      setIsBulkDeleteOpen(false);
      setBulkResult(res);
      setIsResultModalOpen(true);
      setSelectedContractIds(new Set());
      loadData();
    } catch (err: any) {
      error(err.message || 'Error processing bulk contract deletion');
    } finally {
      setIsSubmittingBulkDelete(false);
    }
  };

  const selectedContractsList = contracts.filter((c) => selectedContractIds.has(String(c.id)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-blue-600" />
            Employment Contracts
          </h2>
          <p className="text-xs text-slate-500">
            Multi-employee contract lifecycle, period overlap safety, and bulk management.
          </p>
        </div>

        {hasRole('hr_manager') && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenBulkCreate}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Users className="w-4 h-4" />
              <span>Bulk Create</span>
            </button>

            <button
              onClick={() => setIsSingleModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Contract</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee, role, or contract ID..."
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

      {/* Floating / Sticky Bulk Action Toolbar */}
      {selectedContractIds.size > 0 && hasRole('hr_manager') && (
        <div className="bg-slate-900 text-white p-3.5 px-5 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              {selectedContractIds.size} {selectedContractIds.size === 1 ? 'contract' : 'contracts'} selected
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Choose a bulk operation to apply across all selected records:
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsBulkUpdateOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Bulk Update</span>
            </button>

            <button
              onClick={() => setIsBulkDeleteOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete</span>
            </button>

            <button
              onClick={handleClearSelection}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Contracts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                {hasRole('hr_manager') && (
                  <th className="py-3.5 px-4 w-10">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                  </th>
                )}
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
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={hasRole('hr_manager') ? 8 : 7} className="py-12 text-center text-slate-400 text-xs">
                    No contracts found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => {
                  const emp = employees.find((e) => String(e.id) === String(c.employeeId));
                  const struct = structures.find((s) => String(s.id) === String(c.salaryStructureId));
                  const empName = c.employeeName || emp?.name || 'Employee';
                  const structName = c.salaryStructureName || struct?.name || 'Regular Salary';
                  const jobPos = c.jobPosition || emp?.jobPosition || '-';
                  const dept = c.department || emp?.department || '-';
                  const isSelected = selectedContractIds.has(String(c.id));

                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {hasRole('hr_manager') && (
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRowSelect(String(c.id))}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <Link to={`/contracts/${c.id}`} className="group block">
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {empName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">#{String(c.id).slice(0, 8)}</p>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{jobPos}</p>
                        <p className="text-[10px] text-slate-400">{dept}</p>
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
                          {structName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-sm">{formatCurrency(c.wage)}</span>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. SINGLE CREATE CONTRACT MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Create Employment Contract"
        subtitle="Specify start date, optional end date, wage, and assigned salary structure"
        maxWidth="xl"
      >
        <form onSubmit={handleSingleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Employee <span className="text-rose-500">*</span>
            </label>
            <select
              value={singleFormData.employeeId}
              onChange={(e) => {
                setSingleFormData({ ...singleFormData, employeeId: e.target.value });
                if (singleFormErrors.employeeId) setSingleFormErrors({ ...singleFormErrors, employeeId: '' });
              }}
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                singleFormErrors.employeeId ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500 outline-none`}
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.department})
                </option>
              ))}
            </select>
            {singleFormErrors.employeeId && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">{singleFormErrors.employeeId}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={singleFormData.dateStart}
                onChange={(e) => {
                  setSingleFormData({ ...singleFormData, dateStart: e.target.value });
                  if (singleFormErrors.dateStart) setSingleFormErrors({ ...singleFormErrors, dateStart: '' });
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  singleFormErrors.dateStart ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
                required
              />
              {singleFormErrors.dateStart && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{singleFormErrors.dateStart}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                End Date <span className="text-slate-400 font-normal">(Leave blank if open)</span>
              </label>
              <input
                type="date"
                value={singleFormData.dateEnd}
                onChange={(e) => {
                  setSingleFormData({ ...singleFormData, dateEnd: e.target.value });
                  if (singleFormErrors.dateEnd) setSingleFormErrors({ ...singleFormErrors, dateEnd: '' });
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  singleFormErrors.dateEnd ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {singleFormErrors.dateEnd && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{singleFormErrors.dateEnd}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Gross Annual Wage (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={singleFormData.wage}
              onChange={(e) => {
                setSingleFormData({ ...singleFormData, wage: Number(e.target.value) });
                if (singleFormErrors.wage) setSingleFormErrors({ ...singleFormErrors, wage: '' });
              }}
              step="10000"
              min="0"
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                singleFormErrors.wage ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500 outline-none font-mono`}
              required
            />
            {singleFormErrors.wage && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">{singleFormErrors.wage}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Salary Structure</label>
              <select
                value={singleFormData.salaryStructureId}
                onChange={(e) => setSingleFormData({ ...singleFormData, salaryStructureId: e.target.value })}
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Working Schedule</label>
              <select
                value={singleFormData.workingScheduleId}
                onChange={(e) => setSingleFormData({ ...singleFormData, workingScheduleId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {schedules.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Contract Status</label>
            <select
              value={singleFormData.status}
              onChange={(e) => setSingleFormData({ ...singleFormData, status: e.target.value as any })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="draft">Draft</option>
              <option value="active">Active (Running)</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSingleModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingSingle}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingSingle ? 'Saving...' : 'Save Contract'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 2. BULK CREATE CONTRACTS MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isBulkCreateOpen}
        onClose={() => setIsBulkCreateOpen(false)}
        title="Bulk Create Employment Contracts"
        subtitle="Generate contracts for multiple employees simultaneously with overlap protection"
        maxWidth="2xl"
      >
        <form onSubmit={handleBulkCreateSubmit} className="space-y-5">
          {/* Step 1: Select Employees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                Select Target Employees ({bulkCreateSelectedEmpIds.size} of {employees.length} selected)
                <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleSelectAllBulkEmps}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {getFilteredBulkEmployees().every((e) => bulkCreateSelectedEmpIds.has(String(e.id)))
                  ? 'Deselect In View'
                  : 'Select All In View'}
              </button>
            </div>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter employee list by name, department, role..."
                value={bulkCreateEmpSearch}
                onChange={(e) => setBulkCreateEmpSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-1">
              {getFilteredBulkEmployees().map((emp) => {
                const isChecked = bulkCreateSelectedEmpIds.has(String(emp.id));
                const activeContract = contracts.find((c) => String(c.employeeId) === String(emp.id) && c.status === 'active');

                return (
                  <label
                    key={emp.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                      isChecked ? 'bg-indigo-50 border border-indigo-200 text-indigo-900' : 'hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleBulkEmpSelect(String(emp.id))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div>
                        <p className="font-bold text-slate-800">{emp.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {emp.jobPosition || 'Role'} &bull; {emp.department || 'General'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[10px]">
                      {activeContract ? (
                        <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                          Active contract exists
                        </span>
                      ) : (
                        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          No active contract
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            {bulkCreateErrors.employees && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">{bulkCreateErrors.employees}</p>
            )}
          </div>

          {/* Step 2: Contract Attributes */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Common Contract Parameters
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={bulkCreateFormData.dateStart}
                  onChange={(e) => setBulkCreateFormData({ ...bulkCreateFormData, dateStart: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  End Date <span className="text-slate-400 font-normal">(Leave blank for open-ended)</span>
                </label>
                <input
                  type="date"
                  value={bulkCreateFormData.dateEnd}
                  onChange={(e) => setBulkCreateFormData({ ...bulkCreateFormData, dateEnd: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gross Annual Wage (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={bulkCreateFormData.wage}
                onChange={(e) => setBulkCreateFormData({ ...bulkCreateFormData, wage: Number(e.target.value) })}
                step="10000"
                min="0"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Salary Structure</label>
                <select
                  value={bulkCreateFormData.salaryStructureId}
                  onChange={(e) => setBulkCreateFormData({ ...bulkCreateFormData, salaryStructureId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Working Schedule</label>
                <select
                  value={bulkCreateFormData.workingScheduleId}
                  onChange={(e) => setBulkCreateFormData({ ...bulkCreateFormData, workingScheduleId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  {schedules.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contract Status</label>
              <select
                value={bulkCreateFormData.status}
                onChange={(e) => setBulkCreateFormData({ ...bulkCreateFormData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="draft">Draft (Safe, no overlap check needed)</option>
                <option value="active">Active (Validated against existing active contracts)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBulkCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingBulkCreate}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {isSubmittingBulkCreate ? 'Creating...' : `Create ${bulkCreateSelectedEmpIds.size} Contracts`}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 3. BULK UPDATE CONTRACTS MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isBulkUpdateOpen}
        onClose={() => setIsBulkUpdateOpen(false)}
        title={`Bulk Update (${selectedContractIds.size} Contracts)`}
        subtitle="Toggle and specify only the fields you wish to update across all selected contracts"
        maxWidth="2xl"
      >
        <form onSubmit={handleBulkUpdateSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Selective Field Updates</p>
              <p className="text-[11px] text-blue-800">
                Unchecked fields will be preserved exactly as they are on each individual contract.
              </p>
            </div>
          </div>

          {/* Affected Contracts Preview */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <p className="font-bold text-slate-800 mb-1.5">
              Target Contracts ({selectedContractsList.length}):
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {selectedContractsList.map((c) => (
                <span key={c.id} className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-700">
                  {c.employeeName || 'Employee'} (#{String(c.id).slice(0, 8)})
                </span>
              ))}
            </div>
          </div>

          {bulkUpdateErrors.general && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {bulkUpdateErrors.general}
            </div>
          )}

          {/* Update Wage */}
          <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkUpdateFields.updateWage}
                onChange={(e) => {
                  setBulkUpdateFields({ ...bulkUpdateFields, updateWage: e.target.checked });
                  setBulkUpdateErrors({ ...bulkUpdateErrors, wage: undefined, general: undefined });
                }}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-800">Update Gross Annual Wage</span>
            </label>
            {bulkUpdateFields.updateWage && (
              <div className="pl-6 pt-1">
                <input
                  type="number"
                  value={bulkUpdateFields.wage}
                  onChange={(e) => {
                    setBulkUpdateFields({ ...bulkUpdateFields, wage: Number(e.target.value) });
                    if (bulkUpdateErrors.wage) setBulkUpdateErrors({ ...bulkUpdateErrors, wage: undefined });
                  }}
                  step="10000"
                  min="0"
                  placeholder="New Gross Annual Wage (₹)"
                  className={`w-full px-3 py-1.5 text-xs rounded-xl border outline-none font-mono ${
                    bulkUpdateErrors.wage ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-2 focus:ring-rose-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                  }`}
                  required
                />
                {bulkUpdateErrors.wage && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1">{bulkUpdateErrors.wage}</p>
                )}
              </div>
            )}
          </div>

          {/* Update Dates */}
          <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-3">
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkUpdateFields.updateDateStart}
                  onChange={(e) => {
                    setBulkUpdateFields({ ...bulkUpdateFields, updateDateStart: e.target.checked });
                    setBulkUpdateErrors({ ...bulkUpdateErrors, dateStart: undefined, general: undefined });
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-800">Update Start Date</span>
              </label>
              {bulkUpdateFields.updateDateStart && (
                <div className="pl-6">
                  <input
                    type="date"
                    value={bulkUpdateFields.dateStart}
                    onChange={(e) => {
                      setBulkUpdateFields({ ...bulkUpdateFields, dateStart: e.target.value });
                      if (bulkUpdateErrors.dateStart) setBulkUpdateErrors({ ...bulkUpdateErrors, dateStart: undefined });
                    }}
                    className={`w-full px-3 py-1.5 text-xs rounded-xl border outline-none ${
                      bulkUpdateErrors.dateStart ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-2 focus:ring-rose-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                    }`}
                    required
                  />
                  {bulkUpdateErrors.dateStart && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{bulkUpdateErrors.dateStart}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkUpdateFields.updateDateEnd}
                  onChange={(e) => {
                    setBulkUpdateFields({ ...bulkUpdateFields, updateDateEnd: e.target.checked });
                    setBulkUpdateErrors({ ...bulkUpdateErrors, dateEnd: undefined, general: undefined });
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-800">
                  Update End Date <span className="text-slate-400 font-normal">(Leave blank to make open-ended)</span>
                </span>
              </label>
              {bulkUpdateFields.updateDateEnd && (
                <div className="pl-6">
                  <input
                    type="date"
                    value={bulkUpdateFields.dateEnd}
                    onChange={(e) => {
                      setBulkUpdateFields({ ...bulkUpdateFields, dateEnd: e.target.value });
                      if (bulkUpdateErrors.dateEnd) setBulkUpdateErrors({ ...bulkUpdateErrors, dateEnd: undefined });
                    }}
                    className={`w-full px-3 py-1.5 text-xs rounded-xl border outline-none ${
                      bulkUpdateErrors.dateEnd ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-2 focus:ring-rose-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                    }`}
                  />
                  {bulkUpdateErrors.dateEnd && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{bulkUpdateErrors.dateEnd}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Update Structure & Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkUpdateFields.updateSalaryStructureId}
                  onChange={(e) => {
                    setBulkUpdateFields({ ...bulkUpdateFields, updateSalaryStructureId: e.target.checked });
                    setBulkUpdateErrors({ ...bulkUpdateErrors, salaryStructureId: undefined, general: undefined });
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-800">Update Structure</span>
              </label>
              {bulkUpdateFields.updateSalaryStructureId && (
                <div>
                  <select
                    value={bulkUpdateFields.salaryStructureId}
                    onChange={(e) => {
                      setBulkUpdateFields({ ...bulkUpdateFields, salaryStructureId: e.target.value });
                      if (bulkUpdateErrors.salaryStructureId) setBulkUpdateErrors({ ...bulkUpdateErrors, salaryStructureId: undefined });
                    }}
                    className={`w-full px-3 py-1.5 text-xs rounded-xl border outline-none ${
                      bulkUpdateErrors.salaryStructureId ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-2 focus:ring-rose-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select Structure...</option>
                    {structures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {bulkUpdateErrors.salaryStructureId && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{bulkUpdateErrors.salaryStructureId}</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkUpdateFields.updateWorkingScheduleId}
                  onChange={(e) => {
                    setBulkUpdateFields({ ...bulkUpdateFields, updateWorkingScheduleId: e.target.checked });
                    setBulkUpdateErrors({ ...bulkUpdateErrors, workingScheduleId: undefined, general: undefined });
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-800">Update Schedule</span>
              </label>
              {bulkUpdateFields.updateWorkingScheduleId && (
                <div>
                  <select
                    value={bulkUpdateFields.workingScheduleId}
                    onChange={(e) => {
                      setBulkUpdateFields({ ...bulkUpdateFields, workingScheduleId: e.target.value });
                      if (bulkUpdateErrors.workingScheduleId) setBulkUpdateErrors({ ...bulkUpdateErrors, workingScheduleId: undefined });
                    }}
                    className={`w-full px-3 py-1.5 text-xs rounded-xl border outline-none ${
                      bulkUpdateErrors.workingScheduleId ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-2 focus:ring-rose-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select Schedule...</option>
                    {schedules.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                  {bulkUpdateErrors.workingScheduleId && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{bulkUpdateErrors.workingScheduleId}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Update Status */}
          <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkUpdateFields.updateStatus}
                onChange={(e) => setBulkUpdateFields({ ...bulkUpdateFields, updateStatus: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-800">Update Contract Status</span>
            </label>
            {bulkUpdateFields.updateStatus && (
              <div className="pl-6">
                <select
                  value={bulkUpdateFields.status}
                  onChange={(e) => setBulkUpdateFields({ ...bulkUpdateFields, status: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active (Running)</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBulkUpdateOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingBulkUpdate}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {isSubmittingBulkUpdate ? 'Updating...' : `Update ${selectedContractIds.size} Contracts`}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 4. BULK DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        title="Confirm Bulk Deletion"
        subtitle="Review contracts slated for permanent removal"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Historical Payroll Safety Protection</p>
              <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                Only <strong>draft contracts</strong> without historical payslip records can be permanently deleted.
                Active, expired, or contracts linked to payslips will be automatically protected.
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800 mb-2">
              Selected Contracts for Removal ({selectedContractsList.length}):
            </p>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-1 bg-slate-50">
              {selectedContractsList.map((c) => (
                <div key={c.id} className="p-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{c.employeeName || 'Employee'}</p>
                    <p className="text-[10px] text-slate-400 font-mono">#{String(c.id).slice(0, 8)}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkDeleteSubmit}
              disabled={isSubmittingBulkDelete}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isSubmittingBulkDelete ? 'Deleting...' : `Delete ${selectedContractIds.size} Contracts`}
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 5. BULK RESULT SUMMARY MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => {
          setIsResultModalOpen(false);
          setSelectedContractIds(new Set());
        }}
        title="Bulk Operation Report"
        subtitle="Summary of processed records and validation results"
        maxWidth="lg"
      >
        {bulkResult && (
          <div className="space-y-4">
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                <p className="text-xl font-extrabold text-slate-800">{bulkResult.total}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Success</p>
                <p className="text-xl font-extrabold text-emerald-700">{bulkResult.successCount}</p>
              </div>
              <div className={`p-3 rounded-xl border ${bulkResult.failedCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-[10px] font-bold uppercase ${bulkResult.failedCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  Failed / Skipped
                </p>
                <p className={`text-xl font-extrabold ${bulkResult.failedCount > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                  {bulkResult.failedCount}
                </p>
              </div>
            </div>

            {/* Success Notification */}
            {bulkResult.successCount > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Successfully processed <strong>{bulkResult.successCount}</strong> contract record(s).
                </span>
              </div>
            )}

            {/* Itemized Failures */}
            {bulkResult.failures && bulkResult.failures.length > 0 && (
              <div>
                <p className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Itemized Issues ({bulkResult.failures.length}):
                </p>
                <div className="max-h-56 overflow-y-auto space-y-2 border border-rose-200 rounded-xl p-2 bg-rose-50/40">
                  {bulkResult.failures.map((f, i) => (
                    <div key={i} className="p-2 bg-white rounded-lg border border-rose-200/80 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{f.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">#{String(f.id).slice(0, 8)}</span>
                      </div>
                      <p className="text-[11px] text-rose-700 mt-1 font-medium">{f.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsResultModalOpen(false);
                  setSelectedContractIds(new Set());
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm"
              >
                Dismiss & Refresh
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
