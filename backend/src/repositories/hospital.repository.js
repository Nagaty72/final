import { getSupabase } from '../config/supabase.js';

const db = () => {
  const s = getSupabase();
  if (!s) throw Object.assign(new Error('Database not configured'), { statusCode: 503 });
  return s;
};

export const HospitalRepository = {
  async findAll({ city, type, districtId, limit = 50, offset = 0 }) {
    // Uses the new RPC to extract lat/lng from the PostGIS geography field
    const { data, error } = await db().rpc('get_hospitals_with_gis', {
      p_city: city || null,
      p_type: type || null,
      p_district_id: districtId || null,
      p_limit: limit,
      p_offset: offset
    });

    if (error) throw error;
    
    // Format the result to match expected output structure, handling the district relationship
    return data.map(h => ({
      ...h,
      districts: h.district_id ? { id: h.district_id, name: h.district_name } : null
    }));
  },

  async findById(id) {
    const { data, error } = await db().from('hospitals')
      .select('*, districts ( id, name, city )')
      .eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async create({ name, address, city, district_id, longitude, latitude, capacity }) {
    const location = (longitude && latitude)
      ? `POINT(${longitude} ${latitude})` : null;

    const { data, error } = await db().from('hospitals')
      .insert({ name, address, city, district_id, location, capacity })
      .select().single();
    if (error) throw error;
    return data;
  },

  async update(id, fields) {
    if (fields.longitude && fields.latitude) {
      fields.location = `POINT(${fields.longitude} ${fields.latitude})`;
      delete fields.longitude;
      delete fields.latitude;
    }
    const { data, error } = await db().from('hospitals')
      .update(fields).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await db().from('hospitals').delete().eq('id', id);
    if (error) throw error;
  },

  async findNearby(longitude, latitude, radiusMeters = 10000, city = null, type = null, limit = 50) {
    const { data, error } = await db().rpc('hospitals_within_radius', {
      lat: latitude,
      lng: longitude,
      radius: radiusMeters,
      p_city: city || null,
      p_type: type || null,
      p_limit: limit
    });
    if (error) throw error;
    
    return data.map(h => ({
      ...h,
      districts: h.district_id ? { id: h.district_id, name: h.district_name } : null
    }));
  },
};
