import { getSupabase } from '../config/supabase.js';

const db = () => {
  const s = getSupabase();
  if (!s) throw Object.assign(new Error('Database not configured'), { statusCode: 503 });
  return s;
};

export const DiseaseRepository = {
  async findAll({ category, isChronic, limit = 50, offset = 0 }) {
    let query = db().from('diseases').select('*')
      .range(offset, offset + limit - 1).order('name');

    if (category) query = query.eq('category', category);
    if (isChronic !== undefined) query = query.eq('is_chronic', isChronic);

    const { data, error } = await query;
    if (error) {
      console.error("SUPABASE ERROR:", JSON.stringify(error, null, 2));
      import('fs').then(fs => fs.appendFileSync('disease_error.log', JSON.stringify(error, null, 2) + '\\n'));
      throw error;
    }
    return data;
  },

  async findById(id) {
    const { data, error } = await db().from('diseases').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async create({ name, category, is_chronic }) {
    const { data, error } = await db().from('diseases')
      .insert({ name, category, is_chronic }).select().single();
    if (error) {
      console.error("SUPABASE ERROR:", JSON.stringify(error, null, 2));
      import('fs').then(fs => fs.appendFileSync('disease_error.log', JSON.stringify(error, null, 2) + '\\n'));
      throw error;
    }
    return data;
  },

  async update(id, fields) {
    const { data, error } = await db().from('diseases')
      .update(fields).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await db().from('diseases').delete().eq('id', id);
    if (error) throw error;
  },
};
