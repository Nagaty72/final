import { api } from './api';

export const userService = {
  getAll: async () => {
    return api.get('/api/v1/users');
  },

  create: async (userData) => {
    return api.post('/api/v1/users', userData);
  },

  updateRole: async (userId, roleId) => {
    return api.patch(`/api/v1/users/${userId}/role`, {
      role_id: roleId
    });
  },

  delete: async (userId) => {
    return api.delete(`/api/v1/users/${userId}`);
  }
};