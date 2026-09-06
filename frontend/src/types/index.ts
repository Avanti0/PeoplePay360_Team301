// =====================================================================
// PeoplePay360 Frontend Types & Interfaces
// Follows camelCase conventions while mapping to/from backend snake_case.
// Source of truth: docs/spec.md, docs/architecture.md, status.md, schema.sql
//
// department/jobPosition are plain free-text fields on Employee/Contract
// (see docs/modules/employee.md, contract.md) - there is no Department
// or JobPosition entity in the database. The Department/JobPosition
// interfaces below exist purely as a frontend-side reference list for
// populating dropdown options; they are not backed by a real table.
// =====================================================================

export type RoleName =
  | 'employee'
  | 'hr_manager'
  | 'hr_payroll_user'
  | 'hr_payroll_manager'
  | 'admin';

export type EmploymentStatus = 'active' | 'inactive' | 'on_leave';

export type ContractStatus = 'draft' | 'active' | 'expired' | 'cancelled';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'overtime';

export type TimeOffUnit = 'days' | 'hours';

export type AllocationStatus = 'draft' | 'confirmed' | 'approved' | 'refused';

export type TimeOffRequestStatus = 'draft' | 'confirmed' | 'approved' | 'refused';

export type SalaryRuleCategory = 'basic' | 'allowance' | 'gross' | 'deduction' | 'net';

export type ComputationType = 'fixed' | 'percentage' | 'formula';

export type PayrunStatus = 'draft' | 'computed' | 'validated' | 'paid';

export type PayslipStatus = 'draft' | 'computed' | 'validated' | 'paid';

