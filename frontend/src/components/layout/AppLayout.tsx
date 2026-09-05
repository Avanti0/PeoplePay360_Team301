import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout: React.FC = () => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/dashboard') || pathname === '/') return 'Payroll Operations Dashboard';
    if (pathname.startsWith('/employees')) return 'Employee Directory & Profiles';
    if (pathname.startsWith('/contracts')) return 'Employment Contracts';
    if (pathname.startsWith('/working-schedules')) return 'Working Schedules';
    if (pathname.startsWith('/attendance')) return 'Attendance & Time Logs';
    if (pathname.startsWith('/time-off')) return 'Time Off & Leave Allocations';
    if (pathname.startsWith('/salary-structures')) return 'Salary Structures & Rule Sequence';
    if (pathname.startsWith('/payruns')) return 'Payrun Wizard & History';
    if (pathname.startsWith('/payslips')) return 'Payslips & Salary Breakdown';
    return 'PeoplePay360 Operations';
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={getPageTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
