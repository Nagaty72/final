import { Router } from 'express';
import { getSupabase } from '../config/supabase.js';
import NodeCache from 'node-cache';

const router = Router();
const cache = new NodeCache({ stdTTL: 120, checkperiod: 60 }); // 2-min cache

/**
 * GET /api/v1/public/stats
 * No authentication required — returns aggregate platform metrics for the landing page.
 */
router.get('/stats', async (req, res) => {
  const CACHE_KEY = 'public_landing_stats';

  const cached = cache.get(CACHE_KEY);
  if (cached) return res.json({ success: true, data: cached, cached: true });

  const db = getSupabase();
  if (!db) {
    return res.status(503).json({
      success: false,
      error: 'Database not configured',
    });
  }

  try {
    const [
      kpiResult,
      diseasesResult,
      governoratesResult,
      breakdownResult,
    ] = await Promise.all([
      db.rpc('get_dashboard_kpis', {
        p_city: null, p_disease: null, p_gender: null,
        p_severity: null, p_start_date: null, p_end_date: null,
      }),
      db.from('diseases').select('id', { count: 'exact', head: true }),
      db.from('districts').select('city').order('city'),
      db.rpc('get_dashboard_disease_breakdown', {
        p_city: null, p_disease: null, p_gender: null,
        p_severity: null, p_start_date: null, p_end_date: null,
      })
    ]);

    // Unique governorates
    const allCities = (governoratesResult.data || []).map(d => d.city).filter(Boolean);
    const uniqueGovernorates = [...new Set(allCities)].length;

    // Top diseases
    let topDiseases = [];
    if (breakdownResult.data && !breakdownResult.error) {
      const rows = breakdownResult.data;
      const totalCases = rows.reduce((s, r) => s + Number(r.total_cases || r.count || 0), 0) || 1;
      topDiseases = rows.slice(0, 6).map(d => {
        const cases = Number(d.total_cases || d.count || 0);
        return {
          name: d.disease_name || d.disease || d.name || 'Unknown',
          cases: cases,
          percentage: Number(((cases / totalCases) * 100).toFixed(1)),
        };
      });
    }

    const kpiData = kpiResult.data ? (Array.isArray(kpiResult.data) ? kpiResult.data[0] : kpiResult.data) : {};

    const stats = {
      totalPatients: kpiData.total_patients || 0,
      activeCases: kpiData.active_cases || 0,
      totalHospitals: kpiData.total_hospitals || 0,
      totalDiseases: diseasesResult.count || 0,
      totalRecords: kpiData.total_cases || 0, // Maps to Total Cases
      governoratesCovered: uniqueGovernorates,
      topDiseases,
    };

    cache.set(CACHE_KEY, stats);
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[public/stats] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch public stats' });
  }
});

export default router;
