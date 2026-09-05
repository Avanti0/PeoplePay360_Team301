import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { SalaryStructure, SalaryRule, SalaryRuleCategory, ComputationMethod } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import {
  Sliders,
  Plus,
  Search,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  Hash,
} from 'lucide-react';

interface RuleFormState {
  salaryStructureId: string | number;
  name: string;
  code: string;
  category: SalaryRuleCategory;
  sequence: number;
  computationType: ComputationMethod;
  amount: number | '';
  percentageBase: string;
  percentage: number | '';
  formula: string;
  isActive: boolean;
}

const initialRuleForm: RuleFormState = {
  salaryStructureId: '',
  name: '',
  code: '',
  category: 'allowance',
  sequence: 30,
  computationType: 'percentage',
  amount: 0,
  percentageBase: 'BASIC',
  percentage: 10,
  formula: '',
  isActive: true,
};

export const SalaryRulesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const isManager = hasRole('hr_payroll_manager') || hasRole('admin');

  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | number | null>(null);
  const [ruleFormData, setRuleFormData] = useState<RuleFormState>(initialRuleForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [viewingRule, setViewingRule] = useState<SalaryRule | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [structData, ruleData] = await Promise.all([
        api.salaryStructures.getAll(),
        api.salaryRules.getAll(),
      ]);
      setStructures(structData);
      setRules(ruleData);
      if (structData.length > 0 && !ruleFormData.salaryStructureId) {
        setRuleFormData((prev) => ({ ...prev, salaryStructureId: structData[0].id }));
      }
    } catch {
      error('Failed to load salary rules');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRules = rules
    .filter((r) => {
      const matchesStruct =
        selectedStructureId === 'all' || String(r.salaryStructureId) === String(selectedStructureId);
      const matchesCat = selectedCategory === 'all' || r.category === selectedCategory;
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' ? r.isActive : !r.isActive);
      const matchesSearch =
        (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.code || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStruct && matchesCat && matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by structure first, then sequence
      if (String(a.salaryStructureId) !== String(b.salaryStructureId)) {
        return String(a.salaryStructureId).localeCompare(String(b.salaryStructureId));
      }
      return a.sequence - b.sequence;
    });

  const getStructureName = (structureId: number | string) => {
    const found = structures.find((s) => String(s.id) === String(structureId));
    return found ? found.name : `Structure #${structureId}`;
  };

  const getStructureCode = (structureId: number | string) => {
    const found = structures.find((s) => String(s.id) === String(structureId));
    return found ? found.code || 'REG' : 'REG';
  };

  // ---------------------------------------------------------------------------
  // Rule CRUD & Actions
  // ---------------------------------------------------------------------------
  const handleOpenCreateRule = () => {
    const defaultStructId = selectedStructureId !== 'all' ? selectedStructureId : structures[0]?.id || 1;
    const structRules = rules.filter((r) => String(r.salaryStructureId) === String(defaultStructId));
    const nextSeq = structRules.length > 0 ? Math.max(...structRules.map((r) => r.sequence)) + 10 : 10;

    setEditingRuleId(null);
    setRuleFormData({
      ...initialRuleForm,
      salaryStructureId: defaultStructId,
      sequence: nextSeq,
    });
    setFormErrors({});
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (rule: SalaryRule) => {
    setEditingRuleId(rule.id);
    setRuleFormData({
      salaryStructureId: rule.salaryStructureId,
      name: rule.name,
      code: rule.code,
      category: rule.category,
      sequence: rule.sequence,
      computationType: rule.computationType,
      amount: rule.amount ?? 0,
      percentageBase: rule.percentageBase || 'BASIC',
      percentage: rule.percentage ?? 10,
      formula: rule.formula || '',
      isActive: rule.isActive ?? true,
    });
    setFormErrors({});
    setIsRuleModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!ruleFormData.salaryStructureId) {
      errs.salaryStructureId = 'Target salary structure is required';
    }

    if (!ruleFormData.name.trim()) {
      errs.name = 'Rule Name is required';
    } else if (ruleFormData.name.trim().length < 2) {
      errs.name = 'Rule Name must be at least 2 characters';
    }

    if (!ruleFormData.code.trim()) {
      errs.code = 'Rule Code is required';
    } else if (!/^[A-Z0-9_]+$/i.test(ruleFormData.code.trim())) {
      errs.code = 'Code must contain only uppercase letters, numbers, and underscores';
    }

    if (ruleFormData.sequence === undefined || ruleFormData.sequence === null || ruleFormData.sequence < 1) {
      errs.sequence = 'Sequence must be a positive integer (>= 1)';
    }

    if (ruleFormData.computationType === 'fixed') {
      if (ruleFormData.amount === '' || Number(ruleFormData.amount) < 0) {
        errs.amount = 'Amount must be a non-negative number (>= 0)';
      }
    } else if (ruleFormData.computationType === 'percentage') {
      if (ruleFormData.percentage === '' || Number(ruleFormData.percentage) < 0 || Number(ruleFormData.percentage) > 100) {
        errs.percentage = 'Percentage must be between 0% and 100%';
      }
      if (!ruleFormData.percentageBase.trim()) {
        errs.percentageBase = 'Base rule code is required (e.g. BASIC or GROSS)';
      }
    } else if (ruleFormData.computationType === 'formula') {
      if (!ruleFormData.formula.trim()) {
        errs.formula = 'Formula expression cannot be empty';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload: Partial<SalaryRule> = {
        salaryStructureId: ruleFormData.salaryStructureId,
        name: ruleFormData.name.trim(),
        code: ruleFormData.code.trim().toUpperCase(),
        category: ruleFormData.category,
        sequence: Number(ruleFormData.sequence),
        computationType: ruleFormData.computationType,
        amount: ruleFormData.computationType === 'fixed' ? Number(ruleFormData.amount) : null,
        percentageBase: ruleFormData.computationType === 'percentage' ? ruleFormData.percentageBase.trim().toUpperCase() : null,
        percentage: ruleFormData.computationType === 'percentage' ? Number(ruleFormData.percentage) : null,
        formula: ruleFormData.computationType === 'formula' ? ruleFormData.formula.trim() : null,
        isActive: ruleFormData.isActive,
      };

      if (editingRuleId) {
        const updated = await api.salaryRules.update(editingRuleId, payload);
        success(`Rule "${updated.code}" updated successfully`);
      } else {
        const created = await api.salaryRules.create(payload);
        success(`Rule "${created.code}" created at sequence ${created.sequence}`);
      }

      setIsRuleModalOpen(false);
      loadData();
    } catch {
      error('Failed to save salary rule');
    }
  };

  const handleDeleteRule = async (rule: SalaryRule) => {
    if (!window.confirm(`Are you sure you want to delete rule "${rule.name}" (${rule.code})?`)) return;
    try {
      await api.salaryRules.delete(rule.id);
      success(`Rule "${rule.code}" deleted`);
      loadData();
    } catch {
      error('Failed to delete salary rule');
    }
  };

  const handleToggleActive = async (rule: SalaryRule) => {
    try {
      const updated = await api.salaryRules.update(rule.id, {
        isActive: !rule.isActive,
      });
      success(`Rule ${updated.code} is now ${updated.isActive ? 'Active' : 'Inactive'}`);
      loadData();
    } catch {
      error('Failed to update rule status');
    }
  };

  const handleMoveRule = async (rule: SalaryRule, direction: 'up' | 'down') => {
    const structRules = rules
      .filter((r) => String(r.salaryStructureId) === String(rule.salaryStructureId))
      .sort((a, b) => a.sequence - b.sequence);

    const currentIndex = structRules.findIndex((r) => r.id === rule.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= structRules.length) return;

    const targetRule = structRules[targetIndex];
    const originalSeq = rule.sequence;
    const targetSeq = targetRule.sequence;

    const newRuleSeq = originalSeq === targetSeq ? (direction === 'up' ? targetSeq - 1 : targetSeq + 1) : targetSeq;
    const newTargetSeq = originalSeq === targetSeq ? targetSeq : originalSeq;

    try {
      await Promise.all([
        api.salaryRules.update(rule.id, { sequence: newRuleSeq }),
        api.salaryRules.update(targetRule.id, { sequence: newTargetSeq }),
      ]);
      success(`Updated sequence for ${rule.code}`);
      loadData();
    } catch {
      error('Failed to reorder rules');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Salary Computation Rules
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              FR-07 / FR-08
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global salary rule library with sequenced precedence, formula references, and category bindings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/salary-structures">
            <Button variant="outline" size="sm" icon={<Layers className="w-4 h-4" />}>
              Salary Structures
            </Button>
          </Link>
          {isManager && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateRule}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Salary Rule
            </Button>
          )}
        </div>
      </div>

      {/* Notice Banner regarding formula evaluation */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-start gap-3 shadow-sm">
        <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <h4 className="font-bold text-slate-100">Payroll Rule Engine & Execution Principles</h4>
          <p className="text-slate-400 leading-relaxed">
            Formulas and percentage bases configured here are strictly deterministic definitions. The FastAPI backend payroll engine computes values in strict ascending sequence order during payrun execution.
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search rule name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Structure Filter */}
          <select
            value={selectedStructureId}
            onChange={(e) => setSelectedStructureId(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Structures ({structures.length})</option>
            {structures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code || 'REG'})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Categories</option>
            <option value="basic">Basic</option>
            <option value="allowance">Allowance</option>
            <option value="gross">Gross</option>
            <option value="deduction">Deduction</option>
            <option value="net">Net</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <th className="py-3 px-3 w-16 text-center">Seq</th>
                <th className="py-3 px-3">Order</th>
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-4">Rule Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-4">Assigned Structure</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-4">Computation Definition</th>
                <th className="py-3 px-3 text-center">Status</th>
                {isManager && <th className="py-3 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Loading salary rules...
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No salary computation rules match your filters.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => {
                  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (rule.category === 'basic') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                  if (rule.category === 'allowance') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (rule.category === 'gross') badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  if (rule.category === 'deduction') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  if (rule.category === 'net') badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';

                  return (
                    <tr
                      key={rule.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !rule.isActive ? 'opacity-60 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Sequence Badge */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                          {rule.sequence}
                        </span>
                      </td>

                      {/* Reorder Buttons */}
                      <td className="py-3 px-3">
                        {isManager ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveRule(rule, 'up')}
                              title="Move Up in Structure Sequence"
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRule(rule, 'down')}
                              title="Move Down in Structure Sequence"
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300">&mdash;</span>
                        )}
                      </td>

                      {/* Rule Code */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {rule.code}
                        </span>
                      </td>

                      {/* Rule Name */}
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{rule.name}</span>
                          {!rule.isActive && (
                            <span className="text-[10px] font-normal text-rose-500 italic">(Inactive)</span>
                          )}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${badgeColor}`}
                        >
                          {rule.category}
                        </span>
                      </td>

                      {/* Structure */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">
                            {getStructureName(rule.salaryStructureId)}
                          </span>
                          <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-500 px-1 py-0.2 rounded">
                            {getStructureCode(rule.salaryStructureId)}
                          </span>
                        </div>
                      </td>

                      {/* Computation Type */}
                      <td className="py-3 px-3 capitalize text-slate-600 font-semibold text-[11px]">
                        {rule.computationType}
                      </td>

                      {/* Computation Value Display */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                        {rule.computationType === 'fixed' && (
                          <span className="font-semibold text-slate-700">
                            Fixed: ₹{(rule.amount ?? 0).toLocaleString()}
                          </span>
                        )}
                        {rule.computationType === 'percentage' && (
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {rule.percentage}% of {rule.percentageBase || 'BASIC'}
                          </span>
                        )}
                        {rule.computationType === 'formula' && (
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {rule.formula}
                          </span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(rule)}
                          title={rule.isActive ? 'Active (click to deactivate)' : 'Inactive (click to activate)'}
                          className={`p-1 rounded-md transition-colors ${
                            rule.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          {rule.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* Actions */}
                      {isManager && (
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingRule(rule)}
                              title="View Rule Details"
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditRule(rule)}
                              title="Edit Rule"
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule)}
                              title="Delete Rule"
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* --------------------------------------------------------------------------- */}
      {/* Create / Edit Rule Modal */}
      {/* --------------------------------------------------------------------------- */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRuleId ? 'Edit Salary Rule' : 'Create Salary Rule'}
        subtitle="Configure sequenced computation formula for payroll processing"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveRule} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Salary Structure <span className="text-rose-500">*</span>
            </label>
            <select
              value={ruleFormData.salaryStructureId}
              onChange={(e) => setRuleFormData({ ...ruleFormData, salaryStructureId: e.target.value })}
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                formErrors.salaryStructureId ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500 outline-none`}
            >
              <option value="">Select Structure...</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code || 'REG'})
                </option>
              ))}
            </select>
            {formErrors.salaryStructureId && (
              <p className="text-[11px] text-rose-500 mt-1">{formErrors.salaryStructureId}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rule Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={ruleFormData.name}
                onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                placeholder="e.g. Provident Fund Deduction"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  formErrors.name ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {formErrors.name && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rule Code (Unique) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={ruleFormData.code}
                onChange={(e) => setRuleFormData({ ...ruleFormData, code: e.target.value })}
                placeholder="e.g. PF_DED"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  formErrors.code ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono`}
              />
              {formErrors.code && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.code}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={ruleFormData.category}
                onChange={(e) => setRuleFormData({ ...ruleFormData, category: e.target.value as SalaryRuleCategory })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="basic">Basic (Base Wage)</option>
                <option value="allowance">Allowance (Add to Gross)</option>
                <option value="gross">Gross (Gross Line)</option>
                <option value="deduction">Deduction (Statutory / Tax)</option>
                <option value="net">Net (Net Take-Home)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sequence Order (ASC) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={ruleFormData.sequence}
                onChange={(e) => setRuleFormData({ ...ruleFormData, sequence: Number(e.target.value) })}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  formErrors.sequence ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {formErrors.sequence && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.sequence}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Computation Method</label>
            <select
              value={ruleFormData.computationType}
              onChange={(e) => setRuleFormData({ ...ruleFormData, computationType: e.target.value as ComputationMethod })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage of Another Rule</option>
              <option value="formula">Expression / Formula</option>
            </select>
          </div>

          {/* Conditional Inputs */}
          {ruleFormData.computationType === 'fixed' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fixed Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                value={ruleFormData.amount}
                onChange={(e) => setRuleFormData({ ...ruleFormData, amount: e.target.value === '' ? '' : Number(e.target.value) })}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  formErrors.amount ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {formErrors.amount && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.amount}</p>
              )}
            </div>
          )}

          {ruleFormData.computationType === 'percentage' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Percentage (%) (0-100) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={ruleFormData.percentage}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, percentage: e.target.value === '' ? '' : Number(e.target.value) })}
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    formErrors.percentage ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                  } focus:ring-2 focus:ring-blue-500 outline-none`}
                />
                {formErrors.percentage && (
                  <p className="text-[11px] text-rose-500 mt-1">{formErrors.percentage}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Base Rule Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={ruleFormData.percentageBase}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, percentageBase: e.target.value })}
                  placeholder="e.g. BASIC or GROSS"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    formErrors.percentageBase ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                  } focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono`}
                />
                {formErrors.percentageBase && (
                  <p className="text-[11px] text-rose-500 mt-1">{formErrors.percentageBase}</p>
                )}
              </div>
            </div>
          )}

          {ruleFormData.computationType === 'formula' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Formula Expression <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={ruleFormData.formula}
                onChange={(e) => setRuleFormData({ ...ruleFormData, formula: e.target.value })}
                placeholder="e.g. BASIC + HRA - PF"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  formErrors.formula ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none font-mono`}
              />
              {formErrors.formula && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.formula}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="globalRuleActive"
              checked={ruleFormData.isActive}
              onChange={(e) => setRuleFormData({ ...ruleFormData, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="globalRuleActive" className="text-xs font-bold text-slate-700 cursor-pointer">
              Active Rule
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRuleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingRuleId ? 'Save Changes' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --------------------------------------------------------------------------- */}
      {/* Rule Detail Modal */}
      {/* --------------------------------------------------------------------------- */}
      {viewingRule && (
        <Modal
          isOpen={Boolean(viewingRule)}
          onClose={() => setViewingRule(null)}
          title={`Rule: ${viewingRule.name} (${viewingRule.code})`}
          subtitle="Salary rule definition and calculation parameters"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <div>
                <span className="text-slate-400 font-medium block">Structure:</span>
                <span className="font-bold text-slate-800">
                  {getStructureName(viewingRule.salaryStructureId)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Sequence Number:</span>
                <span className="font-mono font-bold text-slate-800">#{viewingRule.sequence}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Category:</span>
                <span className="capitalize font-bold text-slate-800">{viewingRule.category}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Active Status:</span>
                <span className={`font-bold ${viewingRule.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {viewingRule.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="text-slate-500 font-medium block mb-1">Computation Definition:</span>
              <div className="font-mono text-xs text-blue-900 font-bold">
                {viewingRule.computationType === 'fixed' && `Fixed Amount: ₹${viewingRule.amount?.toLocaleString()}`}
                {viewingRule.computationType === 'percentage' && `${viewingRule.percentage}% of ${viewingRule.percentageBase}`}
                {viewingRule.computationType === 'formula' && viewingRule.formula}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingRule(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
