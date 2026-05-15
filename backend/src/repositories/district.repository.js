import { getSupabase } from '../config/supabase.js';

const db = () => {
  const s = getSupabase();
  if (!s) throw Object.assign(new Error('Database not configured'), { statusCode: 503 });
  return s;
};

export const DistrictRepository = {
  async findAll({ city, limit = 100, offset = 0 }) {
    let query = db().from('districts').select('*')
      .range(offset, offset + limit - 1).order('city').order('name');

    if (city) query = query.eq('city', city);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await db().from('districts').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async create({ name, city }) {
    const { data, error } = await db().from('districts')
      .insert({ name, city }).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, fields) {
    const { data, error } = await db().from('districts')
      .update(fields).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await db().from('districts').delete().eq('id', id);
    if (error) throw error;
  },
};
