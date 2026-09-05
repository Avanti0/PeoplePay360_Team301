import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, RoleName } from '../types';
import { api, setAccessToken, setCurrentUser } from '../services/api';
import { demoUsers } from '../services/mockData';

export interface AuthContextType {
  user: User | null;
  role: RoleName;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password?: string, role?: RoleName) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  switchUserRole: (role: RoleName) => void;
  hasRole: (requiredRole: RoleName) => boolean;
  clearError: () => void;
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
  // Authentication states: loading, authenticated, unauthenticated
  const [user, setUser] = useState<User | null>(demoUsers[0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check and restore session on mount (silent refresh / checkMe)
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        // Attempt silent refresh against backend cookie / session
        const refreshed = await api.auth.refresh().catch(() => false);
        if (refreshed && isMounted) {
          const me = await api.auth.getMe().catch(() => null);
          if (me) {
            setUser(me);
            setCurrentUser(me);
            return;
          }
        }

        // If backend session not present, retain default demo admin or mock user
        if (isMounted && user) {
          setCurrentUser(user);
          setAccessToken('in_memory_jwt_' + user.role);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Initial session check resolved to unauthenticated state:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username: string, password?: string, role?: RoleName) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.auth.login({ username, password, role });
      setUser(response.user);
      setCurrentUser(response.user);
      setAccessToken(response.accessToken);
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Please check your credentials.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.auth.logout();
    } catch (err) {
      console.warn('Logout endpoint failed, proceeding with local state purge:', err);
    } finally {
      setUser(null);
      setCurrentUser(null);
      setAccessToken(null);
      setIsLoading(false);
    }
  };

  const refreshAuth = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await api.auth.refresh();
      if (res && res.accessToken) {
        setAccessToken(res.accessToken);
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err?.message || 'Session refresh failed');
      return false;
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
        error,
        login,
        logout,
        refreshAuth,
        switchUserRole,
        hasRole,
        clearError,
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