export interface User {
  id: string;
  username: string;
  role: RoleName;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;
  email?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

// Frontend-only reference lists (not real backend entities - see file header).
export interface Department {
  id: string | number;
  name: string;
  code?: string;
  managerName?: string;
  employeeCount?: number;
}

export interface JobPosition {
  id: string | number;
  title: string;
  departmentName?: string;
}

export interface WorkingScheduleLine {
  id?: string;
  scheduleId?: string;
  dayOfWeek: number; // 0 = Monday ... 6 = Sunday
  isWorkingDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  breakMinutes: number;
}

export interface WorkingSchedule {
  id: string;
  name: string;
  isActive: boolean;
  weeklyHours?: number; // client-computed from lines, not a stored column
  lines: WorkingScheduleLine[];
  createdAt?: string;
}

export interface Employee {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  jobPosition?: string;
  managerId?: string | null;
  managerName?: string;
  workingScheduleId?: string | null;
  workingScheduleName?: string;
  roleName?: RoleName; // from the linked user account, if any
  employmentStatus: EmploymentStatus;
  bankAccountNumber?: string;
  bankName?: string;
  bankIfsc?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeePage {
  items: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AttendancePage {
  items: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AllocationPage {
  items: Allocation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimeOffRequestPage {
  items: TimeOffRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


export interface Contract {
  id: string;
  employeeId: string;
  employeeName?: string;
  dateStart: string;
  dateEnd?: string | null;
  wage: number;
  department?: string;
  jobPosition?: string;
  workingScheduleId?: string | null;
  workingScheduleName?: string;
  salaryStructureId?: string | null;
  salaryStructureName?: string;
  status: ContractStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  departmentName?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  workedHours?: number | null;
  status: AttendanceStatus;
  isManual: boolean;
  note?: string | null;
  expectedWorkingDay?: boolean | null; // derived from the employee's assigned working schedule
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeOffType {
  id: string;
  name: string;
  unit: TimeOffUnit;
  requiresAllocation: boolean;
  approvalRequired?: boolean;
  isActive: boolean;
}

export interface Allocation {
  id: string;
  employeeId: string;
  employeeName?: string;
  timeOffTypeId: string;
  timeOffTypeName?: string;
  numberOfDays: number;
  taken: number;
  remaining: number; // DB-generated (number_of_days - taken); read-only
  dateFrom: string;
  dateTo?: string | null;
  status: AllocationStatus;
  createdAt?: string;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  departmentName?: string;
  timeOffTypeId: string;
  timeOffTypeName?: string;
  allocationId?: string | null;
  dateFrom: string;
  dateTo: string;
  duration: number;
  status: TimeOffRequestStatus;
  note?: string | null;
  createdAt?: string;
}

export interface SalaryRule {
  id: string;
  salaryStructureId: string;
  name: string;
  code: string;
  category: SalaryRuleCategory;
  sequence: number;
  computationType: ComputationType;
  amount?: number | null;
  percentageBase?: string | null; // e.g. "BASIC"
  percentage?: number | null;
  formula?: string | null;
  isActive: boolean;
}

export interface SalaryStructure {
  id: string;
  name: string;
  isActive: boolean;
  rules?: SalaryRule[];
  rulesCount?: number;
  createdAt?: string;
}

export interface Payrun {
  id: string;
  name: string;
  salaryStructureId: string;
  salaryStructureName?: string;
  periodStart: string;
  periodEnd: string;
  status: PayrunStatus;
  employeeCount?: number;
  totalGross?: number;
  totalDeductions?: number;
  totalNet?: number;
  warningsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayslipLine {
  id: string;
  payslipId: string;
  salaryRuleId?: string | null;
  code: string;
  name: string;
  category: SalaryRuleCategory;
  sequence: number;
  amount: number;
}

export interface Payslip {
  id: string;
  payrunId: string;
  payrunName?: string;
  employeeId: string;
  employeeName?: string;
  departmentName?: string;
  jobPositionTitle?: string;
  bankAccountNumber?: string;
  bankName?: string;
  contractId?: string | null;
  periodStart: string;
  periodEnd: string;
  workedDays: number;
  expectedWorkingDays?: number | null; // derived from the employee's assigned working schedule
  grossSalary: number;
  netSalary: number;
  status: PayslipStatus;
  warnings?: string[]; // stored as JSONB list of warning strings (payroll.md)
  lines?: PayslipLine[];
  createdAt?: string;
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

export interface DashboardAlert {
  id: string;
  payslipId?: string;
  warningType: string;
  employeeId?: string;
  employeeName?: string;
  message: string;
}

// Bulk Contract Operations Types
export interface BulkFailureDetail {
  id: string;
  name: string;
  reason: string;
}

export interface BulkOperationResult {
  operation: string;
  total: number;
  successCount: number;
  failedCount: number;
  successIds: string[];
  failures: BulkFailureDetail[];
}

export interface BulkContractCreateData {
  employeeIds: string[];
  dateStart: string;
  dateEnd?: string | null;
  wage: number;
  department?: string;
  jobPosition?: string;
  workingScheduleId?: string | null;
  salaryStructureId?: string | null;
  status?: ContractStatus;
}

export interface BulkContractUpdateData {
  contractIds: string[];
  dateStart?: string;
  dateEnd?: string | null;
  wage?: number;
  department?: string;
  jobPosition?: string;
  workingScheduleId?: string | null;
  salaryStructureId?: string | null;
  status?: ContractStatus;
  updateDateStart?: boolean;
  updateDateEnd?: boolean;
  updateWage?: boolean;
  updateDepartment?: boolean;
  updateJobPosition?: boolean;
  updateWorkingScheduleId?: boolean;
  updateSalaryStructureId?: boolean;
  updateStatus?: boolean;
}

export interface BulkContractDeleteData {
  contractIds: string[];
}

export interface EmployeeAttendanceItem {
  id: string;
  checkIn?: string | null;
  checkOut?: string | null;
  workedHours?: number | null;
  status: string;
  isManual: boolean;
  note?: string | null;
  expectedWorkingDay?: boolean | null;
}

export interface LeaveAllocationSummary {
  id: string;
  timeOffTypeName: string;
  unit: string;
  allocatedDays: number;
  takenDays: number;
  remainingDays: number;
}

export interface EmployeeApprovedLeaveItem {
  id: string;
  timeOffTypeName: string;
  dateFrom: string;
  dateTo: string;
  duration: number;
  status: string;
  reason?: string | null;
}

export interface EmployeeWarningItem {
  id: string;
  title: string;
  message: string;
  warningType: string;
  severity: 'warning' | 'notice' | 'critical' | string;
  createdAt?: string | null;
  source: string;
  status: 'pending' | 'resolved' | string;
}

export interface EmployeeScheduleLineItem {
  dayOfWeek: number;
  dayName: string;
  isWorkingDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  breakMinutes: number;
  dailyHours: number;
}

export interface EmployeeScheduleSummary {
  scheduleId?: string | null;
  scheduleName: string;
  weeklyWorkingDays: number;
  totalWeeklyHours: number;
  lines: EmployeeScheduleLineItem[];
}

export interface EmployeePayslipSummaryItem {
  id: string;
  payrunId: string;
  periodStart: string;
  periodEnd: string;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: string;
  workedDays: number;
  expectedWorkingDays?: number | null;
}

export interface EmployeePayslipLineItem {
  name: string;
  code: string;
  category: string;
  amount: number;
}

export interface EmployeeSalarySummary {
  latestNetSalary: number;
  latestGrossSalary: number;
  latestDeductions: number;
  averageNetSalary: number;
  totalPayoutsCount: number;
  currency: string;
  bankName?: string | null;
  bankAccountMasked?: string | null;
  bankIfsc?: string | null;
  monthlyTrend: EmployeePayslipSummaryItem[];
  latestPayslipLines: EmployeePayslipLineItem[];
}

export interface EmployeeDashboardData {
  employee?: {
    id: string;
    name: string;
    email: string;
    department?: string;
    jobPosition?: string;
    employmentStatus: string;
  } | null;
  attendanceHealth: {
    attendanceHealthPercentage: number;
    totalRecords: number;
    presentDays: number;
    lateDays: number;
    absentOrOtherDays: number;
    totalHoursWorked: number;
  };
  recentAttendance: EmployeeAttendanceItem[];
  approvedLeaves: EmployeeApprovedLeaveItem[];
  leaveAllocations: LeaveAllocationSummary[];
  totalApprovedLeaveDays: number;
  warnings: EmployeeWarningItem[];
  schedule: EmployeeScheduleSummary;
  salary: EmployeeSalarySummary;
}
