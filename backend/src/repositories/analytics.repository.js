import { getSupabase } from '../config/supabase.js';

const db = () => {
  const s = getSupabase();
  if (!s) throw Object.assign(new Error('Database not configured'), { statusCode: 503 });
  return s;
};

export const AnalyticsRepository = {
  /** disease_stats_daily — aggregated daily stats */
  async getDailyStats({ diseaseId, districtId, dateFrom, dateTo, limit = 365 }) {
    let query = db().from('disease_stats_daily')
      .select('*, diseases ( id, name )')
      .order('date', { ascending: false }).limit(limit);

    if (diseaseId) query = query.eq('disease_id', diseaseId);
    if (districtId) query = query.eq('district_id', districtId);
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async upsertDailyStat({ disease_id, district_id, date, total_cases }) {
    const { data, error } = await db().from('disease_stats_daily')
      .upsert({ disease_id, district_id, date, total_cases },
        { onConflict: 'disease_id,district_id,date' })
      .select().single();
    if (error) throw error;
    return data;
  },

  /** disease_predictions — AI forecast data */
  async getPredictions({ diseaseId, districtId, limit = 30 }) {
    let query = db().from('disease_predictions')
      .select('*, diseases ( id, name )')
      .order('prediction_date', { ascending: true }).limit(limit);

    if (diseaseId) query = query.eq('disease_id', diseaseId);
    if (districtId) query = query.eq('district_id', districtId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async insertPrediction({ disease_id, district_id, prediction_date, predicted_cases, model_version }) {
    const { data, error } = await db().from('disease_predictions')
      .insert({ disease_id, district_id, prediction_date, predicted_cases, model_version })
      .select().single();
    if (error) throw error;
    return data;
  },

  /** disease_summary — materialized view */
  async getDiseaseSummary() {
    const { data, error } = await db().from('disease_summary').select('*');
    if (error) throw error;
    return data;
  },

  /** reports */
  async getReports({ userId, type, limit = 50, offset = 0 }) {
    let query = db().from('reports').select('*, users ( id, email, full_name )')
      .range(offset, offset + limit - 1).order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createReport({ user_id, type, file_url }) {
    const { data, error } = await db().from('reports')
      .insert({ user_id, type, file_url }).select().single();
    if (error) throw error;
    return data;
  },

  /** Dashboard Data */
  async getDashboardData() {
    const database = db();
    
    // Fetch counts
    const [
      { count: patientsCount },
      { count: hospitalsCount }
    ] = await Promise.all([
      database.from('patients').select('*', { count: 'exact', head: true }),
      database.from('hospitals').select('*', { count: 'exact', head: true })
    ]);

    // Fetch lookup tables
    const { data: diseasesList } = await database.from('diseases').select('id, name');
    const { data: districtsList } = await database.from('districts').select('id, city');

    // Fetch all medical records for true dynamic aggregation
    const { data: allRecords } = await database
      .from('medical_records')
      .select(`
        id, 
        diagnosis_date, 
        outcome,
        disease_id,
        hospital_id,
        diseases ( id, name ),
        hospitals ( id, district_id, name ),
        patients ( id )
      `);

    return {
      patientsCount: patientsCount || 0,
      hospitalsCount: hospitalsCount || 0,
      diseasesList: diseasesList || [],
      districtsList: districtsList || [],
      allRecords: allRecords || []
    };
  }
};
