import { AnalyticsService } from '../services/analytics.service.js';

// Temporal guard cache for the effective date
let cachedEffectiveDate = null;
let cachedEffectiveDateExpires = 0;

async function getEffectiveDate() {
  const now = Date.now();
  if (cachedEffectiveDate && now < cachedEffectiveDateExpires) {
    return cachedEffectiveDate;
  }
  try {
    const effective = await AnalyticsService.getEffectiveAnalyticsDate();
    console.log(`[DASHBOARD] Effective analytics date: ${effective}`);
    cachedEffectiveDate = effective;
    cachedEffectiveDateExpires = now + 5 * 60 * 1000; // 5 mins
    return effective;
  } catch(e) {
    console.error('Failed to get effective analytics date', e);
    return new Date().toISOString().split('T')[0];
  }
}

/** 
 * Calculate startDate and endDate from timeRange, relative to the Effective Analytics Date
 */
function getDateRangeFromTimeRange(timeRange, effectiveDateStr) {
  const effective = new Date(effectiveDateStr);
  effective.setHours(23, 59, 59, 999);
  const endStr = effective.toISOString().split('T')[0];

  const start = new Date(effective);
  start.setHours(0, 0, 0, 0);

  switch (timeRange) {
    case 'today':
      break; // already 00:00:00 of effective date
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '6m':
      start.setMonth(start.getMonth() - 6);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case '3y':
      start.setFullYear(start.getFullYear() - 3);
      break;
    default:
      return { startDate: null, endDate: null }; // all time
  }
  return { startDate: start.toISOString().split('T')[0], endDate: endStr };
}

/**
 * Calculate prevStartDate and prevEndDate based on the current timeRange
 */
function getPrevDateRangeFromTimeRange(timeRange, effectiveDateStr) {
  if (!timeRange || timeRange === 'all') return { prevStartDate: null, prevEndDate: null };

  const effective = new Date(effectiveDateStr);
  effective.setHours(23, 59, 59, 999);
  
  const { startDate, endDate } = getDateRangeFromTimeRange(timeRange, effectiveDateStr);
  if (!startDate || !endDate) return { prevStartDate: null, prevEndDate: null };

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const durationMs = end.getTime() - start.getTime();

  // Previous period ends 1 millisecond before the current start date
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return {
    prevStartDate: prevStart.toISOString().split('T')[0],
    prevEndDate: prevEnd.toISOString().split('T')[0]
  };
}

/** Extracts shared filter params from req.query and processes timeRange and diseases array */
const extractFilters = async (query) => {
  const effectiveDate = await getEffectiveDate();
  const { startDate, endDate } = getDateRangeFromTimeRange(query.timeRange, effectiveDate);

  console.log('[CONTROLLER_DISEASE]', query.disease);

  // Parse disease string back to array if needed.
  // Frontend might send 'disease=COVID-19,Malaria' or 'disease[]=COVID-19&disease[]=Malaria'
  let parsedDisease = null;
  if (query.disease) {
    if (Array.isArray(query.disease)) {
      parsedDisease = query.disease;
    } else {
      parsedDisease = query.disease.split(',').map(d => d.trim()).filter(Boolean);
    }
    if (parsedDisease.length === 0) parsedDisease = null;
  }

  return {
    city:      query.governorate || query.city || null,
    disease:   parsedDisease, // ARRAY OF STRINGS
    gender:    query.gender    ? query.gender.toLowerCase() : null,
    severity:  query.severity  ? parseInt(query.severity, 10) : null,
    status:    query.status    || null,
    hospital:  query.hospital  || null,
    startDate,
    endDate,
  };
};

export const AnalyticsController = {
  // ── Existing endpoints ───────────────────────────────────────────────────────
  async getDailyStats(req, res, next) {
    try {
      const { diseaseId, districtId, dateFrom, dateTo, limit } = req.query;
      const data = await AnalyticsService.getDailyStats({
        diseaseId, districtId, dateFrom, dateTo, limit: Number(limit) || 365,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async upsertDailyStat(req, res, next) {
    try {
      // This triggers AnalyticsService.upsertDailyStat, which then triggers the Alert Engine
      const data = await AnalyticsService.upsertDailyStat(req.body);
      res.status(200).json({ success: true, data, message: 'Stat upserted and alert engine triggered.' });
    } catch (e) {
      console.error('[AnalyticsController] Error in upsertDailyStat:', e);
      next(e);
    }
  },


  async getDiseaseSummary(req, res, next) {
    try {
      const data = await AnalyticsService.getDiseaseSummary();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getReports(req, res, next) {
    try {
      const { userId, type, limit, offset } = req.query;
      const data = await AnalyticsService.getReports({
        userId, type, limit: Number(limit) || 50, offset: Number(offset) || 0,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async createReport(req, res, next) {
    try {
      const data = await AnalyticsService.createReport({ ...req.body, user_id: req.user.id });
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },

  // ── NEW: filter-aware dashboard endpoints ────────────────────────────────────

  async getKpis(req, res, next) {
    try {
      console.log("Analytics Query", req.query);
      const filters = await extractFilters(req.query);
      const data = await AnalyticsService.getKpis(filters);

      // Fetch previous period for correct Trend comparison
      const effectiveDate = await getEffectiveDate();
      const { prevStartDate, prevEndDate } = getPrevDateRangeFromTimeRange(req.query.timeRange, effectiveDate);
      
      let prevData = null;
      if (prevStartDate && prevEndDate) {
        const prevFilters = { ...filters, startDate: prevStartDate, endDate: prevEndDate };
        prevData = await AnalyticsService.getKpis(prevFilters);
      }

      console.log('API Response', { success: true, data, prevData });
      res.json({ success: true, data, prevData });
    } catch (e) { next(e); }
  },

  async getTrends(req, res, next) {
    try {
      console.log("Analytics Query", req.query);
      const filters = await extractFilters(req.query);
      const data = await AnalyticsService.getTrends(filters);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getBubbleData(req, res, next) {
    try {
      console.log("Analytics Query", req.query);
      const filters = await extractFilters(req.query);
      console.log('[CONTROLLER_GOV]', filters.city);
      const data = await AnalyticsService.getBubbleData(filters);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getSeverityData(req, res, next) {
    try {
      console.log("Analytics Query", req.query);
      const filters = await extractFilters(req.query);
      const data = await AnalyticsService.getSeverityData(filters);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getDiseaseBreakdown(req, res, next) {
    try {
      console.log("Analytics Query", req.query);
      const filters = await extractFilters(req.query);
      const data = await AnalyticsService.getDiseaseBreakdown(filters);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getDiseaseList(req, res, next) {
    try {
      const data = await AnalyticsService.getDiseaseList();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getCityList(req, res, next) {
    try {
      const data = await AnalyticsService.getCityList();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
};
