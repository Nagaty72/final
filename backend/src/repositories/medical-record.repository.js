import { getSupabase } from '../config/supabase.js';

const db = () => {
  const s = getSupabase();
  if (!s) throw Object.assign(new Error('Database not configured'), { statusCode: 503 });
  return s;
};

export const MedicalRecordRepository = {
  async findAll({ patientId, hospitalId, diseaseId, dateFrom, dateTo, limit = 50, offset = 0 }) {
    let query = db().from('medical_records').select(`
      *,
      patients ( id, gender, birth_date, city ),
      hospitals ( id, name, city ),
      diseases ( id, name, category )
    `).range(offset, offset + limit - 1).order('diagnosis_date', { ascending: false });

    if (patientId) query = query.eq('patient_id', patientId);
    if (hospitalId) query = query.eq('hospital_id', hospitalId);
    if (diseaseId) query = query.eq('disease_id', diseaseId);
    if (dateFrom) query = query.gte('diagnosis_date', dateFrom);
    if (dateTo) query = query.lte('diagnosis_date', dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await db().from('medical_records')
      .select(`*, patients(*), hospitals(*), diseases(*)`)
      .eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async create({ patient_id, hospital_id, disease_id, diagnosis_date, severity, outcome }) {
    const { data, error } = await db().from('medical_records')
      .insert({ patient_id, hospital_id, disease_id, diagnosis_date, severity, outcome })
      .select().single();
    if (error) throw error;
    return data;
  },

  async update(id, fields) {
    const { data, error } = await db().from('medical_records')
      .update(fields).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await db().from('medical_records').delete().eq('id', id);
    if (error) throw error;
  },
};
