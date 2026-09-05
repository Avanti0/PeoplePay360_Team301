import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { SalaryStructure, SalaryRule } from '../../types';
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
} from 'lucide-react';

export const SalaryRulesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Rule Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleStructureId, setRuleStructureId] = useState<string>('1');
  const [ruleName, setRuleName] = useState('');
  const [ruleCode, setRuleCode] = useState('');
  const [ruleCategory, setRuleCategory] = useState<any>('allowance');
  const [ruleSequence, setRuleSequence] = useState(30);
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
    } catch {
      error('Failed to load salary rules');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRules = rules.filter((r) => {
    const matchesStruct =
      selectedStructureId === 'all' || String(r.salaryStructureId) === String(selectedStructureId);
    const matchesCat = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesSearch =
      (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.code || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStruct && matchesCat && matchesSearch;
  });

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.salaryRules.create({
        salaryStructureId: ruleStructureId,
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

      success(`Rule "${created.code}" created at sequence ${created.sequence}`);
      setIsRuleModalOpen(false);
      setRuleName('');
      setRuleCode('');
      loadData();
    } catch {
      error('Error creating salary rule');
    }
  };

  const getStructureName = (structureId: number | string) => {
    const found = structures.find((s) => String(s.id) === String(structureId));
    return found ? found.name : `Structure #${structureId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Salary Computation Rules
          </h2>
          <p className="text-xs text-slate-500">
            Rule engine library with sequence-based precedence and formula dependencies (FR-07, FR-08).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/salary-structures">
            <Button variant="outline" size="sm" icon={<Layers className="w-4 h-4" />}>
              Salary Structures
            </Button>
          </Link>
          {hasRole('hr_payroll_manager') && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRuleModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Salary Rule
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search rule name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedStructureId}
            onChange={(e) => setSelectedStructureId(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Structures</option>
            {structures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Categories</option>
            <option value="basic">Basic</option>
            <option value="allowance">Allowance</option>
            <option value="gross">Gross</option>
            <option value="deduction">Deduction</option>
            <option value="net">Net</option>
          </select>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3.5 px-4">Sequence</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Rule Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Assigned Structure</th>
                <th className="py-3.5 px-4">Computation Method</th>
                <th className="py-3.5 px-4">Formula / Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRules.map((rule) => {
                let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
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
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badgeColor}`}>
                        {rule.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {getStructureName(rule.salaryStructureId)}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600 font-semibold">
                      {rule.computationType}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                      {rule.computationType === 'fixed' && `Fixed: ₹${rule.amount}`}
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

      {/* Add Rule Modal */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title="Add Salary Rule"
        subtitle="Create a new salary computation rule for payrun execution"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Structure</label>
            <select
              value={ruleStructureId}
              onChange={(e) => setRuleStructureId(e.target.value)}
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Rule Name</label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. Provident Fund Deduction"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rule Code</label>
              <input
                type="text"
                value={ruleCode}
                onChange={(e) => setRuleCode(e.target.value)}
                placeholder="e.g. PF_DED"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Sequence</label>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Computation Method</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Base Rule Code</label>
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Formula Expression</label>
              <input
                type="text"
                value={ruleFormula}
                onChange={(e) => setRuleFormula(e.target.value)}
                placeholder="e.g. BASIC + HRA - PF"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                required
              />
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
