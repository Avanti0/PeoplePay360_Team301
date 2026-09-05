import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Payrun, Payslip } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  ArrowLeft,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Mail,
  AlertTriangle,
  Receipt,
  FileText,
  Lock,
  DollarSign,
  Calendar,
} from 'lucide-react';

export const PayrunDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, error, warning } = useToast();

  const [payrun, setPayrun] = useState<Payrun | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (payrunId: string) => {
    setIsLoading(true);
    try {
      const [pRun, pSlips] = await Promise.all([
        api.payruns.getById(payrunId),
        api.payslips.getAll(payrunId),
      ]);
      setPayrun(pRun);
      setPayslips(pSlips);
    } catch {
      error('Failed to load payrun details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompute = async () => {
    if (!payrun) return;
    setIsProcessing(true);
    try {
      const updated = await api.payruns.compute(payrun.id);
      setPayrun(updated);
      const newSlips = await api.payslips.getAll(payrun.id);
      setPayslips(newSlips);
      success('Payrun computed! Generated itemized payslips from resolved contracts (FR-09).');
    } catch {
      error('Computation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidate = async () => {
    if (!payrun) return;
    setIsProcessing(true);
    try {
      const updated = await api.payruns.validate(payrun.id);
      setPayrun(updated);
      const newSlips = await api.payslips.getAll(payrun.id);
      setPayslips(newSlips);
      success('Payrun validated and confirmed by HR Payroll Manager.');
    } catch {
      error('Validation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!payrun) return;
    setIsProcessing(true);
    try {
      const updated = await api.payruns.markPaid(payrun.id);
      setPayrun(updated);
      const newSlips = await api.payslips.getAll(payrun.id);
      setPayslips(newSlips);
      success('Payrun finalized and marked as PAID. All records locked as immutable historical data (NFR-05).');
    } catch {
      error('Mark paid failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendPayslips = async () => {
    if (!payrun) return;
    setIsProcessing(true);
    try {
      const res = await api.payruns.sendPayslips(payrun.id);
      success(`Successfully queued ${res.count} payslips for email dispatch.`);
      loadData(String(payrun.id));
    } catch {
      error('Failed sending payslips');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading || !payrun) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDraft = payrun.status === 'draft';
  const isComputed = payrun.status === 'computed';
  const isValidated = payrun.status === 'validated';
  const isPaid = payrun.status === 'paid';

  // Extract warnings from payslips
  const payslipWarnings = payslips.filter((s) => s.warnings && s.warnings.length > 0);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/payruns')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Payruns List</span>
        </button>

        {isPaid && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Immutable Historical Record</span>
          </span>
        )}
      </div>

      {/* Payrun Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-slate-900">{payrun.name}</h2>
              <StatusBadge status={payrun.status} size="md" />
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Structure: <span className="text-slate-900">{payrun.salaryStructureName || 'Regular Salary'}</span> &bull; Period:{' '}
              <span className="text-slate-900">{payrun.periodStart}</span> to{' '}
              <span className="text-slate-900">{payrun.periodEnd}</span>
            </p>
          </div>

          {/* Lifecycle Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isDraft && hasRole('hr_payroll_user') && (
              <button
                onClick={handleCompute}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Calculator className="w-4 h-4" />
                <span>{isProcessing ? 'Computing...' : 'Compute Payslips'}</span>
              </button>
            )}

            {isComputed && hasRole('hr_payroll_manager') && (
              <button
                onClick={handleValidate}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isProcessing ? 'Validating...' : 'Validate Payrun'}</span>
              </button>
            )}

            {isValidated && hasRole('hr_payroll_manager') && (
              <button
                onClick={handleMarkPaid}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isProcessing ? 'Finalizing...' : 'Mark as Paid'}</span>
              </button>
            )}

            {(isValidated || isPaid) && hasRole('hr_payroll_manager') && (
              <button
                onClick={handleSendPayslips}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Bulk Email Payslips</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Net Salary</span>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {formatCurrency(payrun.totalNet || 0)}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Gross Total</span>
            <p className="text-xl font-bold text-slate-800 mt-0.5">
              {formatCurrency(payrun.totalGross || 0)}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Deductions</span>
            <p className="text-xl font-bold text-rose-600 mt-0.5">
              {formatCurrency(payrun.totalDeductions || 0)}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Payslips Count</span>
            <p className="text-xl font-bold text-blue-600 mt-0.5">
              {payslips.length} generated
            </p>
          </div>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {payslipWarnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Pre-Validation Warnings Flagged ({payslipWarnings.length})</span>
          </div>
          <div className="space-y-1.5">
            {payslipWarnings.map((s) => (
              <div key={s.id} className="text-xs text-amber-800 flex items-center gap-2">
                <span className="font-bold">{s.employeeName}:</span>
                <span>
                  {Array.isArray(s.warnings) ? s.warnings.join('; ') : 'Missing details'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payslips Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Generated Payslips ({payslips.length})
          </h3>
          <span className="text-xs text-slate-400">Click any payslip to inspect line items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Position</th>
                <th className="py-3 px-4">Days</th>
                <th className="py-3 px-4">Gross</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Net Salary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {payslips.map((slip) => (
                <tr
                  key={slip.id}
                  onClick={() => navigate(`/payslips/${slip.id}`)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-bold text-slate-900">{slip.employeeName}</p>
                      <p className="text-[10px] text-slate-400">{slip.departmentName}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{slip.jobPositionTitle || 'Staff'}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{slip.workedDays}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    {formatCurrency(slip.grossSalary)}
                  </td>
                  <td className="py-3 px-4 font-bold text-rose-600">
                    {formatCurrency(slip.grossSalary - slip.netSalary)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-extrabold text-blue-600 text-sm">
                      {formatCurrency(slip.netSalary)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={slip.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-blue-600 font-bold text-xs inline-flex items-center gap-1">
                      View Slip &rarr;
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
