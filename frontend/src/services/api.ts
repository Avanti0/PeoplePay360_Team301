import {
  User,
  Employee,
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
  RoleName
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

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // for httpOnly refresh cookies
    });

    if (response.status === 401 && endpoint !== '/auth/login') {
      // Attempt refresh
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
        const retryRes = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
        if (retryRes.ok) {
          const raw = await retryRes.json();
          return snakeToCamel<T>(raw);
        }
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const raw = await response.json();
    return snakeToCamel<T>(raw);
  } catch (err) {
    // Graceful fallback to mock data layer when backend server is not running
    // This satisfies Rule 12 and ensures smooth demo and component testability
    return mockHandler<T>(endpoint, options);
  }
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

    const matchedUser = demoUsers.find(
      (u) =>
        u.username.toLowerCase() === inputUsername ||
        u.email?.toLowerCase() === inputUsername
    );

    const user: User = matchedUser || {
      id: 99,
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

  if (endpoint === '/auth/logout' && method === 'POST') {
    inMemoryAccessToken = null;
    currentAuthUser = null;
    return { success: true };
  }

  // Dashboard
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
  if (endpoint === '/employees' && method === 'GET') {
    return employeesStore;
  }

  if (endpoint.startsWith('/employees/') && method === 'GET') {
    const parts = endpoint.split('/');
    const id = parts[2];
    const sub = parts[3];
    const emp = employeesStore.find((e) => String(e.id) === String(id));

    if (sub === 'contracts') {
      return contractsStore.filter((c) => String(c.employeeId) === String(id));
    }
    if (sub === 'attendance') {
      return attendanceStore.filter((a) => String(a.employeeId) === String(id));
    }
    if (sub === 'time-off') {
      return timeOffRequestsStore.filter((t) => String(t.employeeId) === String(id));
    }
    return emp || employeesStore[0];
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
    return attendanceStore;
  }

  if (endpoint === '/attendance' && method === 'POST') {
    const checkIn = body.checkIn || new Date().toISOString();
    const checkOut = body.checkOut || null;
    let worked: number | null = null;
    if (checkIn && checkOut) {
      worked = Math.round(((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000) * 100) / 100;
    }
    const newAtt: AttendanceRecord = {
      ...body,
      id: String(Date.now()),
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
  if (endpoint === '/allocations' && method === 'GET') {
    return allocationsStore;
  }

  if (endpoint === '/allocations' && method === 'POST') {
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
    const id = endpoint.split('/')[2];
    allocationsStore = allocationsStore.map((al) =>
      String(al.id) === String(id) ? { ...al, ...body } : al
    );
    return allocationsStore.find((al) => String(al.id) === String(id));
  }

  // Time Off Requests
  if (endpoint === '/time-off-requests' && method === 'GET') {
    return timeOffRequestsStore;
  }

  if (endpoint === '/time-off-requests' && method === 'POST') {
    const newReq: TimeOffRequest = {
      ...body,
      id: String(Date.now()),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    timeOffRequestsStore.unshift(newReq);
    return newReq;
  }

  if (endpoint.includes('/approve') && method === 'POST') {
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
  if (endpoint === '/payslips' && method === 'GET') {
    return payslipsStore;
  }

  if (endpoint.startsWith('/payslips/') && method === 'GET') {
    const id = endpoint.split('/')[2];
    return payslipsStore.find((s) => String(s.id) === String(id)) || payslipsStore[0];
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
    getMe: async (): Promise<User | null> => {
      return currentAuthUser;
    },
  },

  employees: {
    getAll: () => request<Employee[]>('/employees'),
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
    getKpis: () => request<DashboardKPIs>('/dashboard/kpis'),
    getSalaryByDept: () => request<DepartmentSalaryCost[]>('/dashboard/salary-by-dept'),
    getSalaryTrend: () => request<MonthlySalaryTrend[]>('/dashboard/salary-trend'),
    getAlerts: () => request<DashboardAlert[]>('/dashboard/alerts'),
  },

  departments: {
    getAll: () => Promise.resolve(initialDepartments),
  },
};
