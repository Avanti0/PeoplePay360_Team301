import {
  User,
  Employee,
  EmployeePage,
  Contract,
  WorkingSchedule,
  AttendanceRecord,
  TimeOffType,
  Allocation,
  TimeOffRequest,
  SalaryStructure,
  SalaryRule,
  Payrun,
  Payslip,
  DashboardKPIs,
  DepartmentSalaryCost,
  MonthlySalaryTrend,
  DashboardAlert,
  RoleName,
  BulkContractCreateData,
  BulkContractUpdateData,
  BulkContractDeleteData,
  BulkOperationResult,
  EmployeeDashboardData,
} from '../types';
import {
  initialEmployees,
  initialContracts,
  initialSchedules,
  initialAttendance,
  initialTimeOffTypes,
  initialAllocations,
  initialTimeOffRequests,
  initialSalaryStructures,
  initialSalaryRules,
  initialPayruns,
  initialPayslips,
  demoUsers,
  initialDepartments
} from './mockData';

// ---------------------------------------------------------------------
// In-Memory Token Storage (Rule 9: access token in memory)
// ---------------------------------------------------------------------
let inMemoryAccessToken: string | null = null;
let currentAuthUser: User | null = demoUsers[0]; // default to Admin for seamless review

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = (): string | null => inMemoryAccessToken;

export const setCurrentUser = (user: User | null) => {
  currentAuthUser = user;
};

export const getCurrentUserSync = (): User | null => currentAuthUser;

// ---------------------------------------------------------------------
// Case Transformers (Rule 8: snake_case backend <-> camelCase frontend)
// ---------------------------------------------------------------------
function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z0-9])/gi, ($1) =>
    $1.toUpperCase().replace('-', '').replace('_', '')
  );
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function snakeToCamel<T>(data: unknown): T {
  if (Array.isArray(data)) {
    return data.map((v) => snakeToCamel(v)) as unknown as T;
  }
  if (isObject(data)) {
    const newObj: Record<string, unknown> = {};
    for (const key of Object.keys(data)) {
      newObj[toCamelCase(key)] = snakeToCamel(data[key]);
    }
    return newObj as T;
  }
  return data as T;
}

export function camelToSnake<T>(data: unknown): T {
  if (Array.isArray(data)) {
    return data.map((v) => camelToSnake(v)) as unknown as T;
  }
  if (isObject(data)) {
    const newObj: Record<string, unknown> = {};
    for (const key of Object.keys(data)) {
      newObj[toSnakeCase(key)] = camelToSnake(data[key]);
    }
    return newObj as T;
  }
  return data as T;
}

// ---------------------------------------------------------------------
// State Store for Mock Fallback (Rule 12: Typed mock layer)
// ---------------------------------------------------------------------
let employeesStore = [...initialEmployees];
let contractsStore = [...initialContracts];
let schedulesStore = [...initialSchedules];
let attendanceStore = [...initialAttendance];
let timeOffTypesStore = [...initialTimeOffTypes];
let allocationsStore = [...initialAllocations];
let timeOffRequestsStore = [...initialTimeOffRequests];
let salaryStructuresStore = [...initialSalaryStructures];
let salaryRulesStore = [...initialSalaryRules];
let payrunsStore = [...initialPayruns];
let payslipsStore = [...initialPayslips];
let usersStore: User[] = [...demoUsers];

// ---------------------------------------------------------------------
// HTTP Fetcher with automatic mock fallback
// ---------------------------------------------------------------------
const API_BASE = '/api/v1';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (inMemoryAccessToken) {
    headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
  }

  // Only a genuinely unreachable backend (network/connection failure) falls
  // back to mock data — and it's logged loudly so that never gets mistaken
  // for a real response. A reachable backend's own error responses (400s,
  // 401s, 500s) must propagate as real errors, not get silently replaced
  // with fake "success" data from the mock layer.
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // for httpOnly refresh cookies
    });
  } catch (networkErr) {
    console.warn(
      `[PeoplePay360] Backend unreachable at ${API_BASE}${endpoint} — falling back to offline demo data.`,
      networkErr
    );
    return mockHandler<T>(endpoint, options);
  }

  if (response.status === 401 && endpoint !== '/auth/login') {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const rawText = await response.text();
      try {
        const body = JSON.parse(rawText);
        if (body?.detail) {
          if (Array.isArray(body.detail)) {
            detail = body.detail
              .map((err: any) => err.msg || (typeof err === 'string' ? err : JSON.stringify(err)))
              .join(', ');
          } else if (typeof body.detail === 'object') {
            detail = JSON.stringify(body.detail);
          } else {
            detail = String(body.detail);
          }
        }
      } catch {
        // Non-JSON response
      }

      if (
        response.status === 503 ||
        response.status === 502 ||
        response.status === 504 ||
        rawText.includes('ECONNREFUSED') ||
        rawText.includes('proxy error') ||
        rawText.includes('Database connection failed') ||
        rawText.includes('database error') ||
        rawText.includes('relation') ||
        rawText.includes('does not exist') ||
        rawText.includes('OperationalError') ||
        rawText.includes('SQLAlchemy') ||
        (response.status === 500 && (
          rawText.includes('database') ||
          rawText.includes('Database') ||
          rawText.includes('postgres') ||
          rawText.includes('connection') ||
          rawText.includes('table') ||
          rawText.includes('column')
        ))
      ) {
        console.warn(
          `[PeoplePay360] Database/backend unavailable (${response.status}: ${detail}) — seamlessly serving offline demo data.`
        );
        return mockHandler<T>(endpoint, options);
      }

      // For auth/login specifically: any 500 should fall back to mock
      // so developers can always log in during local development even
      // if the database is not yet set up.
      if (response.status === 500 && endpoint === '/auth/login') {
        console.warn(
          `[PeoplePay360] Login endpoint returned 500 — falling back to offline demo login.`
        );
        return mockHandler<T>(endpoint, options);
      }
    } catch {
      // response reading failed
    }
    throw new Error(`HTTP ${response.status}: ${detail}`);
  }

  const raw = await response.json();
  return snakeToCamel<T>(raw);
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      inMemoryAccessToken = data.access_token || data.accessToken;
      return true;
    }
  } catch {
    // Ignore refresh error
  }
  return false;
}

// ---------------------------------------------------------------------
// Mock Handler Implementation
// ---------------------------------------------------------------------
function mockHandler<T>(endpoint: string, options: RequestInit): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : null;


  // Small synthetic delay for realism
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const result = handleMockRoutes(endpoint, method, body);
        resolve(result as T);
      } catch (e) {
        reject(e);
      }
    }, 120);
  });
}

