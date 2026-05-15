import { AnalyticsService } from '../services/analytics.service.js';

export const AnalyticsController = {
  async getDashboardData(req, res, next) {
    try {
      const data = await AnalyticsService.getDashboardData();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getDailyStats(req, res, next) {
    try {
      const { diseaseId, districtId, dateFrom, dateTo, limit } = req.query;
      const data = await AnalyticsService.getDailyStats({ diseaseId, districtId, dateFrom, dateTo, limit: Number(limit) || 365 });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getPredictions(req, res, next) {
    try {
      const { diseaseId, districtId, limit } = req.query;
      const data = await AnalyticsService.getPredictions({ diseaseId, districtId, limit: Number(limit) || 30 });
      res.json({ success: true, data });
    } catch (e) { next(e); }
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
      const data = await AnalyticsService.getReports({ userId, type, limit: Number(limit) || 50, offset: Number(offset) || 0 });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async createReport(req, res, next) {
    try {
      const data = await AnalyticsService.createReport({ ...req.body, user_id: req.user.id });
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },
};
