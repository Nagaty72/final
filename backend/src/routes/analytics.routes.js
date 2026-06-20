import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

// --- Instrumentation Middleware ---
const endpointCounts = {};
router.use((req, res, next) => {
  if (req.path.startsWith('/')) {
    const path = req.path;
    endpointCounts[path] = (endpointCounts[path] || 0) + 1;
    const reqId = Math.random().toString(36).substring(7);
    const startTime = Date.now();
    console.log(`[REQ-START] [${reqId}] ${path} | Time: ${new Date(startTime).toISOString()}`);
    
    res.on('finish', () => {
      const finishTime = Date.now();
      const duration = finishTime - startTime;
      console.log(`[REQ-FINISH] [${reqId}] ${path} | Duration: ${duration}ms | Status: ${res.statusCode}`);
      console.log(`[STATS] Total calls to ${path} so far: ${endpointCounts[path]}`);
    });
  }
  next();
});
// ----------------------------------

router.get('/kpis',              authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getKpis);
router.get('/trends',            authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getTrends);
router.get('/bubble-data',       authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getBubbleData);
router.get('/severity',          authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getSeverityData);
router.get('/disease-breakdown', authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getDiseaseBreakdown);
router.get('/disease-list',      authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getDiseaseList);
router.get('/city-list',         authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getCityList);

router.get('/daily-stats',     authorize('super_admin', 'decision_maker'), AnalyticsController.getDailyStats);
router.get('/disease-summary', authorize('super_admin', 'decision_maker'), AnalyticsController.getDiseaseSummary);
router.get('/reports',         authorize('super_admin', 'decision_maker'), AnalyticsController.getReports);
router.post('/reports',        authorize('super_admin', 'decision_maker'), AnalyticsController.createReport);
router.post('/daily-stats/upsert', authorize('super_admin'), AnalyticsController.upsertDailyStat);

export default router;
