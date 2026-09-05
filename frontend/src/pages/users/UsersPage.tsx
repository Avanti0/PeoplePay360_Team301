import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { User, RoleName, Employee } from '../../types';
import { validateRequired, validateMinLength } from '../../utils/validation';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  Shield,
  UserCheck,
  Edit2,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Building2,
  Lock,
  AlertTriangle,
  X,
} from 'lucide-react';

const ROLE_OPTIONS: { value: RoleName; label: string; description: string; badgeColor: string }[] = [
  {
    value: 'admin',
    label: 'System Admin',
    description: 'Full control over system settings, users, payroll rules, and organization data.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    value: 'hr_payroll_manager',
    label: 'HR Payroll Manager',
    description: 'Validates payruns, marks paid, and configures salary structures and rules.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    value: 'hr_manager',
    label: 'HR Manager',
    description: 'Manages employees, contracts, working schedules, and time off approvals.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    value: 'hr_payroll_user',
    label: 'HR Payroll User',
    description: 'Computes payruns and views employee compensation breakdowns.',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  {
    value: 'employee',
    label: 'Employee (Self-Service)',
    description: 'Self-service portal access for attendance, leave requests, and personal payslips.',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
  },
];

export const UsersPage: React.FC = () => {
  const { user: currentAuthUser, hasRole } = useAuth();
  const { success, error } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<{
    username: string;
    password: string;
    role: RoleName;
    employeeId: string;
    isActive: boolean;
  }>({
    username: '',
    password: '',
    role: 'employee',
    employeeId: '',
    isActive: true,
  });

  const [editForm, setEditForm] = useState<{
    role: RoleName;
    employeeId: string;
    isActive: boolean;
    password: string;
  }>({
    role: 'employee',
    employeeId: '',
    isActive: true,
    password: '',
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);

  const isAdmin = hasRole('admin') || currentAuthUser?.role === 'admin';

  const fetchUsersAndEmployees = async () => {
    setIsLoading(true);
    try {
      const [usersData, empData] = await Promise.all([
        api.users.getAll(),
        api.employees.getAll(),
      ]);
      setUsers(usersData || []);
      setEmployees(empData || []);
    } catch (err: any) {
      error(err.message || 'Failed to load users data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsersAndEmployees();
    }
  }, [isAdmin]);

  // Derived statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const privileged = users.filter(
      (u) => u.role === 'admin' || u.role === 'hr_payroll_manager' || u.role === 'hr_manager'
    ).length;
    const linked = users.filter((u) => u.employeeId).length;
    return { total, active, privileged, linked };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.employeeName && u.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive) ||
        (statusFilter === 'inactive' && !u.isActive);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Available employees for linking (not already assigned to another user)
  const availableEmployees = useMemo(() => {
    const usedEmployeeIds = new Set(
      users.filter((u) => u.employeeId && (!selectedUser || u.id !== selectedUser.id)).map((u) => u.employeeId)
    );
    return employees.filter((e) => !usedEmployeeIds.has(e.id));
  }, [employees, users, selectedUser]);

  // Handlers
  const handleOpenCreateModal = () => {
    setCreateForm({
      username: '',
      password: '',
      role: 'employee',
      employeeId: '',
      isActive: true,
    });
    setFormErrors({});
    setShowPassword(false);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setEditForm({
      role: userToEdit.role,
      employeeId: userToEdit.employeeId || '',
      isActive: userToEdit.isActive,
      password: '',
    });
    setFormErrors({});
    setShowPassword(false);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (userToDelete: User) => {
    setSelectedUser(userToDelete);
    setIsDeleteModalOpen(true);
  };

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const userReq = validateRequired(createForm.username, 'Username');
    if (userReq) errors.username = userReq;
    else {
      const userLen = validateMinLength(createForm.username.trim(), 3, 'Username');
      if (userLen) errors.username = userLen;
    }

    const passReq = validateRequired(createForm.password, 'Password');
    if (passReq) errors.password = passReq;
    else {
      const passLen = validateMinLength(createForm.password, 6, 'Password');
      if (passLen) errors.password = passLen;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (editForm.password && editForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setIsSubmitting(true);
    try {
      await api.users.create({
        username: createForm.username.trim(),
        password: createForm.password,
        role: createForm.role,
        isActive: createForm.isActive,
        employeeId: createForm.employeeId || undefined,
      });
      success(`User account '${createForm.username}' created successfully!`);
      setIsCreateModalOpen(false);
      setFormErrors({});
      await fetchUsersAndEmployees();
    } catch (err: any) {
      error(err.message || 'Failed to create user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!validateEditForm()) return;

    setIsSubmitting(true);
    try {
      await api.users.update(selectedUser.id, {
        role: editForm.role,
        isActive: editForm.isActive,
        password: editForm.password ? editForm.password : undefined,
        employeeId: editForm.employeeId || null,
      });
      success(`User account '${selectedUser.username}' updated successfully!`);
      setIsEditModalOpen(false);
      setFormErrors({});
      await fetchUsersAndEmployees();
    } catch (err: any) {
      error(err.message || 'Failed to update user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    if (selectedUser.id === currentAuthUser?.id) {
      error('You cannot delete your own logged-in admin account.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.users.delete(selectedUser.id);
      success(`User account '${selectedUser.username}' deleted successfully.`);
      setIsDeleteModalOpen(false);
      await fetchUsersAndEmployees();
    } catch (err: any) {
      error(err.message || 'Failed to delete user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (targetUser: User) => {
    try {
      const nextStatus = !targetUser.isActive;
      await api.users.update(targetUser.id, { isActive: nextStatus });
      success(`User '${targetUser.username}' marked as ${nextStatus ? 'Active' : 'Inactive'}.`);
      await fetchUsersAndEmployees();
    } catch (err: any) {
      error(err.message || 'Failed to update account status');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-amber-900">Admin Privileges Required</h3>
          <p className="text-sm text-amber-700 max-w-md mx-auto">
            The User & Access Management console is strictly restricted to System Administrators.
            Please sign in with an account that has the <strong>admin</strong> role to view and manage user accounts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                User & Access Management
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Admin control panel for system users, passwords, RBAC assignments, and employee linkage
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsersAndEmployees}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh user list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-purple-500/25 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Users</p>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.total}</p>
          <p className="text-[11px] text-slate-500 mt-1">Configured accounts</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Status</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{stats.active}</p>
          <p className="text-[11px] text-slate-500 mt-1">Can log in to system</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Admin & Managers</p>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-2">{stats.privileged}</p>
          <p className="text-[11px] text-slate-500 mt-1">Elevated roles</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Linked Employees</p>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">{stats.linked}</p>
          <p className="text-[11px] text-slate-500 mt-1">Tied to staff profile</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by username, employee name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-700 outline-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">System Admin</option>
              <option value="hr_payroll_manager">HR Payroll Manager</option>
              <option value="hr_manager">HR Manager</option>
              <option value="hr_payroll_user">HR Payroll User</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-700 outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">User / Account</th>
                <th className="py-3.5 px-6">RBAC Role</th>
                <th className="py-3.5 px-6">Linked Employee Profile</th>
                <th className="py-3.5 px-6">Account Status</th>
                <th className="py-3.5 px-6">Created / Login</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                    Loading user accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleConfig = ROLE_OPTIONS.find((r) => r.value === u.role) || ROLE_OPTIONS[4];
                  const isCurrent = u.id === currentAuthUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* User Account */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center flex-shrink-0 border border-purple-200 uppercase">
                            {u.username.substring(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">{u.username}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-purple-100 text-purple-700 border border-purple-200 uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              ID: {u.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* RBAC Role */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${roleConfig.badgeColor}`}
                        >
                          <Shield className="w-3 h-3" />
                          {roleConfig.label}
                        </span>
                      </td>

                      {/* Linked Employee */}
                      <td className="py-4 px-6">
                        {u.employeeName ? (
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">{u.employeeName}</span>
                            <span className="text-[11px] text-slate-500 block">
                              {u.department ? `${u.department} • ` : ''}
                              {u.employeeEmail || u.email || 'No email'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400 italic">
                            Unlinked / System Account
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title={`Click to ${u.isActive ? 'deactivate' : 'activate'} user`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Created / Last Login */}
                      <td className="py-4 px-6 text-[11px] text-slate-500">
                        <div>
                          <span className="block text-slate-700 font-medium">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Seeded'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {u.lastLoginAt ? `Last: ${new Date(u.lastLoginAt).toLocaleTimeString()}` : 'No login yet'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-colors"
                            title="Edit User & Permissions"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed border-slate-200 text-slate-400'
                                : 'border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50'
                            }`}
                            title={isCurrent ? 'Cannot delete your own active account' : 'Delete User'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Create New System User</h3>
                  <p className="text-[11px] text-slate-500">Configure credentials and assign RBAC permission role</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. jdoe or emp-009"
                  value={createForm.username}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, username: e.target.value });
                    if (formErrors.username) setFormErrors({ ...formErrors, username: '' });
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    formErrors.username ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  } focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs font-medium text-slate-900 outline-none`}
                  required
                />
                {formErrors.username && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{formErrors.username}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={createForm.password}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, password: e.target.value });
                      if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
                    }}
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border ${
                      formErrors.password ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    } focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs font-medium text-slate-900 outline-none`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{formErrors.password}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  RBAC Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as RoleName })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs font-semibold text-slate-900 outline-none bg-white"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Employee */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Link to Employee Profile (Optional)
                </label>
                <select
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs font-medium text-slate-900 outline-none bg-white"
                >
                  <option value="">-- No Linked Employee Profile --</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department} • {emp.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="create-is-active"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                />
                <label htmlFor="create-is-active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Activate account immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Edit User: <span className="text-purple-600">{selectedUser.username}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Update role permissions, linked employee, or password</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Role */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  RBAC Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as RoleName })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs font-semibold text-slate-900 outline-none bg-white"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Employee */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Linked Employee Profile
                </label>
                <select
                  value={editForm.employeeId}
                  onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs font-medium text-slate-900 outline-none bg-white"
                >
                  <option value="">-- No Linked Employee Profile --</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department} • {emp.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Reset Password (Leave blank to keep unchanged)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password (optional, min 6 chars)"
                    value={editForm.password}
                    onChange={(e) => {
                      setEditForm({ ...editForm, password: e.target.value });
                      if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
                    }}
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border ${
                      formErrors.password ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    } focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs font-medium text-slate-900 outline-none`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{formErrors.password}</p>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                />
                <label htmlFor="edit-is-active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Account is Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Delete User Account</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete user account{' '}
                <strong className="text-slate-900">{selectedUser.username}</strong>?
              </p>
              {selectedUser.employeeName && (
                <p className="text-[11px] text-amber-600 font-semibold mt-2">
                  Note: The linked employee profile ({selectedUser.employeeName}) will not be deleted, but will be unlinked.
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
