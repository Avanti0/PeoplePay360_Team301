import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SalaryStructure, SalaryRule, SalaryRuleCategory, ComputationMethod } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import {
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  Sparkles,
  Info,
  Calendar,
  Search,
  Filter,
  Check,
  AlertCircle,
} from 'lucide-react';

interface StructureFormState {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

interface RuleFormState {
  id?: string | number;
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

const initialStructureForm: StructureFormState = {
  name: '',
  code: '',
  description: '',
  isActive: true,
};

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

export const SalaryStructuresPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const isManager = hasRole('hr_payroll_manager') || hasRole('admin');

  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [structureSearch, setStructureSearch] = useState('');

  // Structure Modals
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [editingStructureId, setEditingStructureId] = useState<string | number | null>(null);
  const [structureFormData, setStructureFormData] = useState<StructureFormState>(initialStructureForm);
  const [structureFormErrors, setStructureFormErrors] = useState<Record<string, string>>({});
  const [isStructureDetailOpen, setIsStructureDetailOpen] = useState(false);

  // Rule Modals
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | number | null>(null);
  const [ruleFormData, setRuleFormData] = useState<RuleFormState>(initialRuleForm);
  const [ruleFormErrors, setRuleFormErrors] = useState<Record<string, string>>({});
  const [viewingRule, setViewingRule] = useState<SalaryRule | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (selectId?: string | number) => {
    setIsLoading(true);
    try {
      const [structData, ruleData] = await Promise.all([
        api.salaryStructures.getAll(),
        api.salaryRules.getAll(),
      ]);
      setStructures(structData);
      setRules(ruleData);

      if (selectId) {
        const found = structData.find((s) => String(s.id) === String(selectId));
        if (found) setSelectedStructure(found);
      } else if (structData.length > 0) {
        setSelectedStructure((prev) => {
          if (!prev) return structData[0];
          return structData.find((s) => String(s.id) === String(prev.id)) || structData[0];
        });
      }
    } catch {
      error('Failed to load salary structures');
    } finally {
      setIsLoading(false);
    }
  };

  const currentRules = selectedStructure
    ? rules
        .filter((r) => String(r.salaryStructureId) === String(selectedStructure.id))
        .sort((a, b) => a.sequence - b.sequence)
    : [];

  const filteredStructures = structures.filter((s) => {
    const q = structureSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q);
  });

  // ---------------------------------------------------------------------------
  // Structure CRUD
  // ---------------------------------------------------------------------------
  const handleOpenCreateStructure = () => {
    setEditingStructureId(null);
    setStructureFormData(initialStructureForm);
    setStructureFormErrors({});
    setIsStructureModalOpen(true);
  };

  const handleOpenEditStructure = (struct: SalaryStructure, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingStructureId(struct.id);
    setStructureFormData({
      name: struct.name,
      code: struct.code || '',
      description: struct.description || '',
      isActive: struct.isActive ?? true,
    });
    setStructureFormErrors({});
    setIsStructureModalOpen(true);
  };

