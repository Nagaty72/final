import { api } from './api';

const BASE = '/api/v1/reports';

/**
 * Report Service — frontend API wrapper for the report system.
 * All endpoints require super_admin or decision_maker role.
 */

/** Fetch the list of available report templates */
export const getReportTemplates = () =>
  api.get(`${BASE}/templates`);

/** Fetch filter dropdown options (diseases, cities, hospitals) */
export const getReportFilterOptions = () =>
  api.get(`${BASE}/filter-options`);

/**
 * Generate a live preview (JSON) — returns KPIs + sample rows + chart data.
 * @param {string} templateId
 * @param {object} filters
 */
export const previewReport = (templateId, filters = {}) =>
  api.post(`${BASE}/preview`, { templateId, filters });

/**
 * Export a real file. Returns a Blob for download.
 * @param {string} templateId
 * @param {object} filters
 * @param {'pdf'|'excel'} format
 */
export async function exportReport(templateId, filters = {}, format = 'pdf') {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ha_token') : null;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const res = await fetch(`${API_BASE}${BASE}/export`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({ templateId, filters, format }),
  });

  if (!res.ok) {
    let errMsg = `Export failed (${res.status})`;
    try { const j = await res.json(); errMsg = j.error || errMsg; } catch (_) {}
    throw new Error(errMsg);
  }

  const blob        = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match       = disposition.match(/filename="([^"]+)"/);
  const filename    = match ? match[1] : `Epicare_Report_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;

  return { blob, filename };
}
