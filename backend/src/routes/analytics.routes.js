import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

/**
 * Analytics API — Role-based access control:
 *
 * ALL ROLES (super_admin, decision_maker, normal_user):
 *   Dashboard KPIs, trends, bubble map, severity, disease/city lists
 *   → Required by Dashboard + Disease Intelligence Map pages (all roles can access those pages)
 *
 * SUPER_ADMIN + DECISION_MAKER only:
 *   Advanced analytics: daily stats, predictions, disease summary, reports
 *   → Reports page and analytics deep-dives (normal_user cannot access those pages)
 *
 * SUPER_ADMIN only:
 *   Admin-level mutations (none in analytics currently — handled via admin panel)
 */

// ── Available to ALL authenticated roles ──────────────────────────────────
router.get('/kpis',              authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getKpis);
router.get('/trends',            authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getTrends);
router.get('/bubble-data',       authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getBubbleData);
router.get('/severity',          authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getSeverityData);
router.get('/disease-breakdown', authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getDiseaseBreakdown);
router.get('/disease-list',      authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getDiseaseList);
router.get('/city-list',         authorize('super_admin', 'decision_maker', 'normal_user'), AnalyticsController.getCityList);

// ── Super Admin + Decision Maker only ────────────────────────────────────
router.get('/daily-stats',     authorize('super_admin', 'decision_maker'), AnalyticsController.getDailyStats);
router.get('/disease-summary', authorize('super_admin', 'decision_maker'), AnalyticsController.getDiseaseSummary);
router.get('/reports',         authorize('super_admin', 'decision_maker'), AnalyticsController.getReports);
router.post('/reports',        authorize('super_admin', 'decision_maker'), AnalyticsController.createReport);

// ── Testing Endpoint for Alerts ──────────────────────────────────────────
router.post('/daily-stats/upsert', authorize('super_admin'), AnalyticsController.upsertDailyStat);

export default router;
