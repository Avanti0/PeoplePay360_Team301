import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RoleName } from '../types';
import { api, setAccessToken, setCurrentUser } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: RoleName;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  // Starts true: we don't know yet whether there's a valid session (the
  // httpOnly refresh cookie) until the restore attempt below finishes.
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // On mount, try to restore a real session via the httpOnly refresh
    // cookie — never assume a logged-in user by default.
    (async () => {
      try {
        const refreshed = await api.auth.refresh();
        setAccessToken(refreshed.accessToken);
        const me = await api.auth.getMe();
        setUser(me);
        setCurrentUser(me);
      } catch {
        setUser(null);
        setCurrentUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (username: string, password?: string) => {
    setIsLoading(true);
    try {
      const response = await api.auth.login({ username, password });
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
    } finally {
      setUser(null);
      setCurrentUser(null);
      setAccessToken(null);
      setIsLoading(false);
    }
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
