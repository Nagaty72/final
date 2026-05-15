import { api } from './api';

export const fetchDiseaseTrends = async (districtId = null, days = 30) => {
  const query = districtId ? `?districtId=${districtId}&days=${days}` : `?days=${days}`;
  const res = await api.get(`/api/v1/analytics/daily-stats${query}`);
  return res.data;
};

export const getDashboardData = async () => {
  const res = await api.get('/api/v1/analytics/dashboard');
  return res.data;
};
