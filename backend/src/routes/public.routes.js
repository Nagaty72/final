import { Router } from 'express';
import { getSupabase } from '../config/supabase.js';
import NodeCache from 'node-cache';
import { HospitalController } from '../controllers/hospital.controller.js';

const router = Router();
const cache = new NodeCache({ stdTTL: 120, checkperiod: 60 }); // 2-min cache

/**
 * GET /api/v1/public/stats
 * No authentication required — returns aggregate platform metrics for the landing page.
 */
router.get('/stats', async (req, res) => {
  console.log('[BACKEND REQUEST RECEIVED] GET /api/v1/public/stats');
  const CACHE_KEY = 'public_landing_stats';

  const cached = cache.get(CACHE_KEY);
  if (cached) {
    console.log('[BACKEND CACHE HIT]', JSON.stringify(cached));
    return res.json({ success: true, data: cached, cached: true });
  }

  const db = getSupabase();
  if (!db) {
    return res.status(503).json({
      success: false,
      error: 'Database not configured',
    });
  }

  try {
    let kpiResult, diseasesResult, governoratesResult, breakdownResult;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      [
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

      const hasError = kpiResult.error || diseasesResult.error || governoratesResult.error || breakdownResult.error;
      if (!hasError) break;
      
      attempts++;
      if (attempts >= maxAttempts) break; // Will throw below
      
      console.warn(`[public/stats] Database query failed, retrying (${attempts}/${maxAttempts})...`);
      await new Promise(res => setTimeout(res, 1500)); // wait 1.5s before retry
    }

    if (kpiResult.error) throw new Error(`KPI RPC Error: ${kpiResult.error.message}`);
    if (diseasesResult.error) throw new Error(`Diseases Query Error: ${diseasesResult.error.message}`);
    if (governoratesResult.error) throw new Error(`Districts Query Error: ${governoratesResult.error.message}`);
    if (breakdownResult.error) throw new Error(`Breakdown RPC Error: ${breakdownResult.error.message}`);

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

    console.log('[BACKEND RPC RESULT] get_dashboard_kpis:', JSON.stringify(kpiResult));
    const kpiData = Array.isArray(kpiResult.data) ? kpiResult.data[0] : (kpiResult.data || {});

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
    console.log('[BACKEND FINAL RESPONSE]', JSON.stringify(stats));
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[public/stats] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch public stats' });
  }
});

/**
 * GET /api/v1/public/hospitals
 * Public access to hospital list (read-only)
 */
router.get('/hospitals', HospitalController.getAll);

/**
 * GET /api/v1/public/hospitals/nearby
 * Public access to nearby hospitals (read-only)
 */
router.get('/hospitals/nearby', HospitalController.findNearby);

/**
 * GET /api/v1/public/cities
 * Public access to unique governorates/cities
 */
router.get('/cities', async (req, res) => {
  try {
    const db = getSupabase();
    if (!db) return res.status(503).json({ success: false, error: 'Database not configured' });
    
    const { data, error } = await db.from('districts').select('city').order('city');
    if (error) throw error;
    
    const uniqueCities = [...new Set(data.map(d => d.city).filter(Boolean))];
    return res.json({ success: true, data: uniqueCities });
  } catch (err) {
    console.error('[public/cities] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch cities' });
  }
});

export default router;
