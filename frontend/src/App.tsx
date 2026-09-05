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

import { LoadingState } from './components/common/LoadingState';
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage';
import { RoleName } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState message="Verifying authentication session..." fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

interface RoleGuardProps {
  allowedRoles: RoleName[];
  children: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { role } = useAuth();

  if (role === 'admin' || allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  return <UnauthorizedPage requiredRole={allowedRoles} />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

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
              <Route
                path="employees"
                element={
                  <RoleGuard allowedRoles={['hr_manager', 'hr_payroll_manager', 'admin']}>
                    <EmployeesPage />
                  </RoleGuard>
                }
              />
              <Route
                path="employees/:id"
                element={
                  <RoleGuard allowedRoles={['hr_manager', 'hr_payroll_manager', 'admin']}>
                    <EmployeeDetailPage />
                  </RoleGuard>
                }
              />
              <Route
                path="contracts"
                element={
                  <RoleGuard allowedRoles={['hr_payroll_user', 'hr_payroll_manager', 'admin']}>
                    <ContractsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="contracts/:id"
                element={
                  <RoleGuard allowedRoles={['hr_payroll_user', 'hr_payroll_manager', 'admin']}>
                    <ContractDetailPage />
                  </RoleGuard>
                }
              />
              <Route
                path="working-schedules"
                element={
                  <RoleGuard allowedRoles={['hr_manager', 'hr_payroll_manager', 'admin']}>
                    <WorkingSchedulesPage />
                  </RoleGuard>
                }
              />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="time-off" element={<TimeOffPage />} />
              <Route
                path="time-off/types"
                element={
                  <RoleGuard allowedRoles={['hr_manager', 'admin']}>
                    <TimeOffPage defaultTab="types" />
                  </RoleGuard>
                }
              />
              <Route
                path="time-off/allocations"
                element={
                  <RoleGuard allowedRoles={['hr_manager', 'hr_payroll_manager', 'admin']}>
                    <TimeOffPage defaultTab="allocations" />
                  </RoleGuard>
                }
              />
              <Route path="time-off/requests" element={<TimeOffPage defaultTab="requests" />} />
              <Route
                path="salary-structures"
                element={
                  <RoleGuard allowedRoles={['hr_payroll_manager', 'admin']}>
                    <SalaryStructuresPage />
                  </RoleGuard>
                }
              />
              <Route
                path="salary-rules"
                element={
                  <RoleGuard allowedRoles={['hr_payroll_manager', 'admin']}>
                    <SalaryRulesPage />
                  </RoleGuard>
                }
              />
              <Route
                path="payruns"
                element={
                  <RoleGuard allowedRoles={['hr_payroll_user', 'hr_payroll_manager', 'admin']}>
                    <PayrunsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="payruns/:id"
                element={
                  <RoleGuard allowedRoles={['hr_payroll_user', 'hr_payroll_manager', 'admin']}>
                    <PayrunDetailPage />
                  </RoleGuard>
                }
              />
              <Route path="payslips" element={<PayslipsPage />} />
              <Route path="payslips/:id" element={<PayslipDetailPage />} />
              <Route path="unauthorized" element={<UnauthorizedPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
