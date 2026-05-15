import { api } from './api';

export const getHospitals = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.city) query.append('city', params.city);
  if (params.type) query.append('type', params.type);
  if (params.districtId) query.append('districtId', params.districtId);
  if (params.limit) query.append('limit', params.limit);
  
  const queryString = query.toString();
  const res = await api.get(`/api/v1/hospitals${queryString ? `?${queryString}` : ''}`);
  return res.data;
};

export const getNearbyHospitals = async (lat, lng, params = {}) => {
  const query = new URLSearchParams({ latitude: lat, longitude: lng });
  if (params.radius) query.append('radius', params.radius);
  if (params.city) query.append('city', params.city);
  if (params.type) query.append('type', params.type);
  if (params.limit) query.append('limit', params.limit);

  const res = await api.get(`/api/v1/hospitals/nearby?${query.toString()}`);
  return res.data;
};

export const createHospital = async (data) => {
  const res = await api.post('/api/v1/hospitals', data);
  return res.data;
};

export const updateHospital = async (id, data) => {
  const res = await api.put(`/api/v1/hospitals/${id}`, data);
  return res.data;
};

export const deleteHospital = async (id) => {
  const res = await api.delete(`/api/v1/hospitals/${id}`);
  return res.data;
};