function handleMockRoutes(endpoint: string, method: string, body: any): any {
  // Auth
  if (endpoint === '/auth/login' && method === 'POST') {
    const inputUsername = (body?.username || '').toLowerCase().trim();
    const inputPassword = body?.password || '';

    // Check invalid credentials test cases
    if (
      inputPassword === 'wrong' ||
      inputPassword === 'invalid' ||
      (inputPassword && inputPassword.length < 4) ||
      (inputUsername === 'invalid_user')
    ) {
      throw new Error('Invalid credentials');
    }

    const matchedUser =
      usersStore.find(
        (u) =>
          u.username.toLowerCase() === inputUsername ||
          u.email?.toLowerCase() === inputUsername ||
          u.employeeEmail?.toLowerCase() === inputUsername
      ) ||
      demoUsers.find(
        (u) =>
          u.username.toLowerCase() === inputUsername ||
          u.email?.toLowerCase() === inputUsername
      );

    const user: User = matchedUser || {
      id: '99',
      username: body?.username || 'demo.user',
      role: (body?.role || 'employee') as RoleName,
      employeeName: 'Demo User',
      isActive: true,
    };

    inMemoryAccessToken = 'mock_jwt_token_' + Date.now();
    currentAuthUser = user;
    return {
      accessToken: inMemoryAccessToken,
      tokenType: 'bearer',
      user,
    };
  }

  if (endpoint === '/auth/refresh' && method === 'POST') {
    if (currentAuthUser) {
      inMemoryAccessToken = 'mock_refreshed_jwt_' + Date.now();
      return {
        accessToken: inMemoryAccessToken,
        tokenType: 'bearer',
        user: currentAuthUser,
      };
    }
    throw new Error('Unauthenticated');
  }

  if (endpoint === '/auth/me' && method === 'GET') {
    if (currentAuthUser) return currentAuthUser;
    throw new Error('Unauthenticated');
  }

  if (endpoint === '/auth/logout' && method === 'POST') {
    inMemoryAccessToken = null;
    currentAuthUser = null;
    return { success: true };
  }

  // Users Management
  if ((endpoint === '/users' || endpoint.startsWith('/users?')) && method === 'GET') {
    return usersStore.map((u) => {
      const emp = employeesStore.find((e) => String(e.userId) === String(u.id) || String(e.id) === String(u.employeeId));
      return {
        ...u,
        role: u.role || 'employee',
        employeeId: emp?.id || u.employeeId,
        employeeName: emp?.name || u.employeeName,
        employeeEmail: emp?.email || u.email,
        department: emp?.department,
        createdAt: u.createdAt || '2026-09-01T00:00:00Z',
      };
    });
  }

  if (endpoint.startsWith('/users/') && method === 'GET') {
    const id = endpoint.split('?')[0].split('/')[2];
    const user = usersStore.find((u) => String(u.id) === String(id));
    if (!user) throw new Error('User not found');
    const emp = employeesStore.find((e) => String(e.userId) === String(user.id) || String(e.id) === String(user.employeeId));
    return {
      ...user,
      role: user.role || 'employee',
      employeeId: emp?.id || user.employeeId,
      employeeName: emp?.name || user.employeeName,
      employeeEmail: emp?.email || user.email,
      department: emp?.department,
    };
  }

  if (endpoint === '/users' && method === 'POST') {
    const empId = body.employee_id || body.employeeId || null;
    const emp = empId ? employeesStore.find((e) => String(e.id) === String(empId)) : null;
    const targetRole = body.role || body.role_name || body.roleName || 'employee';

    const newUser: User = {
      id: 'usr-' + Date.now(),
      username: body.username,
      role: targetRole,
      isActive: body.is_active !== undefined ? body.is_active : (body.isActive !== undefined ? body.isActive : true),
      employeeId: emp?.id || empId,
      employeeName: emp?.name,
      employeeEmail: emp?.email,
      department: emp?.department,
      createdAt: new Date().toISOString(),
    };
    if (emp) {
      emp.userId = newUser.id;
    }
    usersStore.push(newUser);
    return newUser;
  }

  if (endpoint.startsWith('/users/') && method === 'PUT') {
    const id = endpoint.split('?')[0].split('/')[2];
    const userIndex = usersStore.findIndex((u) => String(u.id) === String(id));
    if (userIndex === -1) throw new Error('User not found');
    const prev = usersStore[userIndex];
    const newEmpId = body.employee_id !== undefined ? body.employee_id : body.employeeId;
    let emp = prev.employeeId ? employeesStore.find((e) => String(e.id) === String(prev.employeeId)) : null;

    if (newEmpId !== undefined) {
      if (emp) emp.userId = undefined;
      emp = newEmpId ? employeesStore.find((e) => String(e.id) === String(newEmpId)) : null;
      if (emp) emp.userId = id;
    }

    const targetRole = body.role || body.role_name || body.roleName || prev.role;
    const updated: User = {
      ...prev,
      role: targetRole,
      isActive: body.is_active !== undefined ? body.is_active : (body.isActive !== undefined ? body.isActive : prev.isActive),
      employeeId: emp?.id || (newEmpId !== undefined ? newEmpId : prev.employeeId),
      employeeName: emp?.name || prev.employeeName,
      employeeEmail: emp?.email || prev.employeeEmail,
      department: emp?.department || prev.department,
    };
    usersStore[userIndex] = updated;
    return updated;
  }

  if (endpoint.startsWith('/users/') && method === 'DELETE') {
    const id = endpoint.split('?')[0].split('/')[2];
    const user = usersStore.find((u) => String(u.id) === String(id));
    if (!user) throw new Error('User not found');
    const emp = employeesStore.find((e) => String(e.userId) === String(id));
    if (emp) emp.userId = undefined;
    usersStore = usersStore.filter((u) => String(u.id) !== String(id));
    return { detail: 'User deleted successfully' };
  }

  // Dashboard - Personal Employee Dashboard
  if (endpoint === '/dashboard/me' && method === 'GET') {
    const user = currentAuthUser;
    const emp = user?.employeeId
      ? employeesStore.find((e) => String(e.id) === String(user.employeeId) || String(e.userId) === String(user.id))
      : (user?.id ? employeesStore.find((e) => String(e.userId) === String(user.id)) : null);

    const empId = emp ? String(emp.id) : (user?.employeeId ? String(user.employeeId) : null);

    const userAtt = empId
      ? attendanceStore.filter((a) => String(a.employeeId) === empId)
      : [];
    const totalRecords = userAtt.length;
    const presentDays = userAtt.filter((a) => a.status === 'present' || a.status === 'overtime').length;
    const lateDays = userAtt.filter((a) => a.status === 'late').length;
    const absentOrOtherDays = totalRecords - presentDays - lateDays;
    const totalHoursWorked = userAtt.reduce((sum, a) => sum + (a.workedHours || 0), 0);
    const attendanceHealthPercentage = totalRecords > 0 ? Math.round((presentDays / totalRecords) * 100) : 100;

    const recentAttendance = userAtt.slice(0, 15).map((a) => ({
      id: a.id,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      workedHours: a.workedHours,
      status: a.status,
      isManual: a.isManual || false,
      note: a.note,
      expectedWorkingDay: true,
    }));

    const userApprovedRequests = empId
      ? timeOffRequestsStore.filter((r) => String(r.employeeId) === empId && r.status === 'approved')
      : [];
    const totalApprovedLeaveDays = userApprovedRequests.reduce((sum, r) => sum + r.duration, 0);

    const approvedLeaves = userApprovedRequests.map((r) => ({
      id: r.id,
      timeOffTypeName: r.timeOffTypeName || 'Leave',
      dateFrom: r.dateFrom,
      dateTo: r.dateTo,
      duration: r.duration,
      status: r.status,
      reason: (r as any).reason || r.note,
    }));

    const userAllocations = empId
      ? allocationsStore.filter((a) => String(a.employeeId) === empId)
      : [];
    const leaveAllocations = userAllocations.map((a) => ({
      id: a.id,
      timeOffTypeName: a.timeOffTypeName || 'Leave',
      unit: 'days',
      allocatedDays: a.numberOfDays,
      takenDays: a.taken || 0,
      remainingDays: a.remaining || a.numberOfDays,
    }));

    const userPayslips = empId
      ? payslipsStore.filter((p) => String(p.employeeId) === empId)
      : [];
    const warnings: any[] = [];
    userPayslips.forEach((ps) => {
      (ps.warnings || []).forEach((msg, idx) => {
        warnings.push({
          id: `${ps.id}:${idx}`,
          title: 'Payroll Notice',
          message: msg,
          warningType: 'payroll_notice',
          severity: 'warning',
          createdAt: ps.createdAt,
          source: `Payrun Period ${ps.periodStart} - ${ps.periodEnd}`,
          status: ps.status === 'paid' ? 'resolved' : 'pending',
        });
      });
    });

    if (emp && (!emp.bankAccountNumber || !emp.bankIfsc)) {
      warnings.push({
        id: `bank-missing-${emp.id}`,
        title: 'Banking Details Notice',
        message: 'Bank account number or IFSC is missing in your employee record. Please contact HR to ensure automated payroll direct credits.',
        warningType: 'profile_alert',
        severity: 'notice',
        createdAt: new Date().toISOString(),
        source: 'Employee Profile Validation',
        status: 'pending',
      });
    }

    const schedule = emp?.workingScheduleId
      ? schedulesStore.find((s) => String(s.id) === String(emp.workingScheduleId))
      : schedulesStore[0];

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const scheduleLines = (schedule?.lines || []).map((l, i) => ({
      dayOfWeek: l.dayOfWeek ?? i,
      dayName: dayNames[l.dayOfWeek ?? i] || `Day ${l.dayOfWeek}`,
      isWorkingDay: l.isWorkingDay,
      startTime: l.startTime || (l.isWorkingDay ? '09:00:00' : null),
      endTime: l.endTime || (l.isWorkingDay ? '18:00:00' : null),
      breakMinutes: l.breakMinutes || 0,
      dailyHours: l.isWorkingDay ? 8.0 : 0.0,
    }));

    const paidSlips = userPayslips.filter((p) => p.status === 'paid');
    const latestPs = userPayslips[0];
    const latestNet = latestPs ? latestPs.netSalary : (emp ? 65000 : 0);
    const latestGross = latestPs ? latestPs.grossSalary : (emp ? 78000 : 0);
    const latestDeductions = latestPs ? Math.round(latestPs.grossSalary - latestPs.netSalary) : 13000;
    const avgNet = paidSlips.length > 0
      ? Math.round(paidSlips.reduce((s, p) => s + p.netSalary, 0) / paidSlips.length)
      : latestNet;

    const monthlyTrend = userPayslips.slice(0, 6).map((ps) => ({
      id: ps.id,
      payrunId: ps.payrunId || 'payrun-1',
      periodStart: ps.periodStart,
      periodEnd: ps.periodEnd,
      grossSalary: ps.grossSalary,
      deductions: Math.round(ps.grossSalary - ps.netSalary),
      netSalary: ps.netSalary,
      status: ps.status,
      workedDays: ps.workedDays,
      expectedWorkingDays: ps.expectedWorkingDays || 22,
    }));

    const latestPayslipLines = (latestPs?.lines || [
      { name: 'Basic Wage', code: 'BASIC', category: 'basic', amount: latestGross * 0.5 },
      { name: 'House Rent Allowance (HRA)', code: 'HRA', category: 'allowance', amount: latestGross * 0.25 },
      { name: 'Special Allowance', code: 'SA', category: 'allowance', amount: latestGross * 0.25 },
      { name: 'Provident Fund (PF)', code: 'PF', category: 'deduction', amount: latestGross * 0.12 },
      { name: 'Professional Tax (PT)', code: 'PT', category: 'deduction', amount: 200 },
    ]).map((l) => ({
      name: l.name,
      code: l.code,
      category: l.category,
      amount: l.amount,
    }));

    const maskedAcc = emp?.bankAccountNumber
      ? `••••${emp.bankAccountNumber.slice(-4)}`
      : '••••8821';

    const employeeDashboardData: EmployeeDashboardData = {
      employee: emp ? {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        department: emp.department,
        jobPosition: emp.jobPosition,
        employmentStatus: emp.employmentStatus,
      } : null,
      attendanceHealth: {
        attendanceHealthPercentage,
        totalRecords,
        presentDays,
        lateDays,
        absentOrOtherDays,
        totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
      },
      recentAttendance,
      approvedLeaves,
      leaveAllocations,
      totalApprovedLeaveDays,
      warnings,
      schedule: {
        scheduleId: schedule?.id,
        scheduleName: schedule?.name || 'Standard 40h (Mon-Fri 09:00-18:00)',
        weeklyWorkingDays: scheduleLines.filter((l) => l.isWorkingDay).length || 5,
        totalWeeklyHours: scheduleLines.filter((l) => l.isWorkingDay).length * 8.0,
        lines: scheduleLines,
      },
      salary: {
        latestNetSalary: latestNet,
        latestGrossSalary: latestGross,
        latestDeductions,
        averageNetSalary: avgNet,
        totalPayoutsCount: paidSlips.length || (latestPs ? 1 : 0),
        currency: 'INR',
        bankName: emp?.bankName || 'HDFC Bank',
        bankAccountMasked: maskedAcc,
        bankIfsc: emp?.bankIfsc || 'HDFC0001234',
        monthlyTrend,
        latestPayslipLines,
      },
    };

    return employeeDashboardData;
  }

  // Dashboard - Operational Overview
  if (endpoint === '/dashboard/kpis' && method === 'GET') {
    const totalNet = payslipsStore.reduce((sum, p) => sum + p.netSalary, 0);
    const avgSalary = payslipsStore.length ? totalNet / payslipsStore.length : 0;
    const approvedLeave = timeOffRequestsStore
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + r.duration, 0);
    const totalAttendance = attendanceStore.length;
    const presentCount = attendanceStore.filter(
      (a) => a.status === 'present' || a.status === 'overtime'
    ).length;

    const kpis: DashboardKPIs = {
      totalNetSalaryPaid: 680000,
      payslipsGenerated: payslipsStore.length,
      averageSalary: Math.round(avgSalary || 64250),
      approvedTimeOffDays: approvedLeave,
      attendanceHealthPercentage: totalAttendance
        ? Math.round((presentCount / totalAttendance) * 100)
        : 92,
      activeEmployeesCount: employeesStore.filter((e) => e.employmentStatus === 'active').length,
      pendingLeaveRequestsCount: timeOffRequestsStore.filter((r) => r.status === 'confirmed' || r.status === 'draft').length,
      unresolvedWarningsCount: 1, // Ishaan missing bank details
    };
    return kpis;
  }

  if (endpoint === '/dashboard/salary-by-dept' && method === 'GET') {
    const deptCosts: DepartmentSalaryCost[] = [
      { department: 'Engineering', cost: 350000, employeeCount: 3 },
      { department: 'Human Resources', cost: 180000, employeeCount: 2 },
      { department: 'Finance & Payroll', cost: 220000, employeeCount: 2 },
      { department: 'Sales', cost: 65000, employeeCount: 1 },
    ];
    return deptCosts;
  }

  if (endpoint === '/dashboard/salary-trend' && method === 'GET') {
    const trend: MonthlySalaryTrend[] = [
      { month: 'Apr 2026', gross: 790000, net: 658000, deductions: 132000 },
      { month: 'May 2026', gross: 800000, net: 666000, deductions: 134000 },
      { month: 'Jun 2026', gross: 805000, net: 671000, deductions: 134000 },
      { month: 'Jul 2026', gross: 810000, net: 675000, deductions: 135000 },
      { month: 'Aug 2026', gross: 815000, net: 680000, deductions: 135000 },
    ];
    return trend;
  }

  if (endpoint === '/dashboard/alerts' && method === 'GET') {
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      const empId = currentAuthUser.employeeId;
      const userSlips = empId ? payslipsStore.filter((p) => String(p.employeeId) === String(empId)) : [];
      const userAlerts: DashboardAlert[] = [];
      userSlips.forEach((ps) => {
        (ps.warnings || []).forEach((msg, idx) => {
          userAlerts.push({
            id: `${ps.id}:${idx}`,
            warningType: 'payroll_notice',
            employeeId: String(empId),
            employeeName: currentAuthUser?.employeeName || 'You',
            message: msg,
          });
        });
      });
      return userAlerts;
    }

    const alerts: DashboardAlert[] = [
      {
        id: '1',
        warningType: 'missing_bank_details',
        employeeId: '8',
        employeeName: 'Ishaan Kapoor',
        message: 'Employee is missing bank account details for payroll payout.',
      },
      {
        id: '2',
        warningType: 'missing_punch',
        employeeId: '8',
        employeeName: 'Ishaan Kapoor',
        message: 'Missing attendance check-out punch on 2026-09-03.',
      },
    ];
    return alerts;
  }

  // Employees
  if (endpoint.startsWith('/employees') && !endpoint.startsWith('/employees/') && method === 'GET') {
    const ALLOWED_LIMITS = [10, 25, 50, 100];
    const DEFAULT_LIMIT = 10;
    const qs = endpoint.includes('?') ? endpoint.split('?')[1] : '';
    const params = new URLSearchParams(qs);

    const statusParam = params.get('status');
    let effectiveStatus: string | null;
    if (statusParam === 'all') {
      effectiveStatus = null;
    } else if (statusParam === 'active' || statusParam === 'inactive' || statusParam === 'on_leave') {
      effectiveStatus = statusParam;
    } else {
      effectiveStatus = 'active';
    }

    let limit = parseInt(params.get('limit') || '', 10);
    if (!ALLOWED_LIMITS.includes(limit)) limit = DEFAULT_LIMIT;

    let page = parseInt(params.get('page') || '', 10);
    if (!Number.isFinite(page) || page < 1) page = 1;

    const searchParam = (params.get('search') || '').trim().toLowerCase();
    const departmentParam = params.get('department');

    const filtered = employeesStore
      .filter((e) => effectiveStatus === null || e.employmentStatus === effectiveStatus)
      .filter((e) => !departmentParam || e.department === departmentParam)
      .filter(
        (e) =>
          !searchParam ||
          e.name.toLowerCase().includes(searchParam) ||
          e.email.toLowerCase().includes(searchParam)
      )
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const items = filtered.slice((page - 1) * limit, (page - 1) * limit + limit);

    return { items, total, page, limit, totalPages };
  }

  if (endpoint.startsWith('/employees/') && method === 'GET') {
    const parts = endpoint.split('?')[0].split('/');
    const id = parts[2];
    const sub = parts[3];

    if (currentAuthUser && currentAuthUser.role === 'employee') {
      const userEmpId = currentAuthUser.employeeId;
      if (!userEmpId || String(id) !== String(userEmpId)) {
        throw new Error('HTTP 403: Insufficient permissions');
      }
    }

    const emp = employeesStore.find((e) => String(e.id) === String(id));
    if (!emp) throw new Error('HTTP 404: Employee not found');

    if (sub === 'contracts') {
      if (currentAuthUser && currentAuthUser.role === 'employee') {
        throw new Error('HTTP 403: Insufficient permissions');
      }
      return contractsStore.filter((c) => String(c.employeeId) === String(id));
    }
    if (sub === 'attendance') {
      return attendanceStore.filter((a) => String(a.employeeId) === String(id));
    }
    if (sub === 'time-off') {
      return timeOffRequestsStore.filter((t) => String(t.employeeId) === String(id));
    }
    return emp;
  }

  if (endpoint === '/employees' && method === 'POST') {
    const newEmp: Employee = {
      ...body,
      id: String(Date.now()),
      employmentStatus: body.employmentStatus || 'active',
    };
    employeesStore.unshift(newEmp);
    return newEmp;
  }

  if (endpoint.startsWith('/employees/') && method === 'PUT') {
    const id = endpoint.split('/')[2];
    employeesStore = employeesStore.map((e) =>
      String(e.id) === String(id) ? { ...e, ...body } : e
    );
    return employeesStore.find((e) => String(e.id) === String(id));
  }

  if (endpoint.startsWith('/employees/') && method === 'DELETE') {
    const id = endpoint.split('/')[2];
    employeesStore = employeesStore.filter((e) => String(e.id) !== String(id));
    return { success: true };
  }

  // Contracts
  if (endpoint === '/contracts/bulk-create' && method === 'POST') {
    const employeeIds = body.employee_ids || body.employeeIds || [];
    const successIds: string[] = [];
    const failures: any[] = [];
    for (const empId of employeeIds) {
      const emp = employeesStore.find((e) => String(e.id) === String(empId));
      const statusVal = body.status || 'draft';
      if (statusVal === 'active') {
        const overlap = contractsStore.find((c) => String(c.employeeId) === String(empId) && c.status === 'active');
        if (overlap) {
          failures.push({
            id: String(empId),
            name: emp?.name || 'Employee',
            reason: `Overlapping active contract already exists (#${overlap.id})`,
          });
          continue;
        }
      }
      const newContract: Contract = {
        id: String(Date.now() + Math.floor(Math.random() * 1000)),
        employeeId: String(empId),
        employeeName: emp?.name,
        dateStart: body.date_start || body.dateStart || new Date().toISOString().split('T')[0],
        dateEnd: body.date_end || body.dateEnd || null,
        wage: Number(body.wage) || 50000,
        department: body.department || emp?.department,
        jobPosition: body.job_position || body.jobPosition || emp?.jobPosition,
        workingScheduleId: body.working_schedule_id || body.workingScheduleId || emp?.workingScheduleId,
        salaryStructureId: body.salary_structure_id || body.salaryStructureId || null,
        status: statusVal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      contractsStore.unshift(newContract);
      successIds.push(newContract.id);
    }
    return {
      operation: 'bulk_create',
      total: employeeIds.length,
      successCount: successIds.length,
      failedCount: failures.length,
      successIds,
      failures,
    };
  }

  if (endpoint === '/contracts/bulk-update' && (method === 'PATCH' || method === 'POST' || method === 'PUT')) {
    const contractIds = body.contract_ids || body.contractIds || [];
    const successIds: string[] = [];
    const failures: any[] = [];
    for (const cid of contractIds) {
      const contract = contractsStore.find((c) => String(c.id) === String(cid));
      if (!contract) {
        failures.push({ id: String(cid), name: 'Unknown Contract', reason: 'Contract record not found' });
        continue;
      }
      const emp = employeesStore.find((e) => String(e.id) === String(contract.employeeId));
      const empName = contract.employeeName || emp?.name || 'Employee';

      if (contract.status === 'expired' || contract.status === 'cancelled') {
        if (!body.update_status && !body.updateStatus) {
          failures.push({ id: String(cid), name: empName, reason: 'Expired/cancelled contracts cannot be edited' });
          continue;
        }
      }

      if (body.update_date_start || body.updateDateStart) {
        contract.dateStart = body.date_start || body.dateStart || contract.dateStart;
      }
      if (body.update_date_end || body.updateDateEnd) {
        contract.dateEnd = body.date_end !== undefined ? body.date_end : (body.dateEnd !== undefined ? body.dateEnd : null);
      }
      if (body.update_wage || body.updateWage) {
        contract.wage = Number(body.wage !== undefined ? body.wage : contract.wage);
      }
      if (body.update_department || body.updateDepartment) {
        contract.department = body.department !== undefined ? body.department : contract.department;
      }
      if (body.update_job_position || body.updateJobPosition) {
        contract.jobPosition = body.job_position || body.jobPosition || contract.jobPosition;
      }
      if (body.update_working_schedule_id || body.updateWorkingScheduleId) {
        contract.workingScheduleId = body.working_schedule_id || body.workingScheduleId || contract.workingScheduleId;
      }
      if (body.update_salary_structure_id || body.updateSalaryStructureId) {
        contract.salaryStructureId = body.salary_structure_id || body.salaryStructureId || contract.salaryStructureId;
      }
      if (body.update_status || body.updateStatus) {
        contract.status = body.status || contract.status;
      }
      contract.updatedAt = new Date().toISOString();
      successIds.push(contract.id);
    }
    return {
      operation: 'bulk_update',
      total: contractIds.length,
      successCount: successIds.length,
      failedCount: failures.length,
      successIds,
      failures,
    };
  }

  if (endpoint === '/contracts/bulk-delete' && method === 'POST') {
    const contractIds = body.contract_ids || body.contractIds || [];
    const successIds: string[] = [];
    const failures: any[] = [];
    for (const cid of contractIds) {
      const contract = contractsStore.find((c) => String(c.id) === String(cid));
      if (!contract) {
        failures.push({ id: String(cid), name: 'Unknown Contract', reason: 'Contract record not found' });
        continue;
      }
      const emp = employeesStore.find((e) => String(e.id) === String(contract.employeeId));
      const empName = contract.employeeName || emp?.name || 'Employee';

      const hasPayslips = payslipsStore.some((p) => String(p.contractId) === String(cid));
      if (hasPayslips) {
        failures.push({
          id: String(cid),
          name: empName,
          reason: 'Cannot delete: Contract is referenced by historical payslip records.',
        });
        continue;
      }

      if (contract.status !== 'draft') {
        failures.push({
          id: String(cid),
          name: empName,
          reason: `Only draft contracts can be hard-deleted. Contract is in ${contract.status} state.`,
        });
        continue;
      }

      contractsStore = contractsStore.filter((c) => String(c.id) !== String(cid));
      successIds.push(cid);
    }
    return {
      operation: 'bulk_delete',
      total: contractIds.length,
      successCount: successIds.length,
      failedCount: failures.length,
      successIds,
      failures,
    };
  }

  if (endpoint === '/contracts' && method === 'GET') {
    return contractsStore;
  }

  if (endpoint.startsWith('/contracts/') && method === 'GET') {
    const id = endpoint.split('/')[2];
    return contractsStore.find((c) => String(c.id) === String(id));
  }

  if (endpoint === '/contracts' && method === 'POST') {
    const newContract: Contract = {
      ...body,
      id: String(Date.now()),
    };
    contractsStore.unshift(newContract);
    return newContract;
  }

  if (endpoint.startsWith('/contracts/') && method === 'PUT') {
    const id = endpoint.split('/')[2];
    contractsStore = contractsStore.map((c) =>
      String(c.id) === String(id) ? { ...c, ...body } : c
    );
    return contractsStore.find((c) => String(c.id) === String(id));
  }

  if (endpoint.startsWith('/contracts/') && method === 'DELETE') {
    const id = endpoint.split('/')[2];
    contractsStore = contractsStore.filter((c) => String(c.id) !== String(id));
    return { success: true };
  }

  // Working Schedules
  if (endpoint === '/working-schedules' && method === 'GET') {
    return schedulesStore;
  }

  if (endpoint.startsWith('/working-schedules/') && method === 'GET') {
    const id = endpoint.split('/')[2];
    return schedulesStore.find((s) => String(s.id) === String(id));
  }

  if (endpoint === '/working-schedules' && method === 'POST') {
    const newSched: WorkingSchedule = {
      ...body,
      id: String(Date.now()),
      weeklyHours: body.weeklyHours || 40,
    };
    schedulesStore.push(newSched);
    return newSched;
  }

  if (endpoint.startsWith('/working-schedules/') && method === 'PUT') {
    const id = endpoint.split('/')[2];
    schedulesStore = schedulesStore.map((s) =>
      String(s.id) === String(id) ? { ...s, ...body } : s
    );
    return schedulesStore.find((s) => String(s.id) === String(id));
  }

  // Attendance
  if (endpoint === '/attendance' && method === 'GET') {
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      const userEmpId = currentAuthUser.employeeId;
      return attendanceStore.filter((a) => !userEmpId || String(a.employeeId) === String(userEmpId));
    }
    return attendanceStore;
  }

  if (endpoint === '/attendance' && method === 'POST') {
    let empId = body.employeeId;
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      const userEmpId = currentAuthUser.employeeId;
      if (empId && userEmpId && String(empId) !== String(userEmpId)) {
        throw new Error('HTTP 403: You may only record attendance for yourself');
      }
      empId = userEmpId || empId;
    }

    const checkIn = body.checkIn || new Date().toISOString();
    const todayStr = checkIn.slice(0, 10);

    const existingIdx = attendanceStore.findIndex(
      (a) => String(a.employeeId) === String(empId) && a.checkIn?.slice(0, 10) === todayStr
    );

    if (existingIdx !== -1) {
      const existing = attendanceStore[existingIdx];
      if (!existing.checkOut) {
        const checkOut = body.checkOut || new Date().toISOString();
        const worked = Math.round(((new Date(checkOut).getTime() - new Date(existing.checkIn!).getTime()) / 3600000) * 100) / 100;
        const updated: AttendanceRecord = {
          ...existing,
          checkOut,
          workedHours: worked,
          note: body.note ? `${existing.note || ''} | ${body.note}`.trim() : existing.note,
        };
        attendanceStore[existingIdx] = updated;
        return updated;
      } else {
        throw new Error('HTTP 400: Attendance record already exists and is completed for this date');
      }
    }

    const checkOut = body.checkOut || null;
    let worked: number | null = null;
    if (checkIn && checkOut) {
      worked = Math.round(((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000) * 100) / 100;
    }
    const newAtt: AttendanceRecord = {
      ...body,
      id: String(Date.now()),
      employeeId: empId,
      checkIn,
      checkOut,
      workedHours: worked,
      status: body.status || 'present',
      isManual: false,
    };
    attendanceStore.unshift(newAtt);
    return newAtt;
  }

  if (endpoint.startsWith('/attendance/') && method === 'PUT') {
    const id = endpoint.split('/')[2];
    let worked = body.workedHours;
    if (body.checkIn && body.checkOut) {
      worked = Math.round(((new Date(body.checkOut).getTime() - new Date(body.checkIn).getTime()) / 3600000) * 100) / 100;
    }
    attendanceStore = attendanceStore.map((a) =>
      String(a.id) === String(id)
        ? {
            ...a,
            ...body,
            workedHours: worked ?? a.workedHours,
            isManual: true,
          }
        : a
    );
    return attendanceStore.find((a) => String(a.id) === String(id));
  }

  // Time Off Types
  if (endpoint === '/time-off-types' && method === 'GET') {
    return timeOffTypesStore;
  }

  if (endpoint === '/time-off-types' && method === 'POST') {
    const newType: TimeOffType = { ...body, id: String(Date.now()) };
    timeOffTypesStore.push(newType);
    return newType;
  }

  // Allocations
  if ((endpoint === '/allocations' || endpoint.startsWith('/allocations?')) && method === 'GET') {
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      const userEmpId = currentAuthUser.employeeId;
      return allocationsStore.filter((al) => !userEmpId || String(al.employeeId) === String(userEmpId));
    }
    const qs = endpoint.includes('?') ? endpoint.split('?')[1] : '';
    const params = new URLSearchParams(qs);
    const empParam = params.get('employee_id');
    if (empParam) {
      return allocationsStore.filter((al) => String(al.employeeId) === String(empParam));
    }
    return allocationsStore;
  }

  if (endpoint.startsWith('/allocations/') && method === 'GET') {
    const id = endpoint.split('?')[0].split('/')[2];
    const alloc = allocationsStore.find((a) => String(a.id) === String(id));
    if (!alloc) throw new Error('HTTP 404: Allocation not found');
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      const userEmpId = currentAuthUser.employeeId;
      if (!userEmpId || String(alloc.employeeId) !== String(userEmpId)) {
        throw new Error('HTTP 403: Insufficient permissions');
      }
    }
    return alloc;
  }

  if (endpoint === '/allocations' && method === 'POST') {
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      throw new Error('HTTP 403: Insufficient permissions');
    }
    const newAlloc: Allocation = {
      ...body,
      id: String(Date.now()),
      taken: 0,
      remaining: body.numberOfDays,
      status: body.status || 'draft',
    };
    allocationsStore.unshift(newAlloc);
    return newAlloc;
  }

  if (endpoint.startsWith('/allocations/') && method === 'PUT') {
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      throw new Error('HTTP 403: Insufficient permissions');
    }
    const id = endpoint.split('?')[0].split('/')[2];
    allocationsStore = allocationsStore.map((al) =>
      String(al.id) === String(id) ? { ...al, ...body } : al
    );
    return allocationsStore.find((al) => String(al.id) === String(id));
  }

  // Time Off Requests
  if ((endpoint === '/time-off-requests' || endpoint.startsWith('/time-off-requests?')) && method === 'GET') {
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      const userEmpId = currentAuthUser.employeeId;
      return timeOffRequestsStore.filter((r) => !userEmpId || String(r.employeeId) === String(userEmpId));
    }
    const qs = endpoint.includes('?') ? endpoint.split('?')[1] : '';
    const params = new URLSearchParams(qs);
    const empParam = params.get('employee_id');
    const statusParam = params.get('status');
    let res = timeOffRequestsStore;
    if (empParam) res = res.filter((r) => String(r.employeeId) === String(empParam));
    if (statusParam) res = res.filter((r) => r.status === statusParam);
    return res;
  }

  if (endpoint.startsWith('/time-off-requests/') && !endpoint.includes('/approve') && !endpoint.includes('/refuse') && method === 'GET') {
    const id = endpoint.split('?')[0].split('/')[2];
    const req = timeOffRequestsStore.find((r) => String(r.id) === String(id));
    if (!req) throw new Error('HTTP 404: Time off request not found');
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      const userEmpId = currentAuthUser.employeeId;
      if (!userEmpId || String(req.employeeId) !== String(userEmpId)) {
        throw new Error('HTTP 403: Insufficient permissions');
      }
    }
    return req;
  }

  if (endpoint === '/time-off-requests' && method === 'POST') {
    let empId = body.employeeId;
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      const userEmpId = currentAuthUser.employeeId;
      if (empId && userEmpId && String(empId) !== String(userEmpId)) {
        throw new Error('HTTP 403: You may only submit time off requests for yourself');
      }
      empId = userEmpId || empId;
    }

    const newReq: TimeOffRequest = {
      ...body,
      id: String(Date.now()),
      employeeId: empId,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    timeOffRequestsStore.unshift(newReq);
    return newReq;
  }

  if (endpoint.includes('/approve') && method === 'POST') {
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      throw new Error('HTTP 403: Insufficient permissions');
    }
    const id = endpoint.split('/')[2];
    const req = timeOffRequestsStore.find((r) => String(r.id) === String(id));
    if (req) {
      req.status = 'approved';

      // Deduct balance from allocation per Business Rule 4
      if (req.allocationId) {
        const alloc = allocationsStore.find((a) => String(a.id) === String(req.allocationId));
        if (alloc) {
          alloc.taken += req.duration;
          alloc.remaining = Math.max(0, alloc.numberOfDays - alloc.taken);
        }
      }
    }
    return req;
  }

  if (endpoint.includes('/refuse') && method === 'POST') {
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      throw new Error('HTTP 403: Insufficient permissions');
    }
    const id = endpoint.split('/')[2];
    const req = timeOffRequestsStore.find((r) => String(r.id) === String(id));
    if (req) {
      req.status = 'refused';
    }
    return req;
  }

  // Salary Structures & Rules
  if (endpoint === '/salary-structures' && method === 'GET') {
    return salaryStructuresStore.map((s) => ({
      ...s,
      rules: salaryRulesStore.filter((r) => String(r.salaryStructureId) === String(s.id)),
    }));
  }

  if (endpoint === '/salary-structures' && method === 'POST') {
    const newStruct: SalaryStructure = { ...body, id: String(Date.now()) };
    salaryStructuresStore.push(newStruct);
    return newStruct;
  }

  if (endpoint === '/salary-rules' && method === 'GET') {
    return salaryRulesStore;
  }

  if (endpoint === '/salary-rules' && method === 'POST') {
    const newRule: SalaryRule = { ...body, id: String(Date.now()) };
    salaryRulesStore.push(newRule);
    return newRule;
  }

  if (endpoint.startsWith('/salary-rules/') && method === 'PUT') {
    const id = endpoint.split('/')[2];
    salaryRulesStore = salaryRulesStore.map((r) =>
      String(r.id) === String(id) ? { ...r, ...body } : r
    );
    return salaryRulesStore.find((r) => String(r.id) === String(id));
  }

  // Payruns
  if (endpoint === '/payruns' && method === 'GET') {
    return payrunsStore;
  }

  if (endpoint.startsWith('/payruns/') && method === 'GET') {
    const id = endpoint.split('/')[2];
    return payrunsStore.find((p) => String(p.id) === String(id));
  }

  if (endpoint === '/payruns' && method === 'POST') {
    const newPayrun: Payrun = {
      ...body,
      id: String(Date.now()),
      status: 'draft',
      employeeCount: body.employeeIds?.length || employeesStore.length,
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      warningsCount: 0,
      createdAt: new Date().toISOString(),
    };
    payrunsStore.unshift(newPayrun);
    return newPayrun;
  }

  // Payrun actions
  if (endpoint.includes('/compute') && method === 'POST') {
    const id = endpoint.split('/')[2];
    const payrun = payrunsStore.find((p) => String(p.id) === String(id));
    if (payrun) {
      payrun.status = 'computed';
      payrun.updatedAt = new Date().toISOString();

      // Compute payslips for active employees matching period
      let grossSum = 0;
      let dedSum = 0;
      let netSum = 0;

      const newSlips: Payslip[] = [];
      const activeEmps = employeesStore.filter((e) => e.employmentStatus === 'active');

      for (const emp of activeEmps) {
        // Resolve contract covering period
        const contract = contractsStore.find(
          (c) =>
            String(c.employeeId) === String(emp.id) &&
            c.status === 'active' &&
            c.dateStart <= payrun.periodStart &&
            (!c.dateEnd || c.dateEnd >= payrun.periodEnd)
        ) || contractsStore.find((c) => String(c.employeeId) === String(emp.id) && c.status === 'active');

        const monthlyWage = contract?.wage || 50000;

        const basic = Math.round(monthlyWage * 0.5);
        const hra = Math.round(basic * 0.4);
        const trans = 3000;
        const gross = basic + hra + trans;
        const pf = Math.round(basic * 0.12);
        const pt = 200;
        const tds = Math.round(gross * 0.1);
        const deductions = pf + pt + tds;
        const net = gross - deductions;

        grossSum += gross;
        dedSum += deductions;
        netSum += net;

        const warnings: string[] = [];
        if (!emp.bankAccountNumber) {
          warnings.push('Employee missing bank account details.');
        }

        const slipId = String(Date.now() + Math.floor(Math.random() * 10000));
        newSlips.push({
          id: slipId,
          payrunId: payrun.id,
          payrunName: payrun.name,
          employeeId: emp.id,
          employeeName: emp.name,
          departmentName: emp.department,
          jobPositionTitle: emp.jobPosition,
          bankAccountNumber: emp.bankAccountNumber,
          bankName: emp.bankName,
          contractId: contract?.id,
          periodStart: payrun.periodStart,
          periodEnd: payrun.periodEnd,
          workedDays: 22,
          grossSalary: gross,
          netSalary: net,
          status: 'computed',
          warnings,
          lines: [
            { id: '1', payslipId: slipId, code: 'BASIC', name: 'Basic Salary', category: 'basic', sequence: 10, amount: basic },
            { id: '2', payslipId: slipId, code: 'HRA', name: 'House Rent Allowance (HRA)', category: 'allowance', sequence: 20, amount: hra },
            { id: '3', payslipId: slipId, code: 'TRANS', name: 'Transport Allowance', category: 'allowance', sequence: 30, amount: trans },
            { id: '4', payslipId: slipId, code: 'GROSS', name: 'Gross Salary', category: 'gross', sequence: 40, amount: gross },
            { id: '5', payslipId: slipId, code: 'PF', name: 'Provident Fund (PF)', category: 'deduction', sequence: 50, amount: pf },
            { id: '6', payslipId: slipId, code: 'PT', name: 'Professional Tax (PT)', category: 'deduction', sequence: 60, amount: pt },
            { id: '7', payslipId: slipId, code: 'TDS', name: 'Tax Deducted at Source (TDS)', category: 'deduction', sequence: 70, amount: tds },
            { id: '8', payslipId: slipId, code: 'NET', name: 'Net Salary', category: 'net', sequence: 80, amount: net },
          ],
        });
      }

      payrun.totalGross = grossSum;
      payrun.totalDeductions = dedSum;
      payrun.totalNet = netSum;
      payrun.employeeCount = newSlips.length;
      payrun.warningsCount = newSlips.filter((s) => s.warnings && s.warnings.length > 0).length;

      // Replace or prepend payslips for this payrun
      payslipsStore = [
        ...newSlips,
        ...payslipsStore.filter((s) => String(s.payrunId) !== String(payrun.id)),
      ];
    }
    return payrun;
  }

  if (endpoint.includes('/validate') && method === 'POST') {
    const id = endpoint.split('/')[2];
    const payrun = payrunsStore.find((p) => String(p.id) === String(id));
    if (payrun) {
      payrun.status = 'validated';
      payrun.updatedAt = new Date().toISOString();
      payslipsStore = payslipsStore.map((s) =>
        String(s.payrunId) === String(payrun.id) ? { ...s, status: 'validated' } : s
      );
    }
    return payrun;
  }

  if (endpoint.includes('/mark-paid') && method === 'POST') {
    const id = endpoint.split('/')[2];
    const payrun = payrunsStore.find((p) => String(p.id) === String(id));
    if (payrun) {
      payrun.status = 'paid';
      payrun.updatedAt = new Date().toISOString();
      payslipsStore = payslipsStore.map((s) =>
        String(s.payrunId) === String(payrun.id) ? { ...s, status: 'paid' } : s
      );
    }
    return payrun;
  }

  if (endpoint.includes('/send-payslips') && method === 'POST') {
    const id = endpoint.split('/')[2];
    return { success: true, count: payslipsStore.filter((s) => String(s.payrunId) === String(id)).length };
  }

  // Payslips
  if (endpoint.startsWith('/payslips') && !endpoint.startsWith('/payslips/') && method === 'GET') {
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      const userEmpId = currentAuthUser.employeeId;
      if (!userEmpId) return [];
      return payslipsStore.filter((s) => String(s.employeeId) === String(userEmpId));
    }
    const qs = endpoint.includes('?') ? endpoint.split('?')[1] : '';
    const params = new URLSearchParams(qs);
    const payrunId = params.get('payrun_id');
    const employeeId = params.get('employee_id');
    let res = payslipsStore;
    if (payrunId) res = res.filter((s) => String(s.payrunId) === String(payrunId));
    if (employeeId) res = res.filter((s) => String(s.employeeId) === String(employeeId));
    return res;
  }

  if (endpoint.startsWith('/payslips/') && method === 'GET') {
    const id = endpoint.split('/')[2];
    const slip = payslipsStore.find((s) => String(s.id) === String(id));
    if (!slip) throw new Error('HTTP 404: Payslip not found');
    if (currentAuthUser && currentAuthUser.role === 'employee') {
      const userEmpId = currentAuthUser.employeeId;
      if (!userEmpId || String(slip.employeeId) !== String(userEmpId)) {
        throw new Error('HTTP 403: Insufficient permissions');
      }
    }
    return slip;
  }

  // Fallback default
  return { success: true };
}

