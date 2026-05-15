import { api } from './api';

export const medicalRecordService = {
  getAll: (params) => api.get('/api/v1/medical-records', { params }),
  getById: (id) => api.get(`/api/v1/medical-records/${id}`),
  create: (data) => api.post('/api/v1/medical-records', data),
  update: (id, data) => api.put(`/api/v1/medical-records/${id}`, data),
  delete: (id) => api.delete(`/api/v1/medical-records/${id}`),
};
