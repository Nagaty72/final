import { api } from './api';

const BASE = '/api/v1/analytics';

// ── Legacy (keep for reports page etc.) ─────────────────────────────────────
export const fetchDiseaseTrends = async (districtId = null, days = 30) => {
  return api.get(`${BASE}/daily-stats`, { districtId, days });
};

// ── New filter-aware dashboard endpoints ────────────────────────────────────

/**
 * All dashboard fetch functions accept the same filter shape:
 * { city, disease, gender, severity, startDate, endDate }
 * Null / undefined values are automatically stripped by api.get().
 */

export const getDashboardKpis = (filters = {}) =>
  api.get(`${BASE}/kpis`, filters);

export const getDashboardTrends = (filters = {}) =>
  api.get(`${BASE}/trends`, filters);

export const getDashboardBubble = (filters = {}) =>
  api.get(`${BASE}/bubble-data`, filters);

export const getDashboardSeverity = (filters = {}) =>
  api.get(`${BASE}/severity`, filters);

export const getDashboardDiseaseBreakdown = (filters = {}) =>
  api.get(`${BASE}/disease-breakdown`, filters);

export const getDiseaseList = () =>
  api.get(`${BASE}/disease-list`);

export const getCityList = () =>
  api.get(`${BASE}/city-list`);
