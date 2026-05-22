import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

/**
 * Report API Routes
 * ALL routes require: authMiddleware (applied in server.js) + RBAC below.
 * Accessible by: super_admin, decision_maker ONLY.
 * normal_user will receive 403 Forbidden.
 */
const reportAccess = authorize('super_admin', 'decision_maker');

// GET  /api/v1/reports/templates       — list of available report templates
router.get('/templates',      reportAccess, ReportController.getTemplates);

// GET  /api/v1/reports/filter-options  — diseases, cities, hospitals for dropdowns
router.get('/filter-options', reportAccess, ReportController.getFilterOptions);

// POST /api/v1/reports/preview         — returns JSON preview (max 50 rows + KPIs)
router.post('/preview',       reportAccess, ReportController.preview);

// POST /api/v1/reports/export          — streams real PDF or Excel file
router.post('/export',        reportAccess, ReportController.exportReport);

export default router;
