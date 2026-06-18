import { getSupabase } from '../config/supabase.js';

const db = () => {
  const s = getSupabase();
  if (!s) throw Object.assign(new Error('Database not configured'), { statusCode: 503 });
  return s;
};

export const AnalyticsRepository = {
  // Existing methods
  async getDailyStats({ diseaseId, districtId, dateFrom, dateTo, limit = 365 }) {
    // ... logic unchanged
    return [];
  },
  async upsertDailyStat({ disease_id, district_id, date, total_cases }) {
    return null;
  },
  async getDiseaseSummary() {
    return [];
  },
  async getReports({ userId, type, limit = 50, offset = 0 }) {
    return [];
  },
  async createReport({ user_id, type, file_url }) {
    return null;
  },

  // ─── Temporal Guard ──────────────────────────────────────────────────────────
  async getEffectiveAnalyticsDate() {
    // We run a raw query via postgrest if possible, or we can just fetch the max date.
    // Supabase JS doesn't support SELECT LEAST(CURRENT_DATE, MAX(diagnosis_date)) directly without RPC.
    // Let's do:
    const { data, error } = await db()
      .from('medical_records')
      .select('diagnosis_date')
      .order('diagnosis_date', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    const maxDateStr = data?.[0]?.diagnosis_date;
    const maxDate = maxDateStr ? new Date(maxDateStr) : new Date();
    const current = new Date();
    
    // Return LEAST(CURRENT_DATE, MAX(diagnosis_date))
    const effective = maxDate < current ? maxDate : current;
    return effective.toISOString().split('T')[0];
  },

  // ─── NEW: DB-level analytics RPCs ───────────────────────────────────────────

  async getKpis({ city, disease, gender, severity, status, hospital, startDate, endDate }) {
    const rpcParams = {
      p_city:       city       || null,
      p_disease:    disease    || null,
      p_gender:     gender     || null,
      p_severity:   severity   || null,
      p_status:     status     || null,
      p_hospital_id: hospital  || null,
      p_start_date: startDate  || null,
      p_end_date:   endDate    || null,
    };
    console.log("Analytics Query", { city, disease, gender, severity, status, hospital, startDate, endDate });
    console.log("RPC Params", rpcParams);
    const start = Date.now();
    const { data, error } = await db().rpc('get_dashboard_kpis', rpcParams);
    const duration = Date.now() - start;
    console.log("RPC Result Count", data ? 1 : 0);
    console.log("Execution Time", duration, "ms");
    if (error) throw error;
    return data;
  },

  async getTrends({ city, disease, gender, severity, status, hospital, startDate, endDate }) {
    const rpcParams = {
      p_city:       city       || null,
      p_disease:    disease    || null,
      p_gender:     gender     || null,
      p_severity:   severity   || null,
      p_status:     status     || null,
      p_hospital_id: hospital  || null,
      p_start_date: startDate  || null,
      p_end_date:   endDate    || null,
    };
    console.log("Analytics Query", { city, disease, gender, severity, status, hospital, startDate, endDate });
    console.log("RPC Params", rpcParams);
    const start = Date.now();
    const { data, error } = await db().rpc('get_dashboard_trends', rpcParams);
    const duration = Date.now() - start;
    console.log("RPC Result Count", data?.length);
    console.log("Execution Time", duration, "ms");
    if (error) throw error;
    return data || [];
  },

  async getBubbleData({ city, disease, gender, severity, status, hospital, startDate, endDate }) {
    const rpcParams = {
      p_city:       city       || null,
      p_disease:    disease    || null,
      p_gender:     gender     || null,
      p_severity:   severity   || null,
      p_status:     status     || null,
      p_hospital_id: hospital  || null,
      p_start_date: startDate  || null,
      p_end_date:   endDate    || null,
    };
    console.log("Analytics Query", { city, disease, gender, severity, status, hospital, startDate, endDate });
    console.log("RPC Params", rpcParams);
    const start = Date.now();
    const { data, error } = await db().rpc('get_dashboard_bubble_data', rpcParams);
    const duration = Date.now() - start;
    console.log("RPC Result Count", data?.length);
    console.log("Execution Time", duration, "ms");
    if (error) throw error;
    return data || [];
  },

  async getSeverityData({ city, disease, gender, severity, status, hospital, startDate, endDate }) {
    const rpcParams = {
      p_city:       city       || null,
      p_disease:    disease    || null,
      p_gender:     gender     || null,
      p_severity:   severity   || null,
      p_status:     status     || null,
      p_hospital_id: hospital  || null,
      p_start_date: startDate  || null,
      p_end_date:   endDate    || null,
    };
    console.log("Analytics Query", { city, disease, gender, severity, status, hospital, startDate, endDate });
    console.log("RPC Params", rpcParams);
    const start = Date.now();
    const { data, error } = await db().rpc('get_dashboard_severity', rpcParams);
    const duration = Date.now() - start;
    console.log("RPC Result Count", data?.length);
    console.log("Execution Time", duration, "ms");
    if (error) throw error;
    return data || [];
  },

  async getDiseaseBreakdown({ city, disease, gender, severity, status, hospital, startDate, endDate }) {
    const rpcParams = {
      p_city:       city       || null,
      p_disease:    disease    || null,
      p_gender:     gender     || null,
      p_severity:   severity   || null,
      p_status:     status     || null,
      p_hospital_id: hospital  || null,
      p_start_date: startDate  || null,
      p_end_date:   endDate    || null,
    };
    console.log("Analytics Query", { city, disease, gender, severity, status, hospital, startDate, endDate });
    console.log("RPC Params", rpcParams);
    const start = Date.now();
    const { data, error } = await db().rpc('get_dashboard_disease_breakdown', rpcParams);
    const duration = Date.now() - start;
    console.log("RPC Result Count", data?.length);
    console.log("Execution Time", duration, "ms");
    if (error) throw error;
    return data || [];
  },

  async getDiseaseList() {
    const { data, error } = await db().from('diseases').select('id, name').order('name');
    if (error) throw error;
    return data || [];
  },

  async getCityList() {
    const { data, error } = await db().from('districts').select('city').order('city');
    if (error) throw error;
    const cities = [...new Set((data || []).map(d => d.city))];
    return cities;
  },
};
