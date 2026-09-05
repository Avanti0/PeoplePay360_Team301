import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Contract, Employee, SalaryStructure, WorkingSchedule } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Layers,
  FileSignature,
  Building2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const [contract, setContract] = useState<Contract | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [structure, setStructure] = useState<SalaryStructure | null>(null);
  const [schedule, setSchedule] = useState<WorkingSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const contracts = await api.contracts.getAll();
      const found = contracts.find((c) => String(c.id) === String(id)) || contracts[0];
      if (found) {
        setContract(found);
        const [employees, structures, schedules] = await Promise.all([
          api.employees.getAll(),
          api.salaryStructures.getAll(),
          api.workingSchedules.getAll(),
        ]);
        setEmployee(employees.find((e) => String(e.id) === String(found.employeeId)) || null);
        setStructure(structures.find((s) => String(s.id) === String(found.salaryStructureId)) || null);
        setSchedule(schedules.find((s) => String(s.id) === String(found.workingScheduleId)) || null);
      }
    } catch {
      error('Failed to load contract details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleStatusChange = async (newStatus: 'draft' | 'active' | 'expired' | 'cancelled') => {
    if (!contract) return;
    try {
      const updated = { ...contract, status: newStatus };
      setContract(updated);
      success(`Contract status updated to ${newStatus}`);
    } catch {
      error('Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <h3 className="text-base font-bold text-slate-800">Contract Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested contract #{id} does not exist.</p>
        <Link to="/contracts" className="mt-4 inline-block text-xs text-blue-600 font-bold hover:underline">
          &larr; Back to Contracts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/contracts')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Contracts
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Contract #{contract.id}
              </h2>
              <StatusBadge status={contract.status} />
            </div>
            <p className="text-xs text-slate-500">
              Employment agreement for {contract.employeeName}
            </p>
          </div>
        </div>

        {hasRole('hr_manager') && (
          <div className="flex items-center gap-2">
            {contract.status === 'draft' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('active')}
                icon={<ShieldCheck className="w-3.5 h-3.5" />}
              >
                Activate Contract
              </Button>
            )}
            {contract.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('expired')}
              >
                Mark Expired
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Contract Overview & Terms */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contract Agreement Terms</CardTitle>
              <CardDescription>Period validity and terms of employment (FR-02)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[11px] mb-1">Employee</span>
                  <span className="font-bold text-slate-900 text-sm">{contract.employeeName}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[11px] mb-1">Department & Role</span>
                  <span className="font-bold text-slate-900 text-sm">{contract.jobPosition || 'Software Engineer'}</span>
                  <span className="text-slate-500 block text-[10px] mt-0.5">{contract.department || 'Engineering'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[11px] mb-1">Start Date</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{contract.dateStart}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[11px] mb-1">End Date</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{contract.dateEnd || 'Open-Ended (Permanent)'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Salary & Compensation</CardTitle>
              <CardDescription>Assigned salary structure and gross wage resolution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                  <div>
                    <span className="text-blue-700 font-bold uppercase tracking-wider text-[10px] block">
                      Gross Annual Wage
                    </span>
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {formatCurrency(contract.wage)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px] block">Monthly Equivalent</span>
                    <span className="text-sm font-bold text-slate-800 font-mono">
                      {formatCurrency(Math.round(contract.wage / 12))}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px] block">Salary Structure</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {structure?.name || contract.salaryStructureName || 'Regular Salary'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px] block">Working Schedule</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {schedule?.name || contract.workingScheduleName || 'Standard 40h/week'}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {schedule?.weeklyHours ? `${schedule.weeklyHours} hrs/week` : '8 hrs/day'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Quick Info & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link
                  to={`/employees/${contract.employeeId}`}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <span>View Employee Profile</span>
                  <span className="text-slate-400">&rarr;</span>
                </Link>
                <Link
                  to="/salary-structures"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <span>View Salary Structure Rules</span>
                  <span className="text-slate-400">&rarr;</span>
                </Link>
                <Link
                  to="/working-schedules"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <span>View Schedule Lines</span>
                  <span className="text-slate-400">&rarr;</span>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance & Audit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Contract ID:</span>
                  <span className="font-mono font-bold">#{contract.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Created:</span>
                  <span>{contract.createdAt || '2026-09-01'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold capitalize text-slate-800">{contract.status}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
