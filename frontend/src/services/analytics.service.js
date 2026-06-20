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

const formatParams = (filters = {}) => {
  const params = {
    governorate: filters.city || filters.governorate,
    disease: Array.isArray(filters.disease) ? filters.disease.join(',') : filters.disease,
    gender: filters.gender,
    severity: filters.severity,
    status: filters.status,
    hospital: filters.hospital,
    timeRange: filters.timeRange,
    startDate: filters.startDate,
    endDate: filters.endDate
  };
  console.log("Analytics Request Params", params);
  return params;
};

export const getDashboardKpis = (filters = {}) =>
  api.get(`${BASE}/kpis`, formatParams(filters));

export const getDashboardTrends = (filters = {}) =>
  api.get(`${BASE}/trends`, formatParams(filters));

export const getDashboardBubble = (filters = {}) =>
  api.get(`${BASE}/bubble-data`, formatParams(filters));

export const getDashboardSeverity = (filters = {}) =>
  api.get(`${BASE}/severity`, formatParams(filters));

export const getDashboardDiseaseBreakdown = (filters = {}) =>
  api.get(`${BASE}/disease-breakdown`, formatParams(filters));

export const getDiseaseList = () =>
  api.get(`${BASE}/disease-list`);

export const getCityList = () =>
  api.get(`${BASE}/city-list`);
