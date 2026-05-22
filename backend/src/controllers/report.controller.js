import { ReportService } from '../services/report.service.js';

/**
 * ReportController
 * All routes are pre-guarded by authMiddleware + authorize('super_admin','decision_maker')
 */
export const ReportController = {

  /** GET /api/v1/reports/templates */
  getTemplates(req, res) {
    try {
      const templates = ReportService.getTemplates();
      res.json({ success: true, data: templates });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  /** GET /api/v1/reports/filter-options */
  async getFilterOptions(req, res, next) {
    try {
      const data = await ReportService.getFilterOptions();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  /** POST /api/v1/reports/preview */
  async preview(req, res, next) {
    try {
      const { templateId, filters = {} } = req.body;
      if (!templateId) {
        return res.status(400).json({ success: false, error: 'templateId is required.' });
      }
      const data = await ReportService.generatePreview(templateId, filters);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  /** POST /api/v1/reports/export */
  async exportReport(req, res, next) {
    try {
      const { templateId, filters = {}, format = 'pdf' } = req.body;
      if (!templateId) {
        return res.status(400).json({ success: false, error: 'templateId is required.' });
      }
      if (!['pdf', 'excel'].includes(format)) {
        return res.status(400).json({ success: false, error: 'format must be "pdf" or "excel".' });
      }

      const { buffer, filename, contentType } = await ReportService.generateExport(templateId, filters, format);

      res.set({
        'Content-Type':        contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      buffer.length,
        'Cache-Control':       'no-store',
      });
      res.send(buffer);
    } catch (e) { next(e); }
  },
};
