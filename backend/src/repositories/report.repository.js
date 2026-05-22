import { getSupabase } from '../config/supabase.js';

const db = () => {
  const s = getSupabase();
  if (!s) throw Object.assign(new Error('Database not configured'), { statusCode: 503 });
  return s;
};

/** Build shared date filter predicate for Supabase queries */
function applyDateFilter(query, column, dateFrom, dateTo) {
  if (dateFrom) query = query.gte(column, dateFrom);
  if (dateTo)   query = query.lte(column, dateTo);
  return query;
}

export const ReportRepository = {

  // ─── Disease Statistics ──────────────────────────────────────────────────
  async getDiseaseStats({ city, disease, gender, severity, outcome, dateFrom, dateTo, hospital, limit = 2000, offset = 0 }) {
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
    if (severity) query = query.eq('severity', parseInt(severity, 10));
    if (outcome)  query = query.eq('outcome', outcome);
    if (gender)   query = query.eq('patients.gender', gender);
    if (city)     query = query.eq('patients.city', city);
    if (hospital) query = query.eq('hospitals.name', hospital);
    query = applyDateFilter(query, 'diagnosis_date', dateFrom, dateTo);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], count };
  },

  // ─── Hospital Performance — aggregated in JS from raw records ──────────────
  async getHospitalPerformance({ city, dateFrom, dateTo, limit = 500 }) {
    let query = db()
      .from('medical_records')
      .select(`
        id, severity, outcome, diagnosis_date,
        hospitals!inner ( id, name, city ),
        diseases ( name )
      `)
      .order('diagnosis_date', { ascending: false })
      .limit(limit);

    if (city)     query = query.eq('hospitals.city', city);
    if (dateFrom) query = query.gte('diagnosis_date', dateFrom);
    if (dateTo)   query = query.lte('diagnosis_date', dateTo);

    const { data, error } = await query;
    if (error) throw error;

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

  // ─── Active Cases Summary ────────────────────────────────────────────────
  async getActiveCases({ city, disease, gender, severity, dateFrom, dateTo, limit = 2000 }) {
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
    if (severity) query = query.eq('severity', parseInt(severity, 10));
    if (gender)   query = query.eq('patients.gender', gender);
    if (city)     query = query.eq('patients.city', city);
    query = applyDateFilter(query, 'diagnosis_date', dateFrom, dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // ─── Governorate Outbreak — aggregated in JS ─────────────────────────────
  async getGovernorateOutbreak({ disease, dateFrom, dateTo }) {
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
    if (error) throw error;

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

  // ─── KPI aggregation for any report ─────────────────────────────────────
  async getReportKpis({ city, disease, gender, severity, dateFrom, dateTo }) {
    const { data, error } = await db().rpc('get_dashboard_kpis', {
      p_city:       city       || null,
      p_disease:    disease    || null,
      p_gender:     gender     || null,
      p_severity:   severity ? parseInt(severity, 10) : null,
      p_start_date: dateFrom   || null,
      p_end_date:   dateTo     || null,
    });
    if (error) throw error;
    return data;
  },

  // ─── Trend data for charts ───────────────────────────────────────────────
  async getReportTrends({ city, disease, gender, severity, dateFrom, dateTo }) {
    const { data, error } = await db().rpc('get_dashboard_trends', {
      p_city:       city       || null,
      p_disease:    disease    || null,
      p_gender:     gender     || null,
      p_severity:   severity ? parseInt(severity, 10) : null,
      p_start_date: dateFrom   || null,
      p_end_date:   dateTo     || null,
    });
    if (error) throw error;
    return data || [];
  },

  // ─── Disease breakdown for pie charts ───────────────────────────────────
  async getDiseaseBreakdown({ city, disease, gender, severity, dateFrom, dateTo }) {
    const { data, error } = await db().rpc('get_dashboard_disease_breakdown', {
      p_city:       city       || null,
      p_disease:    disease    || null,
      p_gender:     gender     || null,
      p_severity:   severity ? parseInt(severity, 10) : null,
      p_start_date: dateFrom   || null,
      p_end_date:   dateTo     || null,
    });
    if (error) throw error;
    return data || [];
  },

  // ─── Severity distribution ───────────────────────────────────────────────
  async getSeverityDistribution({ city, disease, gender, dateFrom, dateTo }) {
    const { data, error } = await db().rpc('get_dashboard_severity', {
      p_city:       city    || null,
      p_disease:    disease || null,
      p_gender:     gender  || null,
      p_severity:   null,
      p_start_date: dateFrom || null,
      p_end_date:   dateTo   || null,
    });
    if (error) throw error;
    return data || [];
  },

  // ─── Available diseases ───────────────────────────────────────────────────
  async getDiseaseList() {
    const { data, error } = await db().from('diseases').select('id, name, category').order('name');
    if (error) throw error;
    return data || [];
  },

  // ─── Available cities ─────────────────────────────────────────────────────
  async getCityList() {
    const { data, error } = await db().from('districts').select('city').order('city');
    if (error) throw error;
    return [...new Set((data || []).map(d => d.city))];
  },

  // ─── Available hospitals ──────────────────────────────────────────────────
  async getHospitalList() {
    const { data, error } = await db().from('hospitals').select('id, name, city').order('name');
    if (error) throw error;
    return data || [];
  },
};
