import { api } from './api';

export const getDistricts = async () => {
  const res = await api.get('/api/v1/districts');
  return res.data;
};
