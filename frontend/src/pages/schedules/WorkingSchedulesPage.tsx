import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { WorkingSchedule, WorkingScheduleLine, Employee } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import {
  CalendarDays,
  Clock,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  Users,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WorkingSchedulesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkingSchedule | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [lines, setLines] = useState<WorkingScheduleLine[]>(
    DAYS.map((_, i) => ({
      dayOfWeek: i,
      isWorkingDay: i < 5,
      startTime: i < 5 ? '09:00' : null,
      endTime: i < 5 ? '18:00' : null,
      breakMinutes: i < 5 ? 60 : 0,
    }))
  );

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const [data, empData] = await Promise.all([
        api.workingSchedules.getAll(),
        api.employees.getAll(),
      ]);
      setSchedules(data);
      setEmployees(empData);
      if (data.length > 0 && !selectedSchedule) {
        setSelectedSchedule(data[0]);
      }
    } catch {
      error('Failed to load working schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const assignedEmployees = (scheduleId: string) =>
    employees.filter((emp) => String(emp.workingScheduleId) === String(scheduleId));

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '';
    return timeStr.length >= 5 ? timeStr.slice(0, 5) : timeStr;
  };

  const calculateHoursForLine = (line: WorkingScheduleLine) => {
    if (!line.isWorkingDay || !line.startTime || !line.endTime) return 0;
    const [startH, startM] = line.startTime.split(':').map(Number);
    const [endH, endM] = line.endTime.split(':').map(Number);
    const totalMinutes = endH * 60 + endM - (startH * 60 + startM) - (line.breakMinutes || 0);
    return Math.max(0, totalMinutes / 60);
  };

  const calculateTotalWeeklyHours = (scheduleLines: WorkingScheduleLine[]) => {
    return scheduleLines.reduce((acc, line) => acc + calculateHoursForLine(line), 0);
  };

  const handleDayToggle = (dayIndex: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.dayOfWeek === dayIndex
          ? {
              ...l,
              isWorkingDay: !l.isWorkingDay,
              startTime: !l.isWorkingDay ? '09:00' : null,
              endTime: !l.isWorkingDay ? '18:00' : null,
              breakMinutes: !l.isWorkingDay ? 60 : 0,
            }
          : l
      )
    );
  };

  const handleLineChange = (
    dayIndex: number,
    field: keyof WorkingScheduleLine,
    value: any
  ) => {
    setLines((prev) =>
      prev.map((l) => (l.dayOfWeek === dayIndex ? { ...l, [field]: value } : l))
    );
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const cleanName = name.trim();
    if (!cleanName) {
      errors.name = 'Schedule name is required';
    } else if (cleanName.length < 2) {
      errors.name = 'Schedule name must be at least 2 characters';
    }

    const workingLines = lines.filter((l) => l.isWorkingDay);
    if (workingLines.length === 0) {
      errors.lines = 'Please select at least 1 working day for the schedule';
    } else {
      for (const line of workingLines) {
        const dayName = DAYS[line.dayOfWeek];
        if (!line.startTime || !line.endTime) {
          errors[`day_${line.dayOfWeek}`] = `${dayName}: Start time and End time are required`;
          break;
        }
        const [startH, startM] = line.startTime.split(':').map(Number);
        const [endH, endM] = line.endTime.split(':').map(Number);
        const totalMinutes = endH * 60 + endM - (startH * 60 + startM);
        if (totalMinutes <= 0) {
          errors[`day_${line.dayOfWeek}`] = `${dayName}: End time must be after Start time`;
          break;
        }
        if (line.breakMinutes < 0 || line.breakMinutes >= totalMinutes) {
          errors[`day_${line.dayOfWeek}`] = `${dayName}: Break must be between 0 and ${totalMinutes - 1} minutes`;
          break;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);
    const totalWeekly = calculateTotalWeeklyHours(lines);
    try {
      const created = await api.workingSchedules.create({
        name: cleanName,
        isActive: true,
        weeklyHours: totalWeekly,
        lines,
      });
      success(`Schedule "${created.name}" created with ${totalWeekly} hrs/week`);
      setIsCreateModalOpen(false);
      setName('');
      loadSchedules();
      setSelectedSchedule(created);
    } catch (err: any) {
      error(err.message || 'Error creating schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Working Schedules
          </h2>
          <p className="text-xs text-slate-500">
            Define weekly operating shift templates, break intervals, and computed hours (FR-03).
          </p>
        </div>

        {hasRole('hr_manager') && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Schedule</span>
          </button>
        )}
      </div>

      {/* Grid: Master List on left, Visualizer on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Configured Schedules ({schedules.length})
          </h3>

          <div className="space-y-2">
            {schedules.map((sched) => {
              const isSelected = selectedSchedule?.id === sched.id;
              return (
                <div
                  key={sched.id}
                  onClick={() => setSelectedSchedule(sched)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{sched.name}</span>
                    <span className="text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                      {sched.weeklyHours}h / wk
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {assignedEmployees(sched.id).length} assigned
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Schedule Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          {selectedSchedule ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{selectedSchedule.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Standard weekly timetable pattern and daily break allowances
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-blue-600">
                    {selectedSchedule.weeklyHours}
                  </span>
                  <span className="text-xs text-slate-500 block font-medium">Hours / Week</span>
                </div>
              </div>

              {/* Day by Day Visual Breakdown */}
              <div className="space-y-3">
                {DAYS.map((dayName, idx) => {
                  const line = selectedSchedule.lines?.find((l) => l.dayOfWeek === idx);
                  const isWorking = line?.isWorkingDay;
                  const dailyHours = line ? calculateHoursForLine(line) : 0;

                  return (
                    <div
                      key={dayName}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isWorking
                          ? 'border-slate-200 bg-white'
                          : 'border-dashed border-slate-200 bg-slate-50/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 w-36">
                        <Calendar className={`w-4 h-4 ${isWorking ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-800">{dayName}</span>
                      </div>

                      {isWorking ? (
                        <div className="flex items-center gap-6 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {formatTime(line?.startTime)} &ndash; {formatTime(line?.endTime)}
                            </span>
                          </div>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-500">{line?.breakMinutes || 0}m break</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 italic">Rest Day</span>
                      )}

                      <div className="w-20 text-right">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            isWorking
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {dailyHours > 0 ? `${Number(dailyHours.toFixed(2))} hrs` : '0 hrs'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Assigned Employees (FR: Working Schedule <-> Employee integration) */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Assigned Employees ({assignedEmployees(selectedSchedule.id).length})
                </h4>
                {assignedEmployees(selectedSchedule.id).length === 0 ? (
                  <p className="text-xs text-slate-400">No employees are currently assigned to this schedule.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {assignedEmployees(selectedSchedule.id).map((emp) => (
                      <Link
                        key={emp.id}
                        to={`/employees/${emp.id}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
                      >
                        {emp.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <CalendarDays className="w-8 h-8 mb-2" />
              <p className="text-sm font-medium">Select a working schedule to inspect weekly lines</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Schedule Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Working Schedule"
        subtitle="Specify weekly pattern, working days, timings, and breaks"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Schedule Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                placeholder="e.g. Standard Shift A (Mon-Fri)"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  formErrors.name ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
                required
              />
              {formErrors.name && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">{formErrors.name}</p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Weekly Days & Hours Pattern
              </label>
              {formErrors.lines && (
                <p className="text-[11px] font-semibold text-rose-600">{formErrors.lines}</p>
              )}
            </div>
            {Object.keys(formErrors)
              .filter((k) => k.startsWith('day_'))
              .map((k) => (
                <p key={k} className="text-[11px] font-semibold text-rose-600 mb-2">
                  {formErrors[k]}
                </p>
              ))}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {DAYS.map((dayName, idx) => {
                const line = lines[idx];
                return (
                  <div
                    key={dayName}
                    className="flex items-center gap-3 p-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <div className="w-28 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={line.isWorkingDay}
                        onChange={() => handleDayToggle(idx)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-800">{dayName}</span>
                    </div>

                    {line.isWorkingDay ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="time"
                          value={line.startTime || '09:00'}
                          onChange={(e) => handleLineChange(idx, 'startTime', e.target.value)}
                          className="px-2 py-1 rounded border border-slate-300 text-xs"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="time"
                          value={line.endTime || '18:00'}
                          onChange={(e) => handleLineChange(idx, 'endTime', e.target.value)}
                          className="px-2 py-1 rounded border border-slate-300 text-xs"
                        />
                        <span className="text-slate-400 ml-2">Break:</span>
                        <input
                          type="number"
                          min="0"
                          value={line.breakMinutes}
                          onChange={(e) =>
                            handleLineChange(idx, 'breakMinutes', Number(e.target.value))
                          }
                          className="w-16 px-2 py-1 rounded border border-slate-300 text-xs"
                          placeholder="Mins"
                        />
                        <span className="text-[11px] text-slate-400">mins</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Off</span>
                    )}

                    <span className="w-16 text-right font-bold text-blue-600">
                      {calculateHoursForLine(line)}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-xs">
              <span className="text-slate-500">Computed Total: </span>
              <span className="font-black text-slate-900 text-sm">
                {calculateTotalWeeklyHours(lines)} hrs/week
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
