import { api } from './api';

export const patientService = {
  getAll: (params) => api.get('/api/v1/patients', { params }),
  getById: (id) => api.get(`/api/v1/patients/${id}`),
  create: (data) => api.post('/api/v1/patients', data),
  update: (id, data) => api.put(`/api/v1/patients/${id}`, data),
  delete: (id) => api.delete(`/api/v1/patients/${id}`),
};
