import { ReportService } from '../services/report.service.js';

/**
 * ReportController
 * All routes are pre-guarded by authMiddleware + authorize('super_admin','decision_maker')
 */

/**
 * Translate raw errors into safe, user-friendly messages.
 * Never exposes raw PostgreSQL errors to the client.
 */
function toSafeError(e) {
  const msg = e.message || '';
  // Already user-friendly messages from the repository/service layer
  if (msg.startsWith('Invalid filter') || msg.startsWith('Unable to generate') || msg.startsWith('No matching')) {
    return msg;
  }
  // PostgreSQL-level errors — mask them
  if (msg.includes('malformed array') || msg.includes('invalid input syntax') || msg.includes('operator does not exist')) {
    return 'Invalid filter format — please check your filter values and try again.';
  }
  if (msg.includes('permission denied') || msg.includes('42501')) {
    return 'Access denied — insufficient permissions.';
  }
  if (msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('503')) {
    return 'Database temporarily unavailable — please try again shortly.';
  }
  // Generic fallback
  return 'Unable to generate report — please try again or contact support.';
}

export const ReportController = {

  /** GET /api/v1/reports/templates */
  getTemplates(req, res) {
    try {
      const templates = ReportService.getTemplates();
      res.json({ success: true, data: templates });
    } catch (e) {
      console.error('[ReportController] getTemplates error:', e.message);
      res.status(500).json({ success: false, error: toSafeError(e) });
    }
  },

  /** GET /api/v1/reports/filter-options */
  async getFilterOptions(req, res) {
    try {
      const data = await ReportService.getFilterOptions();
      res.json({ success: true, data });
    } catch (e) {
      console.error('[ReportController] getFilterOptions error:', e.message);
      res.status(e.statusCode || 500).json({ success: false, error: toSafeError(e) });
    }
  },

  /** POST /api/v1/reports/preview */
  async preview(req, res) {
    try {
      const { templateId, filters = {} } = req.body;
      if (!templateId) {
        return res.status(400).json({ success: false, error: 'templateId is required.' });
      }
      // Ensure filters is always an object, never null/array/string
      const safeFilters = (filters && typeof filters === 'object' && !Array.isArray(filters)) ? filters : {};
      const data = await ReportService.generatePreview(templateId, safeFilters);
      res.json({ success: true, data });
    } catch (e) {
      console.error('[ReportController] preview error:', e.message, e.original || '');
      const statusCode = e.statusCode || 500;
      res.status(statusCode).json({ success: false, error: toSafeError(e) });
    }
  },

  /** POST /api/v1/reports/export */
  async exportReport(req, res) {
    try {
      const { templateId, filters = {}, format = 'pdf' } = req.body;
      if (!templateId) {
        return res.status(400).json({ success: false, error: 'templateId is required.' });
      }
      if (!['pdf', 'excel'].includes(format)) {
        return res.status(400).json({ success: false, error: 'format must be "pdf" or "excel".' });
      }
      // Ensure filters is always a safe object
      const safeFilters = (filters && typeof filters === 'object' && !Array.isArray(filters)) ? filters : {};

      const { buffer, filename, contentType } = await ReportService.generateExport(templateId, safeFilters, format);

      res.set({
        'Content-Type':        contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      buffer.length,
        'Cache-Control':       'no-store',
      });
      res.send(buffer);
    } catch (e) {
      console.error('[ReportController] exportReport error:', e.message, e.original || '');
      res.status(e.statusCode || 500).json({ success: false, error: toSafeError(e) });
    }
  },
};
