import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Payslip } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Receipt,
  Search,
  Calendar,
  DollarSign,
  Printer,
  ChevronRight,
} from 'lucide-react';

export const PayslipsPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayslips();
  }, []);

  const loadPayslips = async () => {
    setIsLoading(true);
    try {
      const data = await api.payslips.getAll();
      setPayslips(data);
    } catch {
      error('Failed to load payslips');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayslips = payslips.filter((slip) => {
    const matchesSearch =
      (slip.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (slip.employeeCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (slip.payrunName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || slip.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Employee Payslips
          </h2>
          <p className="text-xs text-slate-500">
            Computed salary breakdowns, rule line items, and print/PDF distribution (FR-10).
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee, code, or payrun..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Payslip Statuses</option>
            <option value="paid">Paid</option>
            <option value="validated">Validated</option>
            <option value="computed">Computed</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Payrun Reference</th>
                <th className="py-3.5 px-4">Period</th>
                <th className="py-3.5 px-4">Gross Salary</th>
                <th className="py-3.5 px-4">Deductions</th>
                <th className="py-3.5 px-4">Net Salary</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredPayslips.map((slip) => (
                <tr
                  key={slip.id}
                  onClick={() => navigate(`/payslips/${slip.id}`)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{slip.employeeName}</p>
                    <p className="text-[10px] text-slate-400">{slip.employeeCode}</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-semibold">
                    {slip.payrunName || 'Regular Payrun'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {slip.periodStart} &rarr; {slip.periodEnd}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {formatCurrency(slip.grossSalary)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-rose-600">
                    {formatCurrency(slip.totalDeductions)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-blue-600 text-sm">
                      {formatCurrency(slip.netSalary)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={slip.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
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
