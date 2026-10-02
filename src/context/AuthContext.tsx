import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { getAuthHeaders } from '../utils/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  login: (usernameOrToken: string, passwordOrUser?: string | User) => Promise<void>;
  signup: (data: { email: string; password: string; fullName: string; role?: UserRole; department?: string }) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  updateCurrentUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('fleet_auth_token');
      if (!saved || saved === 'null' || saved === 'undefined') return null;
      return saved.trim();
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('fleet_auth_user');
      if (saved && saved !== 'null' && saved !== 'undefined') {
        return JSON.parse(saved);
      }
    } catch {
      return null;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      let savedToken: string | null = null;
      try {
        const item = localStorage.getItem('fleet_auth_token');
        if (item && item !== 'null' && item !== 'undefined') {
          savedToken = item.trim();
        }
      } catch {
        savedToken = null;
      }

      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: getAuthHeaders(savedToken)
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem('fleet_auth_user', JSON.stringify(data.user));
        } else {
          // Token invalid
          localStorage.removeItem('fleet_auth_token');
          localStorage.removeItem('fleet_auth_user');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        // Network unavailable or server initializing - retain local cached state if present
        console.warn('Auth verification deferred (offline or server starting):', err instanceof Error ? err.message : 'Network unreachable');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (usernameOrToken: string, passwordOrUser?: string | User): Promise<void> => {
    if (typeof passwordOrUser === 'object' && passwordOrUser !== null) {
      // Direct token & user object setting
      const cleanToken = usernameOrToken ? String(usernameOrToken).trim() : '';
      setToken(cleanToken);
      setUser(passwordOrUser);
      localStorage.setItem('fleet_auth_token', cleanToken);
      localStorage.setItem('fleet_auth_user', JSON.stringify(passwordOrUser));
      return;
    }

    // Call API /api/auth/login
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: usernameOrToken,
        password: passwordOrUser
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    const cleanToken = data.token ? String(data.token).trim() : '';
    setToken(cleanToken);
    setUser(data.user);
    localStorage.setItem('fleet_auth_token', cleanToken);
    localStorage.setItem('fleet_auth_user', JSON.stringify(data.user));
  };

  const signup = async (signupData: { email: string; password: string; fullName: string; role?: UserRole; department?: string }): Promise<void> => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.error || 'Signup failed');
    }

    const cleanToken = data.token ? String(data.token).trim() : '';
    setToken(cleanToken);
    setUser(data.user);
    localStorage.setItem('fleet_auth_token', cleanToken);
    localStorage.setItem('fleet_auth_user', JSON.stringify(data.user));
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: getAuthHeaders(token)
        });
      }
    } catch (e) {
      console.warn('Logout request error:', e);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('fleet_auth_token');
      localStorage.removeItem('fleet_auth_user');
    }
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true; // Super admin has all permissions
    return roles.includes(user.role);
  };

  const updateCurrentUser = (userData: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...userData };
      setUser(updated);
      localStorage.setItem('fleet_auth_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        loading: isLoading,
        login,
        signup,
        logout,
        hasRole,
        updateCurrentUser
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
