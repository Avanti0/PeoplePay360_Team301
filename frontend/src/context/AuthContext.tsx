import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RoleName } from '../types';
import { api, setAccessToken, setCurrentUser } from '../services/api';
import { demoUsers } from '../services/mockData';

interface AuthContextType {
  user: User | null;
  role: RoleName;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password?: string, role?: RoleName) => Promise<void>;
  logout: () => Promise<void>;
  switchUserRole: (role: RoleName) => void;
  hasRole: (requiredRole: RoleName) => boolean;
}

const ROLE_HIERARCHY: Record<RoleName, number> = {
  employee: 1,
  hr_manager: 2,
  hr_payroll_user: 3,
  hr_payroll_manager: 4,
  admin: 5,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Admin in demo mode so full features are visible immediately
  const [user, setUser] = useState<User | null>(demoUsers[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Initial token & user setup
    setCurrentUser(user);
    if (user) {
      setAccessToken('in_memory_jwt_' + user.role);
    }
  }, [user]);

  const login = async (username: string, password?: string, role?: RoleName) => {
    setIsLoading(true);
    try {
      const response = await api.auth.login({ username, password, role });
      setUser(response.user);
      setCurrentUser(response.user);
      setAccessToken(response.accessToken);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.auth.logout();
      setUser(null);
      setCurrentUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchUserRole = (targetRole: RoleName) => {
    const matched = demoUsers.find((u) => u.role === targetRole) || {
      id: '999',
      username: `demo.${targetRole}`,
      role: targetRole,
      employeeName: `Demo ${targetRole.replace(/_/g, ' ').toUpperCase()}`,
      isActive: true,
    };
    setUser(matched);
    setCurrentUser(matched);
    setAccessToken('in_memory_jwt_' + targetRole);
  };

  const hasRole = (requiredRole: RoleName): boolean => {
    if (!user) return false;
    const currentLevel = ROLE_HIERARCHY[user.role] || 1;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 1;
    return currentLevel >= requiredLevel;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'employee',
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchUserRole,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
