import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

// Dashboard
router.get('/dashboard', authorize('super_admin', 'decision_maker'), AnalyticsController.getDashboardData);

// Stats & predictions — decision makers and admins
router.get('/daily-stats', authorize('super_admin', 'decision_maker'), AnalyticsController.getDailyStats);
router.get('/predictions', authorize('super_admin', 'decision_maker'), AnalyticsController.getPredictions);
router.get('/disease-summary', authorize('super_admin', 'decision_maker'), AnalyticsController.getDiseaseSummary);

// Reports
router.get('/reports', authorize('super_admin', 'decision_maker'), AnalyticsController.getReports);
router.post('/reports', authorize('super_admin', 'decision_maker'), AnalyticsController.createReport);

export default router;
