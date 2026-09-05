import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SalaryStructure, SalaryRule } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import {
  Layers,
  Plus,
  ArrowDown,
  Calculator,
  Percent,
  Hash,
  Sparkles,
} from 'lucide-react';

export const SalaryStructuresPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Rule Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleCode, setRuleCode] = useState('');
  const [ruleCategory, setRuleCategory] = useState<any>('allowance');
  const [ruleSequence, setRuleSequence] = useState(25);
  const [ruleCompType, setRuleCompType] = useState<any>('percentage');
  const [ruleAmount, setRuleAmount] = useState<number>(0);
  const [rulePercentBase, setRulePercentBase] = useState('BASIC');
  const [rulePercent, setRulePercent] = useState<number>(10);
  const [ruleFormula, setRuleFormula] = useState('');

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
      if (structData.length > 0) {
        setSelectedStructure(structData[0]);
      }
    } catch {
      error('Failed to load salary structures');
    } finally {
      setIsLoading(false);
    }
  };

  const currentRules = rules
    .filter((r) => String(r.salaryStructureId) === String(selectedStructure?.id || 1))
    .sort((a, b) => a.sequence - b.sequence);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStructure) return;

    try {
      const created = await api.salaryRules.create({
        salaryStructureId: selectedStructure.id,
        name: ruleName,
        code: ruleCode.toUpperCase(),
        category: ruleCategory,
        sequence: ruleSequence,
        computationType: ruleCompType,
        amount: ruleCompType === 'fixed' ? ruleAmount : null,
        percentageBase: ruleCompType === 'percentage' ? rulePercentBase : null,
        percentage: ruleCompType === 'percentage' ? rulePercent : null,
        formula: ruleCompType === 'formula' ? ruleFormula : null,
        isActive: true,
      });

      success(`Rule "${created.code}" created and placed at sequence ${created.sequence}`);
      setIsRuleModalOpen(false);
      // Reset form
      setRuleName('');
      setRuleCode('');
      loadData();
    } catch {
      error('Error creating salary rule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Salary Structures & Rule Sequence
          </h2>
          <p className="text-xs text-slate-500">
            Ordered, sequenced salary computation rules executed during payrun runs (FR-07, FR-08).
          </p>
        </div>

        {hasRole('hr_payroll_manager') && (
          <button
            onClick={() => setIsRuleModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Salary Rule</span>
          </button>
        )}
      </div>

      {/* Grid: Structure Selector and Rules Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Structures */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Structures ({structures.length})
          </h3>
          <div className="space-y-2">
            {structures.map((s) => {
              const isSelected = selectedStructure?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStructure(s)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">{s.name}</h4>
                    <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {s.code || 'REG'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{s.description}</p>
                  <div className="mt-2 text-[11px] font-semibold text-slate-600">
                    {currentRules.length} Sequenced Rules
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Sequenced Rules Visualizer */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Rule Execution Order &mdash; {selectedStructure?.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rules execute strictly ascending by sequence. Later rules reference preceding rule codes.
              </p>
            </div>
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
              Active Rule Engine
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Seq</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Rule Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Computation Definition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {currentRules.map((rule) => {
                  let badgeColor = 'bg-slate-100 text-slate-700';
                  if (rule.category === 'basic') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                  if (rule.category === 'allowance') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (rule.category === 'gross') badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  if (rule.category === 'deduction') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  if (rule.category === 'net') badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';

                  return (
                    <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">
                        {rule.sequence}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {rule.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{rule.name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badgeColor}`}>
                          {rule.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-600 font-semibold">
                        {rule.computationType}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                        {rule.computationType === 'fixed' && `Fixed amount: ₹${rule.amount}`}
                        {rule.computationType === 'percentage' &&
                          `${rule.percentage}% of ${rule.percentageBase}`}
                        {rule.computationType === 'formula' && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-blue-700 font-bold">
                            {rule.formula}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Rule Modal */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title="Add Salary Rule"
        subtitle={`Add a new sequenced rule to ${selectedStructure?.name}`}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rule Name</label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. Special Allowance"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rule Code (Unique)
              </label>
              <input
                type="text"
                value={ruleCode}
                onChange={(e) => setRuleCode(e.target.value)}
                placeholder="e.g. SPEC_ALLOW"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={ruleCategory}
                onChange={(e) => setRuleCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="basic">Basic</option>
                <option value="allowance">Allowance</option>
                <option value="gross">Gross</option>
                <option value="deduction">Deduction</option>
                <option value="net">Net</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sequence Order (ASC)
              </label>
              <input
                type="number"
                value={ruleSequence}
                onChange={(e) => setRuleSequence(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Computation Method
            </label>
            <select
              value={ruleCompType}
              onChange={(e) => setRuleCompType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage of Another Rule</option>
              <option value="formula">Expression / Formula</option>
            </select>
          </div>

          {ruleCompType === 'fixed' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                value={ruleAmount}
                onChange={(e) => setRuleAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          )}

          {ruleCompType === 'percentage' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={rulePercent}
                  onChange={(e) => setRulePercent(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Percentage Base Rule Code
                </label>
                <input
                  type="text"
                  value={rulePercentBase}
                  onChange={(e) => setRulePercentBase(e.target.value)}
                  placeholder="e.g. BASIC"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
                  required
                />
              </div>
            </div>
          )}

          {ruleCompType === 'formula' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Formula Expression
              </label>
              <input
                type="text"
                value={ruleFormula}
                onChange={(e) => setRuleFormula(e.target.value)}
                placeholder="e.g. BASIC + HRA - PF"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Can reference codes of rules with lower sequence numbers.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRuleModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              Save Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
