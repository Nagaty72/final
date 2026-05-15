import { getSupabase } from '../config/supabase.js';

const db = () => {
  const s = getSupabase();
  if (!s) throw Object.assign(new Error('Database not configured'), { statusCode: 503 });
  return s;
};

export const PatientRepository = {
  async findAll({ city, districtId, gender, limit = 50, offset = 0 }) {
    let query = db().from('patients').select(`
      *, districts ( id, name, city )
    `).range(offset, offset + limit - 1).order('created_at', { ascending: false });

    if (city) query = query.eq('city', city);
    if (districtId) query = query.eq('district_id', districtId);
    if (gender) query = query.eq('gender', gender);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await db().from('patients')
      .select('*, districts ( id, name, city )')
      .eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async create({ gender, birth_date, city, district_id }) {
    const { data, error } = await db().from('patients')
      .insert({ gender, birth_date, city, district_id }).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, fields) {
    const { data, error } = await db().from('patients')
      .update(fields).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await db().from('patients').delete().eq('id', id);
    if (error) throw error;
  },
};
