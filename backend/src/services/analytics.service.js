import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import { AnalyticsAlertService } from './analytics-alert.service.js';
import NodeCache from 'node-cache';

// 60-second TTL
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// Helper to cache RPC results
async function withCache(cacheKey, fetchFn) {
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const data = await fetchFn();
  cache.set(cacheKey, data);
  return data;
}

export const AnalyticsService = {
  getDailyStats:    (filters) => AnalyticsRepository.getDailyStats(filters),
  upsertDailyStat:  async (data) => {
    const result = await AnalyticsRepository.upsertDailyStat(data || {});
    // Fire-and-forget alert evaluation
    AnalyticsAlertService.evaluateDailyStats(data || {}).catch(e => console.error('[AnalyticsService] evaluateDailyStats threw an error:', e));
    return result;
  },
  getDiseaseSummary:()        => AnalyticsRepository.getDiseaseSummary(),
  getReports:       (filters) => AnalyticsRepository.getReports(filters),
  createReport:     (data)    => AnalyticsRepository.createReport(data),

  getEffectiveAnalyticsDate: () => AnalyticsRepository.getEffectiveAnalyticsDate(),

  getKpis: (filters) => {
    const key = `kpis_${JSON.stringify(filters)}`;
    return withCache(key, () => AnalyticsRepository.getKpis(filters));
  },
  
  getTrends: (filters) => {
    const key = `trends_${JSON.stringify(filters)}`;
    return withCache(key, () => AnalyticsRepository.getTrends(filters));
  },
  
  getBubbleData: (filters) => {
    const key = `bubble_${JSON.stringify(filters)}`;
    return withCache(key, () => AnalyticsRepository.getBubbleData(filters));
  },
  
  getSeverityData: (filters) => AnalyticsRepository.getSeverityData(filters),
  
  getDiseaseBreakdown: (filters) => AnalyticsRepository.getDiseaseBreakdown(filters),
  
  getDiseaseList: () => {
    return withCache('disease_list', () => AnalyticsRepository.getDiseaseList());
  },
  
  getCityList: () => {
    return withCache('city_list', () => AnalyticsRepository.getCityList());
  },
};