  const validateStructureForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!structureFormData.name.trim()) {
      errs.name = 'Structure Name is required';
    } else if (structureFormData.name.trim().length < 3) {
      errs.name = 'Structure Name must be at least 3 characters';
    }

    if (!structureFormData.code.trim()) {
      errs.code = 'Code is required';
    } else if (!/^[A-Z0-9_-]+$/i.test(structureFormData.code.trim())) {
      errs.code = 'Code must contain only letters, numbers, hyphens, and underscores';
    }

    setStructureFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStructureForm()) return;

    try {
      if (editingStructureId) {
        const updated = await api.salaryStructures.update(editingStructureId, {
          name: structureFormData.name.trim(),
          code: structureFormData.code.trim().toUpperCase(),
          description: structureFormData.description.trim(),
          isActive: structureFormData.isActive,
        });
        success(`Structure "${updated.name}" updated successfully`);
        setIsStructureModalOpen(false);
        await loadData(updated.id);
      } else {
        const created = await api.salaryStructures.create({
          name: structureFormData.name.trim(),
          code: structureFormData.code.trim().toUpperCase(),
          description: structureFormData.description.trim(),
          isActive: structureFormData.isActive,
        });
        success(`Structure "${created.name}" created successfully`);
        setIsStructureModalOpen(false);
        await loadData(created.id);
      }
    } catch {
      error('Failed to save salary structure');
    }
  };

  const handleToggleStructureActive = async (struct: SalaryStructure, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.salaryStructures.update(struct.id, {
        isActive: !struct.isActive,
      });
      success(`Structure status changed to ${updated.isActive ? 'Active' : 'Inactive'}`);
      loadData(struct.id);
    } catch {
      error('Failed to update structure status');
    }
  };

  // ---------------------------------------------------------------------------
  // Rule CRUD & Sequence Reordering
  // ---------------------------------------------------------------------------
  const handleOpenCreateRule = () => {
    if (!selectedStructure) return;
    const maxSeq = currentRules.length > 0 ? Math.max(...currentRules.map((r) => r.sequence)) + 10 : 10;
    setEditingRuleId(null);
    setRuleFormData({
      ...initialRuleForm,
      salaryStructureId: selectedStructure.id,
      sequence: maxSeq,
    });
    setRuleFormErrors({});
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
    setRuleFormErrors({});
    setIsRuleModalOpen(true);
  };

  const validateRuleForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!ruleFormData.name.trim()) {
      errs.name = 'Rule Name is required';
    } else if (ruleFormData.name.trim().length < 2) {
      errs.name = 'Rule Name must be at least 2 characters';
    }

    if (!ruleFormData.code.trim()) {
      errs.code = 'Rule Code is required';
    } else if (!/^[A-Z0-9_]+$/i.test(ruleFormData.code.trim())) {
      errs.code = 'Code must contain only uppercase letters, numbers, and underscores (e.g. HRA, PF_DED)';
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

    setRuleFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRuleForm()) return;

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
      loadData(selectedStructure?.id);
    } catch {
      error('Failed to save salary rule');
    }
  };

  const handleDeleteRule = async (rule: SalaryRule) => {
    if (!window.confirm(`Are you sure you want to delete rule "${rule.name}" (${rule.code})?`)) return;
    try {
      await api.salaryRules.delete(rule.id);
      success(`Rule "${rule.code}" removed`);
      loadData(selectedStructure?.id);
    } catch {
      error('Failed to delete salary rule');
    }
  };

  const handleToggleRuleActive = async (rule: SalaryRule) => {
    try {
      const updated = await api.salaryRules.update(rule.id, {
        isActive: !rule.isActive,
      });
      success(`Rule ${updated.code} is now ${updated.isActive ? 'Active' : 'Inactive'}`);
      loadData(selectedStructure?.id);
    } catch {
      error('Failed to update rule status');
    }
  };

  const handleMoveRule = async (rule: SalaryRule, direction: 'up' | 'down') => {
    const currentIndex = currentRules.findIndex((r) => r.id === rule.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentRules.length) return;

    const targetRule = currentRules[targetIndex];
    // Swap sequences
    const originalSeq = rule.sequence;
    const targetSeq = targetRule.sequence;

    // In case they have the exact same sequence, adjust distinctly
    const newRuleSeq = originalSeq === targetSeq ? (direction === 'up' ? targetSeq - 1 : targetSeq + 1) : targetSeq;
    const newTargetSeq = originalSeq === targetSeq ? targetSeq : originalSeq;

    try {
      await Promise.all([
        api.salaryRules.update(rule.id, { sequence: newRuleSeq }),
        api.salaryRules.update(targetRule.id, { sequence: newTargetSeq }),
      ]);
      success(`Updated sequence order for ${rule.code}`);
      loadData(selectedStructure?.id);
    } catch {
      error('Failed to reorder rules');
    }
  };

  // Helper stats for selected structure
  const basicRulesCount = currentRules.filter((r) => r.category === 'basic').length;
  const allowanceRulesCount = currentRules.filter((r) => r.category === 'allowance').length;
  const deductionRulesCount = currentRules.filter((r) => r.category === 'deduction').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Salary Structures & Rule Sequence
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              FR-07 / FR-08
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure salary structure packages, effective dates, and deterministic rule execution sequence for payroll processing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isManager && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCreateStructure}
                icon={<Plus className="w-4 h-4" />}
              >
                New Structure
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenCreateRule}
                disabled={!selectedStructure}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Rule to Structure
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main 2-Column Layout: Structures List on Left, Sequenced Rules on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Structure Library (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Structures ({structures.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Select to view rules</span>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search structures..."
                value={structureSearch}
                onChange={(e) => setStructureSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Structures List */}
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-0.5">
              {isLoading ? (
                <div className="py-8 text-center text-slate-400 text-xs">Loading structures...</div>
              ) : filteredStructures.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No structures found</div>
              ) : (
                filteredStructures.map((s) => {
                  const isSelected = selectedStructure?.id === s.id;
                  const structRules = rules.filter((r) => String(r.salaryStructureId) === String(s.id));
                  const activeCount = structRules.filter((r) => r.isActive).length;

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedStructure(s)}
                      className={`group p-4 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {s.name}
                            </h4>
                            <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {s.code || 'REG'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {s.description || 'Standard compensation structure'}
                          </p>
                        </div>

                        {/* Status Toggle & Edit */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleToggleStructureActive(s, e)}
                            title={s.isActive ? 'Active (click to deactivate)' : 'Inactive (click to activate)'}
                            className={`p-1 rounded-lg transition-colors ${
                              s.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {s.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </button>
                          {isManager && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditStructure(s, e)}
                              title="Edit Structure"
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span className="flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-slate-400" />
                          {structRules.length} Rules ({activeCount} active)
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sequenced Rule Table & Execution Visualizer (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedStructure ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
              {/* Selected Structure Header Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-extrabold text-slate-900">
                      {selectedStructure.name}
                    </h3>
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      {selectedStructure.code || 'CODE'}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        selectedStructure.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {selectedStructure.isActive ? 'Active Structure' : 'Inactive Structure'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedStructure.description || 'No description provided.'}
                  </p>
                </div>

                {/* Structure Quick Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsStructureDetailOpen(true)}
                    icon={<Info className="w-3.5 h-3.5" />}
                  >
                    Details
                  </Button>
                  {isManager && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenCreateRule}
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Add Rule
                    </Button>
                  )}
                </div>
              </div>

              {/* Category Breakdown Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <div>
                    <span className="text-slate-500 font-medium">Basic Rules:</span>{' '}
                    <span className="font-bold text-slate-800">{basicRulesCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <span className="text-slate-500 font-medium">Allowances:</span>{' '}
                    <span className="font-bold text-slate-800">{allowanceRulesCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div>
                    <span className="text-slate-500 font-medium">Deductions:</span>{' '}
                    <span className="font-bold text-slate-800">{deductionRulesCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <div>
                    <span className="text-slate-500 font-medium">Total Sequenced:</span>{' '}
                    <span className="font-bold text-slate-800">{currentRules.length}</span>
                  </div>
                </div>
              </div>

              {/* Informative callout */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Deterministic Execution Rule:</strong> Rules are computed strictly in ascending sequence order.
                  Percentage and formula rules can reference codes of preceding rules (e.g. <code>BASIC</code>, <code>GROSS</code>). Formula execution is handled exclusively by the payroll backend engine.
                </p>
              </div>

              {/* Sequenced Rules Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                        <th className="py-3 px-3 w-16 text-center">Seq</th>
                        <th className="py-3 px-3">Order</th>
                        <th className="py-3 px-3">Code</th>
                        <th className="py-3 px-4">Rule Name</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-4">Computation Definition</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        {isManager && <th className="py-3 px-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {currentRules.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No rules configured for this structure. Click &ldquo;Add Rule&rdquo; to begin.
                          </td>
                        </tr>
                      ) : (
                        currentRules.map((rule, index) => {
                          let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                          if (rule.category === 'basic') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                          if (rule.category === 'allowance') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          if (rule.category === 'gross') badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                          if (rule.category === 'deduction') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                          if (rule.category === 'net') badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';

                          const isFirst = index === 0;
                          const isLast = index === currentRules.length - 1;

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

                              {/* Sequence Reorder Controls (Move Up/Down) */}
                              <td className="py-3 px-3">
                                {isManager ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={isFirst}
                                      onClick={() => handleMoveRule(rule, 'up')}
                                      title="Move Up in Sequence"
                                      className={`p-1 rounded transition-colors ${
                                        isFirst
                                          ? 'text-slate-300 cursor-not-allowed'
                                          : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                                      }`}
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isLast}
                                      onClick={() => handleMoveRule(rule, 'down')}
                                      title="Move Down in Sequence"
                                      className={`p-1 rounded transition-colors ${
                                        isLast
                                          ? 'text-slate-300 cursor-not-allowed'
                                          : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                                      }`}
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-xs">&mdash;</span>
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

                              {/* Computation Type */}
                              <td className="py-3 px-3 capitalize text-slate-600 font-semibold text-[11px]">
                                {rule.computationType}
                              </td>

                              {/* Computation Definition Display */}
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
                                  onClick={() => handleToggleRuleActive(rule)}
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
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center space-y-3">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Salary Structure Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select a salary structure from the library on the left or create a new one to view and configure its sequenced salary calculation rules.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------------- */}
      {/* Structure Create / Edit Modal */}
      {/* --------------------------------------------------------------------------- */}
      <Modal
        isOpen={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
        title={editingStructureId ? 'Edit Salary Structure' : 'Create Salary Structure'}
        subtitle="Configure structure code, name, and payroll activation state"
        maxWidth="md"
      >
        <form onSubmit={handleSaveStructure} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Structure Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={structureFormData.name}
              onChange={(e) => setStructureFormData({ ...structureFormData, name: e.target.value })}
              placeholder="e.g. Regular Staff Structure"
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                structureFormErrors.name ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500 outline-none`}
            />
            {structureFormErrors.name && (
              <p className="text-[11px] text-rose-500 mt-1">{structureFormErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Structure Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={structureFormData.code}
              onChange={(e) => setStructureFormData({ ...structureFormData, code: e.target.value })}
              placeholder="e.g. REG_EMP or EXEC_STRUCT"
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                structureFormErrors.code ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono`}
            />
            {structureFormErrors.code && (
              <p className="text-[11px] text-rose-500 mt-1">{structureFormErrors.code}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={structureFormData.description}
              onChange={(e) => setStructureFormData({ ...structureFormData, description: e.target.value })}
              placeholder="Provide context regarding employee tiers or contracts this structure applies to..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="structActive"
              checked={structureFormData.isActive}
              onChange={(e) => setStructureFormData({ ...structureFormData, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="structActive" className="text-xs font-bold text-slate-700 cursor-pointer">
              Active Structure (Available for contract assignments & payruns)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStructureModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingStructureId ? 'Save Changes' : 'Create Structure'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --------------------------------------------------------------------------- */}
      {/* Structure Detail Modal */}
      {/* --------------------------------------------------------------------------- */}
      {selectedStructure && (
        <Modal
          isOpen={isStructureDetailOpen}
          onClose={() => setIsStructureDetailOpen(false)}
          title={`Structure Details: ${selectedStructure.name}`}
          subtitle="Overview of salary structure configuration and attached rules"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <div>
                <span className="text-slate-400 font-medium block">Structure Code:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {selectedStructure.code || 'REG'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Status:</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedStructure.isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {selectedStructure.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-medium block">Description:</span>
                <span className="text-slate-700">
                  {selectedStructure.description || 'No description provided.'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-800">Rules Breakdown ({currentRules.length} Total)</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {currentRules.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400 text-[11px] w-6">
                        #{r.sequence}
                      </span>
                      <span className="font-bold text-slate-800">{r.name}</span>
                      <span className="font-mono text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded">
                        {r.code}
                      </span>
                    </div>
                    <span className="capitalize text-slate-500 font-medium text-[11px]">
                      {r.computationType}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStructureDetailOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* --------------------------------------------------------------------------- */}
      {/* Rule Create / Edit Modal */}
      {/* --------------------------------------------------------------------------- */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRuleId ? 'Edit Salary Rule' : 'Add Sequenced Salary Rule'}
        subtitle={`Configure rule computation definition for ${selectedStructure?.name}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveRule} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rule Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={ruleFormData.name}
                onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                placeholder="e.g. Special Allowance"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  ruleFormErrors.name ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {ruleFormErrors.name && (
                <p className="text-[11px] text-rose-500 mt-1">{ruleFormErrors.name}</p>
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
                placeholder="e.g. SPEC_ALLOW"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  ruleFormErrors.code ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono`}
              />
              {ruleFormErrors.code && (
                <p className="text-[11px] text-rose-500 mt-1">{ruleFormErrors.code}</p>
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
                <option value="basic">Basic (Wage Base)</option>
                <option value="allowance">Allowance (Add to Gross)</option>
                <option value="gross">Gross (Gross Salary Line)</option>
                <option value="deduction">Deduction (Statutory / Tax / PF)</option>
                <option value="net">Net (Take-Home Net Salary)</option>
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
                  ruleFormErrors.sequence ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {ruleFormErrors.sequence && (
                <p className="text-[11px] text-rose-500 mt-1">{ruleFormErrors.sequence}</p>
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
              <option value="percentage">Percentage of Preceding Rule</option>
              <option value="formula">Expression / Formula</option>
            </select>
          </div>

          {/* Conditional Input based on Computation Type */}
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
                  ruleFormErrors.amount ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {ruleFormErrors.amount && (
                <p className="text-[11px] text-rose-500 mt-1">{ruleFormErrors.amount}</p>
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
                    ruleFormErrors.percentage ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                  } focus:ring-2 focus:ring-blue-500 outline-none`}
                />
                {ruleFormErrors.percentage && (
                  <p className="text-[11px] text-rose-500 mt-1">{ruleFormErrors.percentage}</p>
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
                    ruleFormErrors.percentageBase ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                  } focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono`}
                />
                {ruleFormErrors.percentageBase && (
                  <p className="text-[11px] text-rose-500 mt-1">{ruleFormErrors.percentageBase}</p>
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
                  ruleFormErrors.formula ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none font-mono`}
              />
              {ruleFormErrors.formula && (
                <p className="text-[11px] text-rose-500 mt-1">{ruleFormErrors.formula}</p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                References codes of rules with lower sequence numbers. Configured expressions are evaluated by the backend payroll engine during payruns.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="ruleActive"
              checked={ruleFormData.isActive}
              onChange={(e) => setRuleFormData({ ...ruleFormData, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="ruleActive" className="text-xs font-bold text-slate-700 cursor-pointer">
              Active Rule in Structure
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
              {editingRuleId ? 'Save Changes' : 'Add Rule'}
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
          subtitle="Salary rule configuration metadata"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <div>
                <span className="text-slate-400 font-medium block">Sequence Number:</span>
                <span className="font-mono font-bold text-slate-800">#{viewingRule.sequence}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Category:</span>
                <span className="capitalize font-bold text-slate-800">{viewingRule.category}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Computation Type:</span>
                <span className="capitalize font-bold text-slate-800">{viewingRule.computationType}</span>
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
