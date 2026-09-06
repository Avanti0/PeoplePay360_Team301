import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { EmployeeDetailPage } from './pages/employees/EmployeeDetailPage';
import { ContractsPage } from './pages/contracts/ContractsPage';
import { ContractDetailPage } from './pages/contracts/ContractDetailPage';
import { WorkingSchedulesPage } from './pages/schedules/WorkingSchedulesPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { TimeOffPage } from './pages/timeoff/TimeOffPage';
import { SalaryStructuresPage } from './pages/payroll/SalaryStructuresPage';
import { SalaryRulesPage } from './pages/payroll/SalaryRulesPage';
import { PayrunsPage } from './pages/payruns/PayrunsPage';
import { PayrunDetailPage } from './pages/payruns/PayrunDetailPage';
import { PayslipsPage } from './pages/payslips/PayslipsPage';
import { PayslipDetailPage } from './pages/payslips/PayslipDetailPage';
import { UsersPage } from './pages/users/UsersPage';
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage';
import { RoleName } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: RoleName }> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, hasRole, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Authenticating session...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="users" element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="employees/:id" element={<EmployeeDetailPage />} />
              {/* hr_manager+ routes */}
              <Route path="contracts" element={<ProtectedRoute requiredRole="hr_manager"><ContractsPage /></ProtectedRoute>} />
              <Route path="contracts/:id" element={<ProtectedRoute requiredRole="hr_manager"><ContractDetailPage /></ProtectedRoute>} />
              <Route path="working-schedules" element={<ProtectedRoute requiredRole="hr_manager"><WorkingSchedulesPage /></ProtectedRoute>} />

              {/* all authenticated users */}
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="time-off" element={<TimeOffPage />} />
              <Route path="time-off/types" element={<TimeOffPage defaultTab="types" />} />
              <Route path="time-off/allocations" element={<TimeOffPage defaultTab="allocations" />} />
              <Route path="time-off/requests" element={<TimeOffPage defaultTab="requests" />} />

              {/* hr_payroll_user+ routes */}
              <Route path="salary-structures" element={<ProtectedRoute requiredRole="hr_payroll_user"><SalaryStructuresPage /></ProtectedRoute>} />
              <Route path="salary-rules" element={<ProtectedRoute requiredRole="hr_payroll_user"><SalaryRulesPage /></ProtectedRoute>} />
              <Route path="payruns" element={<ProtectedRoute requiredRole="hr_payroll_user"><PayrunsPage /></ProtectedRoute>} />
              <Route path="payruns/:id" element={<ProtectedRoute requiredRole="hr_payroll_user"><PayrunDetailPage /></ProtectedRoute>} />

              {/* all authenticated users — employees see only their own payslips (enforced by backend) */}
              <Route path="payslips" element={<PayslipsPage />} />
              <Route path="payslips/:id" element={<PayslipDetailPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