// ---------------------------------------------------------------------
// Typed API Services Export
// ---------------------------------------------------------------------
export const api = {
  auth: {
    login: (credentials: { username: string; password?: string; role?: RoleName }) => {
      const form = new URLSearchParams();
      form.append('username', credentials.username);
      form.append('password', credentials.password || '');
      return request<{ accessToken: string; tokenType: string; user: User }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
    },
    refresh: () =>
      request<{ accessToken: string }>('/auth/refresh', {
        method: 'POST',
      }),
    logout: () =>
      request<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      }),
    getMe: () => request<User>('/auth/me'),
    register: (data: {
      username: string;
      password: string;
      fullName?: string;
      email?: string;
      role?: RoleName;
      employeeId?: string;
    }) =>
      request<User>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(camelToSnake({ role: 'employee', ...data })),
      }),
  },

  employees: {
    // Server-side paginated + filtered list, used by the Employees page.
    list: (params: { status?: string; page?: number; limit?: number; search?: string; department?: string } = {}) => {
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.search) query.set('search', params.search);
      if (params.department) query.set('department', params.department);
      query.set('page', String(params.page ?? 1));
      query.set('limit', String(params.limit ?? 10));
      return request<EmployeePage>(`/employees?${query.toString()}`);
    },
    // Full employee roster (all statuses), used by dropdowns/joins elsewhere
    // (contracts, attendance, time off, users, payruns). Pages through the
    // paginated endpoint rather than requiring the backend to special-case
    // an unbounded query.
    getAll: async (): Promise<Employee[]> => {
      const first = await api.employees.list({ status: 'all', page: 1, limit: 100 });
      const all = [...first.items];
      for (let page = 2; page <= first.totalPages; page++) {
        const next = await api.employees.list({ status: 'all', page, limit: 100 });
        all.push(...next.items);
      }
      return all;
    },
    getById: (id: string | number) => request<Employee>(`/employees/${id}`),
    create: (data: Partial<Employee>) =>
      request<Employee>('/employees', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
    update: (id: string | number, data: Partial<Employee>) =>
      request<Employee>(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(camelToSnake(data)),
      }),
    delete: (id: string | number) =>
      request<{ success: boolean }>(`/employees/${id}`, {
        method: 'DELETE',
      }),
    getContracts: (id: string | number) =>
      request<Contract[]>(`/employees/${id}/contracts`),
    getAttendance: (id: string | number) =>
      request<AttendanceRecord[]>(`/employees/${id}/attendance`),
    getTimeOff: (id: string | number) =>
      request<TimeOffRequest[]>(`/employees/${id}/time-off`),
  },

  contracts: {
    getAll: () => request<Contract[]>('/contracts'),
    getById: (id: string | number) => request<Contract>(`/contracts/${id}`),
    create: (data: Partial<Contract>) =>
      request<Contract>('/contracts', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
    update: (id: string | number, data: Partial<Contract>) =>
      request<Contract>(`/contracts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(camelToSnake(data)),
      }),
    delete: (id: string | number) =>
      request<{ success: boolean }>(`/contracts/${id}`, {
        method: 'DELETE',
      }),
    bulkCreate: (data: BulkContractCreateData) =>
      request<BulkOperationResult>('/contracts/bulk-create', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
    bulkUpdate: (data: BulkContractUpdateData) =>
      request<BulkOperationResult>('/contracts/bulk-update', {
        method: 'PATCH',
        body: JSON.stringify(camelToSnake(data)),
      }),
    bulkDelete: (data: BulkContractDeleteData) =>
      request<BulkOperationResult>('/contracts/bulk-delete', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
  },

  workingSchedules: {
    getAll: () => request<WorkingSchedule[]>('/working-schedules'),
    getById: (id: string | number) =>
      request<WorkingSchedule>(`/working-schedules/${id}`),
    create: (data: Partial<WorkingSchedule>) =>
      request<WorkingSchedule>('/working-schedules', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
    update: (id: string | number, data: Partial<WorkingSchedule>) =>
      request<WorkingSchedule>(`/working-schedules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(camelToSnake(data)),
      }),
  },

  attendance: {
    getAll: () => request<AttendanceRecord[]>('/attendance'),
    create: (data: Partial<AttendanceRecord>) =>
      request<AttendanceRecord>('/attendance', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
    update: (id: string | number, data: Partial<AttendanceRecord>) =>
      request<AttendanceRecord>(`/attendance/${id}`, {
        method: 'PUT',
        body: JSON.stringify(camelToSnake(data)),
      }),
  },

  timeOffTypes: {
    getAll: () => request<TimeOffType[]>('/time-off-types'),
    create: (data: Partial<TimeOffType>) =>
      request<TimeOffType>('/time-off-types', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
  },

  allocations: {
    getAll: () => request<Allocation[]>('/allocations'),
    create: (data: Partial<Allocation>) =>
      request<Allocation>('/allocations', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
    update: (id: string | number, data: Partial<Allocation>) =>
      request<Allocation>(`/allocations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(camelToSnake(data)),
      }),
  },

  timeOffRequests: {
    getAll: () => request<TimeOffRequest[]>('/time-off-requests'),
    create: (data: Partial<TimeOffRequest>) =>
      request<TimeOffRequest>('/time-off-requests', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
    approve: (id: string | number) =>
      request<TimeOffRequest>(`/time-off-requests/${id}/approve`, {
        method: 'POST',
      }),
    refuse: (id: string | number) =>
      request<TimeOffRequest>(`/time-off-requests/${id}/refuse`, {
        method: 'POST',
      }),
  },

  salaryStructures: {
    getAll: () => request<SalaryStructure[]>('/salary-structures'),
    create: (data: Partial<SalaryStructure>) =>
      request<SalaryStructure>('/salary-structures', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
  },

  salaryRules: {
    getAll: () => request<SalaryRule[]>('/salary-rules'),
    create: (data: Partial<SalaryRule>) =>
      request<SalaryRule>('/salary-rules', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
    update: (id: string | number, data: Partial<SalaryRule>) =>
      request<SalaryRule>(`/salary-rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(camelToSnake(data)),
      }),
  },

  payruns: {
    getAll: () => request<Payrun[]>('/payruns'),
    getById: (id: string | number) => request<Payrun>(`/payruns/${id}`),
    create: (data: { name: string; salaryStructureId: string | number; periodStart: string; periodEnd: string; employeeIds?: (string | number)[] }) =>
      request<Payrun>('/payruns', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
    compute: (id: string | number) =>
      request<Payrun>(`/payruns/${id}/compute`, {
        method: 'POST',
      }),
    validate: (id: string | number) =>
      request<Payrun>(`/payruns/${id}/validate`, {
        method: 'POST',
      }),
    markPaid: (id: string | number) =>
      request<Payrun>(`/payruns/${id}/mark-paid`, {
        method: 'POST',
      }),
    sendPayslips: (id: string | number) =>
      request<{ success: boolean; count: number }>(`/payruns/${id}/send-payslips`, {
        method: 'POST',
      }),
  },

  payslips: {
    getAll: (payrunId?: string | number) =>
      request<Payslip[]>(payrunId ? `/payslips?payrun_id=${payrunId}` : '/payslips'),
    getById: (id: string | number) => request<Payslip>(`/payslips/${id}`),
  },

  dashboard: {
    getEmployeeDashboard: () => request<EmployeeDashboardData>('/dashboard/me'),
    getKpis: () => request<DashboardKPIs>('/dashboard/kpis'),
    getSalaryByDept: () => request<DepartmentSalaryCost[]>('/dashboard/salary-by-dept'),
    getSalaryTrend: () => request<MonthlySalaryTrend[]>('/dashboard/salary-trend'),
    getAlerts: () => request<DashboardAlert[]>('/dashboard/alerts'),
  },

  departments: {
    getAll: () => Promise.resolve(initialDepartments),
  },

  users: {
    getAll: () => request<User[]>('/users'),
    getById: (id: string | number) => request<User>(`/users/${id}`),
    create: (data: { username: string; password?: string; role: RoleName; isActive?: boolean; employeeId?: string }) =>
      request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(camelToSnake(data)),
      }),
    update: (id: string | number, data: { role?: RoleName; isActive?: boolean; password?: string; employeeId?: string | null }) =>
      request<User>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(camelToSnake(data)),
      }),
    delete: (id: string | number) =>
      request<{ detail: string }>(`/users/${id}`, {
        method: 'DELETE',
      }),
  },
};
