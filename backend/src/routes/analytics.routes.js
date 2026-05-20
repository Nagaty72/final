import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

// Existing endpoints
router.get('/daily-stats',    authorize('super_admin', 'decision_maker'), AnalyticsController.getDailyStats);
router.get('/predictions',    authorize('super_admin', 'decision_maker'), AnalyticsController.getPredictions);
router.get('/disease-summary',authorize('super_admin', 'decision_maker'), AnalyticsController.getDiseaseSummary);
router.get('/reports',        authorize('super_admin', 'decision_maker'), AnalyticsController.getReports);
router.post('/reports',       authorize('super_admin', 'decision_maker'), AnalyticsController.createReport);

// NEW: filter-aware dashboard endpoints
router.get('/kpis',             authorize('super_admin', 'decision_maker'), AnalyticsController.getKpis);
router.get('/trends',           authorize('super_admin', 'decision_maker'), AnalyticsController.getTrends);
router.get('/bubble-data',      authorize('super_admin', 'decision_maker'), AnalyticsController.getBubbleData);
router.get('/severity',         authorize('super_admin', 'decision_maker'), AnalyticsController.getSeverityData);
router.get('/disease-breakdown',authorize('super_admin', 'decision_maker'), AnalyticsController.getDiseaseBreakdown);
router.get('/disease-list',     authorize('super_admin', 'decision_maker'), AnalyticsController.getDiseaseList);
router.get('/city-list',        authorize('super_admin', 'decision_maker'), AnalyticsController.getCityList);

export default router;
