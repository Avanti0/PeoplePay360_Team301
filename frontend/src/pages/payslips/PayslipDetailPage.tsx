import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Payslip } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  ArrowLeft,
  Printer,
  Download,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export const PayslipDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();
  const { error } = useToast();

  const isHR = hasRole('hr_manager');

  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadPayslip(id);
  }, [id, user]);

  const loadPayslip = async (slipId: string) => {
    setIsLoading(true);
    try {
      const data = await api.payslips.getById(slipId);
      if (!isHR && user?.employeeId && data.employeeId && String(data.employeeId) !== String(user.employeeId)) {
        error('Access denied: You can only view your own salary slips');
        navigate('/payslips');
        return;
      }
      setPayslip(data);
    } catch (err: any) {
      error(err.message || 'Failed to load payslip: Access denied');
      navigate('/payslips');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading || !payslip) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const earningsLines = payslip.lines
    ? payslip.lines.filter((l) => l.category === 'basic' || l.category === 'allowance')
    : [];

  const deductionLines = payslip.lines
    ? payslip.lines.filter((l) => l.category === 'deduction')
    : [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar (Hidden in Print) */}
      <div className="no-print flex items-center justify-between">
        <button
          onClick={() => navigate('/payslips')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Payslips</span>
        </button>

        <div className="flex items-center gap-3">
          <StatusBadge status={payslip.status} size="md" />
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Payslip Card (FR-10) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-md space-y-8 text-slate-900 print:border-none print:shadow-none print:p-0">
        {/* Company Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center">
              P3
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                PEOPLEPAY360 TECHNOLOGIES
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official Salary Statement & Earnings Voucher
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-500 mt-2">
              Period:{' '}
              <strong className="text-slate-800">
                {payslip.periodStart} &ndash; {payslip.periodEnd}
              </strong>
            </p>
          </div>
        </div>

        {/* Employee & Bank Info Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-5 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] block">
              Employee Name
            </span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {payslip.employeeName}
            </span>

          </div>

          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] block">
              Department & Role
            </span>
            <span className="font-bold text-slate-900 mt-0.5 block">
              {payslip.departmentName || 'Engineering'}
            </span>
            <span className="text-[11px] text-slate-500">
              {payslip.jobPositionTitle || 'Software Engineer'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] block">
              Bank Account Details
            </span>
            <span className="font-mono font-bold text-slate-900 mt-0.5 block">
              {payslip.bankAccountNumber || 'Account Pending'}
            </span>
            <span className="text-[11px] text-slate-500">{payslip.bankName || 'National Trust Bank'}</span>
          </div>

          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] block">
              Payable Days
            </span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {payslip.workedDays ?? 0} Days
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">
              {payslip.expectedWorkingDays != null
                ? `of ${payslip.expectedWorkingDays} expected per schedule`
                : 'No schedule assigned'}
            </span>
          </div>
        </div>

        {/* Itemized Line Items Table: Earnings & Deductions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700">
              <span>Earnings</span>
              <span>Amount (₹)</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {earningsLines.length > 0 ? (
                earningsLines.map((line) => (
                  <div key={line.id} className="px-4 py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-800">{line.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2">({line.code})</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(line.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2.5 flex justify-between items-center">
                  <span className="font-semibold text-slate-800">Gross Monthly Base</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(payslip.grossSalary)}
                  </span>
                </div>
              )}
            </div>
            <div className="bg-slate-50/60 border-t border-slate-200 px-4 py-3 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-800">Gross Earnings:</span>
              <span className="text-slate-900 font-mono font-black text-sm">
                {formatCurrency(payslip.grossSalary)}
              </span>
            </div>
          </div>

          {/* Deductions */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700">
              <span>Deductions</span>
              <span>Amount (₹)</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {deductionLines.length > 0 ? (
                deductionLines.map((line) => (
                  <div key={line.id} className="px-4 py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-800">{line.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2">({line.code})</span>
                    </div>
                    <span className="font-mono font-bold text-rose-600">
                      {formatCurrency(line.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2.5 flex justify-between items-center">
                  <span className="font-semibold text-slate-800">Statutory Deductions</span>
                  <span className="font-mono font-bold text-rose-600">
                    {formatCurrency(payslip.grossSalary - payslip.netSalary)}
                  </span>
                </div>
              )}
            </div>
            <div className="bg-slate-50/60 border-t border-slate-200 px-4 py-3 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-800">Total Deductions:</span>
              <span className="text-rose-600 font-mono font-black text-sm">
                {formatCurrency(payslip.grossSalary - payslip.netSalary)}
              </span>
            </div>
          </div>
        </div>

        {/* Net Salary Highlight Box */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-blue-300 font-bold block">
              Net Payable Amount
            </span>
            <div className="text-3xl font-black tracking-tight mt-1">
              {formatCurrency(payslip.netSalary)}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              (Gross Salary minus Statutory PF, Professional Tax, and TDS)
            </p>
          </div>

          <div className="text-right border-t sm:border-t-0 sm:border-l border-white/20 pt-3 sm:pt-0 sm:pl-6">
            <span className="text-xs text-slate-400 block">Transfer Status</span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mt-0.5">
              Direct Bank Deposit
            </span>
          </div>
        </div>

        {/* Signatures & Footer Notice */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-800">HR / Payroll Manager Verification</p>
            <p className="mt-1">Computer generated document signed under statutory regulations.</p>
            <div className="mt-6 border-b border-slate-300 w-48" />
            <span className="text-[10px] text-slate-400 mt-1 block">Authorized Signatory</span>
          </div>

          <div className="text-right">
            <p className="font-bold text-slate-800">Employee Acknowledgment</p>
            <p className="mt-1">Discrepancies must be raised within 7 working days.</p>
            <div className="mt-6 border-b border-slate-300 w-48 ml-auto" />
            <span className="text-[10px] text-slate-400 mt-1 block">Employee Signature</span>
          </div>
        </div>
      </div>
    </div>
  );
};
