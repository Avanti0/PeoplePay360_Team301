// =====================================================================
// PeoplePay360 Frontend Types & Interfaces
// Follows camelCase conventions while mapping to/from backend snake_case.
// Source of truth: docs/spec.md, docs/architecture.md, status.md, schema.sql
// =====================================================================

export type RoleName = 
  | 'employee'
  | 'hr_manager'
  | 'hr_payroll_user'
  | 'hr_payroll_manager'
  | 'admin';

export type EmploymentStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

export type ContractStatus = 'draft' | 'active' | 'running' | 'expired' | 'cancelled';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'overtime' | 'half_day' | 'on_leave';

export type TimeOffUnit = 'days' | 'hours';

export type AllocationStatus = 'draft' | 'confirmed' | 'approved' | 'refused';

export type TimeOffRequestStatus = 'draft' | 'confirmed' | 'submitted' | 'approved' | 'refused' | 'cancelled';

export type SalaryRuleCategory = 'basic' | 'allowance' | 'gross' | 'deduction' | 'net' | 'other';

export type ComputationMethod = 'fixed' | 'percentage' | 'formula';

export type PayrunStatus = 'draft' | 'computed' | 'validated' | 'paid';

export type PayslipStatus = 'draft' | 'computed' | 'validated' | 'paid';

export interface User {
  id: string | number;
  username: string;
  role: RoleName;
  employeeId?: string | number;
  employeeName?: string;
  email?: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface Department {
  id: string | number;
  name: string;
  code?: string;
  managerId?: string | number;
  managerName?: string;
  employeeCount?: number;
  createdAt?: string;
}

export interface JobPosition {
  id: string | number;
  title: string;
  departmentId?: string | number;
  departmentName?: string;
  createdAt?: string;
}

export interface WorkingScheduleLine {
  id?: string | number;
  scheduleId?: string | number;
  dayOfWeek: number; // 0 = Monday ... 6 = Sunday
  isWorkingDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  breakMinutes: number;
}

export interface WorkingSchedule {
  id: string | number;
  name: string;
  scheduleType: 'full_time' | 'part_time' | 'shift';
  isActive: boolean;
  weeklyHours: number;
  lines: WorkingScheduleLine[];
  createdAt?: string;
}

export interface Employee {
  id: string | number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  name?: string; // computed helper
  email: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  dateJoined: string;
  departmentId?: string | number;
  departmentName?: string;
  jobPositionId?: string | number;
  jobTitle?: string;
  managerId?: string | number;
  managerName?: string;
  workingScheduleId?: string | number;
  workingScheduleName?: string;
  roleId?: string | number;
  roleName?: RoleName;
  employmentStatus: EmploymentStatus;
  bankAccountNumber?: string;
  bankName?: string;
  bankIfsc?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contract {
  id: string | number;
  employeeId: string | number;
  employeeName?: string;
  employeeCode?: string;
  dateStart: string; // matches status.md date_start
  dateEnd?: string | null; // matches status.md date_end
  wage: number;
  departmentId?: string | number;
  departmentName?: string;
  jobPositionId?: string | number;
  jobPositionTitle?: string;
  workingScheduleId?: string | number;
  workingScheduleName?: string;
  salaryStructureId?: string | number;
  salaryStructureName?: string;
  employmentType?: 'permanent' | 'contract' | 'intern';
  status: ContractStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string | number;
  employeeId: string | number;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  workDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  workedHours: number;
  status: AttendanceStatus;
  isManual: boolean; // matches status.md / is_manual_correction
  correctedBy?: string | number | null;
  correctedByName?: string;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeOffType {
  id: string | number;
  name: string;
  unit: TimeOffUnit;
  requiresAllocation: boolean;
  affectsPayroll?: boolean;
  approvalRequired?: boolean;
  isActive: boolean;
}

export interface Allocation {
  id: string | number;
  employeeId: string | number;
  employeeName?: string;
  employeeCode?: string;
  timeOffTypeId: string | number;
  timeOffTypeName?: string;
  numberOfDays: number; // matches status.md number_of_days / allocated_amount
  taken: number; // matches status.md taken
  remaining: number; // matches status.md remaining
  dateFrom: string; // matches status.md date_from / valid_from
  dateTo?: string | null; // matches status.md date_to / valid_to
  status: AllocationStatus;
  approvedBy?: string | number | null;
  approvedByName?: string;
  createdAt?: string;
}

export interface TimeOffRequest {
  id: string | number;
  employeeId: string | number;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  timeOffTypeId: string | number;
  timeOffTypeName?: string;
  allocationId?: string | number | null;
  dateFrom: string; // matches status.md / start_date
  dateTo: string; // matches status.md / end_date
  duration: number;
  status: TimeOffRequestStatus;
  note?: string | null;
  reason?: string | null;
  approvedBy?: string | number | null;
  approvedByName?: string;
  approvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalaryRule {
  id: string | number;
  salaryStructureId: string | number;
  name: string;
  code: string;
  category: SalaryRuleCategory;
  sequence: number;
  computationType: ComputationMethod;
  amount?: number | null;
  percentageBase?: string | null; // e.g. "BASIC"
  percentage?: number | null;
  formula?: string | null;
  isActive: boolean;
}

export interface SalaryStructure {
  id: string | number;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  rules?: SalaryRule[];
  rulesCount?: number;
  createdAt?: string;
}

export interface Payrun {
  id: string | number;
  name: string;
  salaryStructureId: string | number;
  salaryStructureName?: string;
  periodStart: string; // matches status.md period_start
  periodEnd: string; // matches status.md period_end
  status: PayrunStatus;
  employeeCount?: number;
  totalGross?: number;
  totalDeductions?: number;
  totalNet?: number;
  warningsCount?: number;
  createdBy?: string | number;
  computedAt?: string | null;
  validatedAt?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayslipLine {
  id: string | number;
  payslipId: string | number;
  salaryRuleId?: string | number;
  code: string;
  name: string;
  category: SalaryRuleCategory;
  sequence: number;
  amount: number;
}

export interface PayrollWarning {
  id: string | number;
  payslipId: string | number;
  employeeId?: string | number;
  employeeName?: string;
  warningType: string;
  message: string;
  createdAt?: string;
}

export interface Payslip {
  id: string | number;
  payrunId: string | number;
  payrunName?: string;
  employeeId: string | number;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  jobPositionTitle?: string;
  bankAccountNumber?: string;
  bankName?: string;
  contractId?: string | number;
  periodStart: string;
  periodEnd: string;
  workedDays: number;
  grossSalary: number; // matches status.md gross_salary
  totalDeductions: number;
  netSalary: number; // matches status.md net_salary
  status: PayslipStatus;
  warnings?: (string | PayrollWarning)[];
  lines?: PayslipLine[];
  pdfPath?: string | null;
  emailedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardKPIs {
  totalNetSalaryPaid: number;
  payslipsGenerated: number;
  averageSalary: number;
  approvedTimeOffDays: number;
  attendanceHealthPercentage: number;
  activeEmployeesCount: number;
  pendingLeaveRequestsCount: number;
  unresolvedWarningsCount: number;
}

export interface DepartmentSalaryCost {
  department: string;
  cost: number;
  employeeCount: number;
}

export interface MonthlySalaryTrend {
  month: string;
  gross: number;
  net: number;
  deductions: number;
}
