import { api } from './api';

export const authService = {
  login: (email, password) => api.post('/api/v1/auth/login', { email, password }),
  register: (data) => api.post('/api/v1/auth/register', data),
  checkEmail: (email) => api.get(`/api/v1/auth/check-email?email=${encodeURIComponent(email)}`),
  refresh: (refreshToken) => api.post('/api/v1/auth/refresh', { refreshToken }),
  logout: (refreshToken) => api.post('/api/v1/auth/logout', { refreshToken }),
  getMe: () => api.get('/api/v1/auth/me'),
  updateMe: (data) => api.put('/api/v1/auth/me', data),
};
