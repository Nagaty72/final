import { api } from './api';

export const diseaseService = {
  getAll: (params) => api.get('/api/v1/diseases', { params }),
  getById: (id) => api.get(`/api/v1/diseases/${id}`),
  create: (data) => api.post('/api/v1/diseases', data),
  update: (id, data) => api.put(`/api/v1/diseases/${id}`, data),
  delete: (id) => api.delete(`/api/v1/diseases/${id}`),
};
