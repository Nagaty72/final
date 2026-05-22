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
    const savedUser = localStorage.getItem('ha_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // Invalid stored user, clear it
        localStorage.removeItem('ha_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((userData, accessToken, refreshToken) => {
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

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, isAuthenticated }}>

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

