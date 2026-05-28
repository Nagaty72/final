import { getSupabase } from '../config/supabase.js';

const db = () => {
  const s = getSupabase();
  if (!s) throw Object.assign(new Error('Database not configured'), { statusCode: 503 });
  return s;
};

// ─── SAFE FILTER NORMALIZATION ────────────────────────────────────────────────
/**
 * Normalize a filter value to a safe scalar (TEXT) for PostgreSQL.
 * - Unwraps single-element arrays to their scalar value.
 * - Returns null for empty/blank values.
 * - Converts everything to a trimmed string.
 */
function toScalarText(val) {
  if (val === null || val === undefined) return null;
  // Unwrap arrays — take first non-empty element
  if (Array.isArray(val)) {
    const first = val.find(v => v !== null && v !== undefined && String(v).trim() !== '');
    return first != null ? String(first).trim() : null;
  }
  const s = String(val).trim();
  return s === '' ? null : s;
}

/**
 * Normalize a filter value to a safe integer for PostgreSQL.
 * Returns null if the value is not a valid integer.
 */
function toInt(val) {
  if (val === null || val === undefined) return null;
  const v = Array.isArray(val) ? val[0] : val;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
}

/**
 * Normalize a date string to ISO date (YYYY-MM-DD) or null.
 */
function toDate(val) {
  if (val === null || val === undefined) return null;
  const s = Array.isArray(val) ? String(val[0] || '').trim() : String(val).trim();
  if (!s) return null;
  // Validate basic date format
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return s;
}

/**
 * Centralized filter normalizer — converts raw filter input to safe typed values.
 * This is the single normalization entry point for ALL repository methods.
 */
function normalizeFilters(raw = {}) {
  return {
    city:     toScalarText(raw.city),
    disease:  toScalarText(raw.disease),
    gender:   toScalarText(raw.gender),
    severity: toInt(raw.severity),
    outcome:  toScalarText(raw.outcome),
    dateFrom: toDate(raw.dateFrom),
    dateTo:   toDate(raw.dateTo),
    hospital: toScalarText(raw.hospital),
    limit:    Math.min(toInt(raw.limit) ?? 2000, 5000),
    offset:   toInt(raw.offset) ?? 0,
  };
}

/** Build shared date filter predicate for Supabase queries */
function applyDateFilter(query, column, dateFrom, dateTo) {
  if (dateFrom) query = query.gte(column, dateFrom);
  if (dateTo)   query = query.lte(column, dateTo);
  return query;
}

/**
 * Wrap a Supabase RPC call with safe scalar parameters.
 * Prevents malformed array literal errors by ensuring all text values are
 * plain strings (not arrays, not objects) before they reach PostgreSQL.
 */
async function safeRpc(rpcName, params) {
  const safeParams = {};
  for (const [key, val] of Object.entries(params)) {
    if (val === null || val === undefined) {
      safeParams[key] = null;
    } else if (typeof val === 'number') {
      safeParams[key] = val;
    } else if (typeof val === 'boolean') {
      safeParams[key] = val;
    } else if (Array.isArray(val)) {
      // Flatten single-element arrays to scalar text
      const first = val.find(v => v != null && String(v).trim() !== '');
      safeParams[key] = first != null ? String(first).trim() : null;
    } else {
      const s = String(val).trim();
      safeParams[key] = s === '' ? null : s;
    }
  }

  const { data, error } = await db().rpc(rpcName, safeParams);
  if (error) {
    // Translate PostgreSQL-level errors to user-friendly messages
    const msg = error.message || '';
    if (msg.includes('malformed array') || msg.includes('invalid input syntax')) {
      throw Object.assign(
        new Error('Invalid filter format — please check your filter values and try again.'),
        { statusCode: 400, original: msg }
      );
    }
    throw error;
  }
  return data;
}

