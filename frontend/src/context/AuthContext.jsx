'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '@/services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check localStorage for existing session
  useEffect(() => {
    const savedToken = localStorage.getItem('ha_token');
    const savedUser  = localStorage.getItem('ha_user');
    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Security: only clear if is_verified is explicitly false.
        // If the field is absent (legacy sessions), preserve the session
        // and let RouteGuard / backend middleware enforce access.
        if (parsed?.is_verified === false) {
          console.warn('[AUTHCONTEXT_RESTORE] Restored session is_verified=false — clearing.');
          localStorage.removeItem('ha_token');
          localStorage.removeItem('ha_user');
          localStorage.removeItem('ha_refresh');
        } else {
          console.log('[AUTHCONTEXT_RESTORE] Session restored for:', parsed?.email, 'is_verified:', parsed?.is_verified);
          setToken(savedToken);
          setUser(parsed);
        }
      } catch {
        localStorage.removeItem('ha_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((userData, accessToken, refreshToken) => {
    console.log('[RUNTIME] AuthContext.login called for user:', userData.email, 'is_verified:', userData.is_verified);
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('ha_token', accessToken);
    localStorage.setItem('ha_user', JSON.stringify(userData));
    if (refreshToken) {
      localStorage.setItem('ha_refresh', refreshToken);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('ha_refresh');
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch {
      // Ignore logout API errors
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('ha_token');
    localStorage.removeItem('ha_user');
    localStorage.removeItem('ha_refresh');
    sessionStorage.clear();
    window.location.href = '/';
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('ha_user', JSON.stringify(userData));
  }, []);

  const isAuthenticated = !!token && !!user && user.is_verified === true;
  const isVerified = !!user && user.is_verified === true;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, isAuthenticated, isVerified }}>

      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

