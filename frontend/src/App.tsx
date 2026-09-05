import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
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
  const { isAuthenticated, hasRole } = useAuth();
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
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="contracts/:id" element={<ContractDetailPage />} />
              <Route path="working-schedules" element={<WorkingSchedulesPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="time-off" element={<TimeOffPage />} />
              <Route path="time-off/types" element={<TimeOffPage defaultTab="types" />} />
              <Route path="time-off/allocations" element={<TimeOffPage defaultTab="allocations" />} />
              <Route path="time-off/requests" element={<TimeOffPage defaultTab="requests" />} />
              <Route path="salary-structures" element={<SalaryStructuresPage />} />
              <Route path="salary-rules" element={<SalaryRulesPage />} />
              <Route path="payruns" element={<PayrunsPage />} />
              <Route path="payruns/:id" element={<PayrunDetailPage />} />
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
