import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AttendanceRecord, Employee, AttendanceStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Clock,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const { success, error } = useToast();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Manual Correction Modal
  // Manual Correction Modal
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionErrors, setCorrectionErrors] = useState<Record<string, string>>({});
  const [correctionCheckIn, setCorrectionCheckIn] = useState('');
  const [correctionCheckOut, setCorrectionCheckOut] = useState('');
  const [correctionStatus, setCorrectionStatus] = useState<AttendanceStatus>('present');
  const [correctionNote, setCorrectionNote] = useState('');

  // Quick Punch Modal / State
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [isSubmittingPunch, setIsSubmittingPunch] = useState(false);
  const [punchEmployeeId, setPunchEmployeeId] = useState<string>('');

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    setIsLoading(true);
    try {
      const [attData, empData] = await Promise.all([
        api.attendance.getAll(),
        api.employees.getAll(),
      ]);
      setRecords(attData);
      setEmployees(empData);
      if (empData.length > 0) {
        setPunchEmployeeId((prev) => prev || String(empData[0].id));
      }
    } catch {
      error('Failed to load attendance logs');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch = (r.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCorrectionModal = (rec: AttendanceRecord) => {
    setSelectedRecord(rec);
    setCorrectionCheckIn(rec.checkIn ? rec.checkIn.substring(11, 16) : '09:00');
    setCorrectionCheckOut(rec.checkOut ? rec.checkOut.substring(11, 16) : '18:00');
    setCorrectionStatus(rec.status);
    setCorrectionNote(rec.note || '');
    setCorrectionErrors({});
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    const errors: Record<string, string> = {};

    if (!correctionCheckIn) {
      errors.checkIn = 'Check-in time is required';
    }

    if (correctionCheckIn && correctionCheckOut) {
      const [inH, inM] = correctionCheckIn.split(':').map(Number);
      const [outH, outM] = correctionCheckOut.split(':').map(Number);
      if (outH * 60 + outM < inH * 60 + inM) {
        errors.checkOut = 'Check-out time cannot be earlier than check-in time';
      }
    }

    const cleanNote = correctionNote.trim();
    if (!cleanNote) {
      errors.note = 'Reason/justification is required for manual attendance corrections';
    } else if (cleanNote.length < 3) {
      errors.note = 'Reason must be at least 3 characters';
    }

    if (Object.keys(errors).length > 0) {
      setCorrectionErrors(errors);
      return;
    }

    setCorrectionErrors({});
    setIsSubmittingCorrection(true);

    try {
      const date = (selectedRecord.checkIn || new Date().toISOString()).slice(0, 10);
      const fullCheckIn = `${date}T${correctionCheckIn}:00Z`;
      const fullCheckOut = correctionCheckOut ? `${date}T${correctionCheckOut}:00Z` : null;

      await api.attendance.update(selectedRecord.id, {
        checkIn: fullCheckIn,
        checkOut: fullCheckOut,
        status: correctionStatus,
        note: cleanNote,
      });

      success(`Attendance for ${selectedRecord.employeeName} adjusted.`);
      setSelectedRecord(null);
      loadAttendance();
    } catch (err: any) {
      error(err.message || 'Failed to save manual adjustment');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const handleRecordNewPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!punchEmployeeId) {
      error('Please select an employee');
      return;
    }

    setIsSubmittingPunch(true);
    const emp = employees.find((em) => String(em.id) === String(punchEmployeeId));
    try {
      await api.attendance.create({
        employeeId: punchEmployeeId,
        employeeName: emp?.name,
        departmentName: emp?.department,
        checkIn: new Date().toISOString(),
        status: 'present',
      });
      success(`Check-in logged for ${emp?.name || 'employee'}`);
      setIsPunchModalOpen(false);
      loadAttendance();
    } catch (err: any) {
      error(err.message || 'Error logging attendance punch');
    } finally {
      setIsSubmittingPunch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Attendance Tracking
          </h2>
          <p className="text-xs text-slate-500">
            Daily clock-ins, worked hour calculations, and manual HR exceptions (FR-04).
          </p>
        </div>

        <button
          onClick={() => setIsPunchModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Clock className="w-4 h-4" />
          <span>Record Punch</span>
        </button>
      </div>

      {/* Exception Notification Alert */}
      {records.some((r) => !r.checkOut || r.status === 'absent') && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">Attendance Exceptions Detected</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              1 or more employees have missing check-out punches or unverified absences. Authorized HR
              Managers can provide manual adjustments below.
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee name or code..."
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
            <option value="all">All Attendance Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late Arrival</option>
            <option value="overtime">Overtime</option>
            <option value="absent">Missing Punch / Absent</option>
          </select>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Check In</th>
                <th className="py-3.5 px-4">Check Out</th>
                <th className="py-3.5 px-4">Worked Hours</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Source & Notes</th>
                {hasRole('hr_manager') && <th className="py-3.5 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-bold text-slate-900">{r.employeeName}</p>
                      <p className="text-[10px] text-slate-400">{r.departmentName}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {r.checkIn ? new Date(r.checkIn).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {r.checkIn ? (
                      <span className="font-mono">
                        {new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold">Missing</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {r.checkOut ? (
                      <span className="font-mono">
                        {new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold italic">Missing Check-Out</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-xs ${
                        (r.workedHours ?? 0) >= 8
                          ? 'bg-blue-50 text-blue-700'
                          : (r.workedHours ?? 0) > 0
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {r.workedHours ?? '-'} hrs
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="max-w-xs">
                      {r.isManual ? (
                        <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mb-1">
                          Manual Correction
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-medium text-slate-400">
                          Biometric Punch
                        </span>
                      )}
                      {r.note && (
                        <p className="text-[11px] text-slate-500 italic truncate">{r.note}</p>
                      )}
                    </div>
                  </td>
                  {hasRole('hr_manager') && (
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openCorrectionModal(r)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Adjust</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Correction Modal (HR Manager+) */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Manual Attendance Adjustment"
        subtitle={`Adjust clock times and status for ${selectedRecord?.employeeName} (is_manual=true)`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveCorrection} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Check In Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={correctionCheckIn}
                onChange={(e) => {
                  setCorrectionCheckIn(e.target.value);
                  if (correctionErrors.checkIn) setCorrectionErrors({ ...correctionErrors, checkIn: '' });
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  correctionErrors.checkIn ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none font-mono`}
                required
              />
              {correctionErrors.checkIn && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{correctionErrors.checkIn}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Check Out Time</label>
              <input
                type="time"
                value={correctionCheckOut}
                onChange={(e) => {
                  setCorrectionCheckOut(e.target.value);
                  if (correctionErrors.checkOut) setCorrectionErrors({ ...correctionErrors, checkOut: '' });
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  correctionErrors.checkOut ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none font-mono`}
              />
              {correctionErrors.checkOut && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{correctionErrors.checkOut}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select
              value={correctionStatus}
              onChange={(e) => setCorrectionStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="overtime">Overtime</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason / Justification Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={correctionNote}
              onChange={(e) => {
                setCorrectionNote(e.target.value);
                if (correctionErrors.note) setCorrectionErrors({ ...correctionErrors, note: '' });
              }}
              placeholder="e.g. Swapped card after reader maintenance"
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                correctionErrors.note ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
              } focus:ring-2 focus:ring-blue-500 outline-none`}
              required
            />
            {correctionErrors.note && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">{correctionErrors.note}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedRecord(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCorrection}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingCorrection ? 'Saving...' : 'Save Correction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Punch Modal */}
      <Modal
        isOpen={isPunchModalOpen}
        onClose={() => setIsPunchModalOpen(false)}
        title="Record Daily Attendance Punch"
        subtitle="Log real-time clock punch for employee"
        maxWidth="md"
      >
        <form onSubmit={handleRecordNewPunch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee</label>
            <select
              value={punchEmployeeId}
              onChange={(e) => setPunchEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-center justify-between">
            <span>Timestamp:</span>
            <span className="font-mono font-bold text-slate-900">{new Date().toLocaleString()}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPunchModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingPunch}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingPunch ? 'Recording...' : 'Record Punch Now'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