export const ReportRepository = {

  // ─── Disease Statistics ──────────────────────────────────────────────────────
  async getDiseaseStats(rawFilters) {
    const { city, disease, gender, severity, outcome, dateFrom, dateTo, hospital, limit, offset } = normalizeFilters(rawFilters);

    let query = db()
      .from('medical_records')
      .select(`
        id,
        diagnosis_date,
        severity,
        outcome,
        patients!inner ( gender, city ),
        hospitals!inner ( name, city ),
        diseases!inner ( name, category )
      `)
      .range(offset, offset + limit - 1)
      .order('diagnosis_date', { ascending: false });

    if (disease)  query = query.eq('diseases.name', disease);
    if (severity) query = query.eq('severity', severity);
    if (outcome)  query = query.eq('outcome', outcome);
    if (gender)   query = query.eq('patients.gender', gender);
    if (city)     query = query.eq('patients.city', city);
    if (hospital) query = query.eq('hospitals.name', hospital);
    query = applyDateFilter(query, 'diagnosis_date', dateFrom, dateTo);

    const { data, error, count } = await query;
    if (error) {
      console.error('[getDiseaseStats] Query error:', error.message);
      throw Object.assign(new Error('Unable to generate report — please adjust your filters and try again.'), { statusCode: 500, original: error.message });
    }
    return { data: data || [], count };
  },

  // ─── Hospital Performance — aggregated in JS from raw records ────────────────
  async getHospitalPerformance(rawFilters) {
    const { city, dateFrom, dateTo } = normalizeFilters(rawFilters);

    let query = db()
      .from('medical_records')
      .select(`
        id, severity, outcome, diagnosis_date,
        hospitals!inner ( id, name, city ),
        diseases ( name )
      `)
      .order('diagnosis_date', { ascending: false })
      .limit(5000);

    if (city)     query = query.eq('hospitals.city', city);
    if (dateFrom) query = query.gte('diagnosis_date', dateFrom);
    if (dateTo)   query = query.lte('diagnosis_date', dateTo);

    const { data, error } = await query;
    if (error) {
      console.error('[getHospitalPerformance] Query error:', error.message);
      throw Object.assign(new Error('Unable to generate report — please adjust your filters and try again.'), { statusCode: 500, original: error.message });
    }

    // Aggregate by hospital
    const map = {};
    for (const r of (data || [])) {
      const hName = r.hospitals?.name || 'Unknown';
      const hCity = r.hospitals?.city || '';
      if (!map[hName]) map[hName] = { hospital_name: hName, city: hCity, total_cases: 0, recovered: 0, deceased: 0, active: 0, severity_sum: 0, diseases: {} };
      const h = map[hName];
      h.total_cases++;
      h.severity_sum += (r.severity || 0);
      if (r.outcome === 'recovered')  h.recovered++;
      else if (r.outcome === 'deceased') h.deceased++;
      else h.active++;
      const dn = r.diseases?.name;
      if (dn) h.diseases[dn] = (h.diseases[dn] || 0) + 1;
    }
    return Object.values(map).map(h => ({
      ...h,
      avg_severity: h.total_cases > 0 ? (h.severity_sum / h.total_cases).toFixed(1) : 'N/A',
      top_disease:  Object.entries(h.diseases).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A',
    })).sort((a,b) => b.total_cases - a.total_cases);
  },

  // ─── Active Cases Summary ─────────────────────────────────────────────────────
  async getActiveCases(rawFilters) {
    const { city, disease, gender, severity, dateFrom, dateTo, limit } = normalizeFilters(rawFilters);

    let query = db()
      .from('medical_records')
      .select(`
        id,
        diagnosis_date,
        severity,
        outcome,
        patients ( gender, city, birth_date ),
        hospitals ( name, city ),
        diseases ( name, category )
      `)
      .not('outcome', 'eq', 'recovered')
      .not('outcome', 'eq', 'deceased')
      .order('diagnosis_date', { ascending: false })
      .limit(limit);

    if (disease)  query = query.eq('diseases.name', disease);
    if (severity) query = query.eq('severity', severity);
    if (gender)   query = query.eq('patients.gender', gender);
    if (city)     query = query.eq('patients.city', city);
    query = applyDateFilter(query, 'diagnosis_date', dateFrom, dateTo);

    const { data, error } = await query;
    if (error) {
      console.error('[getActiveCases] Query error:', error.message);
      throw Object.assign(new Error('Unable to generate report — please adjust your filters and try again.'), { statusCode: 500, original: error.message });
    }
    return data || [];
  },

  // ─── Governorate Outbreak — aggregated in JS ──────────────────────────────────
  async getGovernorateOutbreak(rawFilters) {
    const { disease, dateFrom, dateTo } = normalizeFilters(rawFilters);

    let query = db()
      .from('medical_records')
      .select(`
        id, severity, outcome, diagnosis_date,
        patients ( city ),
        diseases ( name )
      `)
      .order('diagnosis_date', { ascending: false })
      .limit(5000);

    if (disease)  query = query.eq('diseases.name', disease);
    if (dateFrom) query = query.gte('diagnosis_date', dateFrom);
    if (dateTo)   query = query.lte('diagnosis_date', dateTo);

    const { data, error } = await query;
    if (error) {
      console.error('[getGovernorateOutbreak] Query error:', error.message);
      throw Object.assign(new Error('Unable to generate report — please adjust your filters and try again.'), { statusCode: 500, original: error.message });
    }

    const map = {};
    for (const r of (data || [])) {
      const city = r.patients?.city || 'Unknown';
      if (!map[city]) map[city] = { city, total_cases: 0, active_cases: 0, recovered: 0, deceased: 0, severity_sum: 0, diseases: {} };
      const c = map[city];
      c.total_cases++;
      c.severity_sum += (r.severity || 0);
      if (r.outcome === 'recovered')     c.recovered++;
      else if (r.outcome === 'deceased') c.deceased++;
      else c.active_cases++;
      const dn = r.diseases?.name;
      if (dn) c.diseases[dn] = (c.diseases[dn] || 0) + 1;
    }
    return Object.values(map).map(c => ({
      ...c,
      avg_severity: c.total_cases > 0 ? (c.severity_sum / c.total_cases).toFixed(1) : 'N/A',
      top_disease:  Object.entries(c.diseases).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A',
    })).sort((a,b) => b.total_cases - a.total_cases);
  },

  // ─── KPI aggregation for any report ──────────────────────────────────────────
  async getReportKpis(rawFilters) {
    const { city, disease, gender, severity, dateFrom, dateTo } = normalizeFilters(rawFilters);
    try {
      const data = await safeRpc('get_dashboard_kpis', {
        p_city:       city,
        p_disease:    disease,
        p_gender:     gender,
        p_severity:   severity,
        p_start_date: dateFrom,
        p_end_date:   dateTo,
      });
      return data;
    } catch (e) {
      // KPIs are non-critical — return empty object on failure to prevent report crash
      console.error('[getReportKpis] RPC error:', e.original || e.message);
      return null;
    }
  },

  // ─── Available diseases ────────────────────────────────────────────────────────
  async getDiseaseList() {
    const { data, error } = await db().from('diseases').select('id, name, category').order('name');
    if (error) throw error;
    return data || [];
  },

  // ─── Available cities ──────────────────────────────────────────────────────────
  async getCityList() {
    const { data, error } = await db().from('districts').select('city').order('city');
    if (error) throw error;
    return [...new Set((data || []).map(d => d.city))];
  },

  // ─── Available hospitals ───────────────────────────────────────────────────────
  async getHospitalList() {
    const { data, error } = await db().from('hospitals').select('id, name, city').order('name');
    if (error) throw error;
    return data || [];
  },
};
