import { getSupabase } from '../config/supabase.js';

const db = () => {
  const s = getSupabase();
  if (!s) throw Object.assign(new Error('Database not configured'), { statusCode: 503 });
  return s;
};

export const HospitalRepository = {
  async findAll({ city, type, districtId, limit = 1000, offset = 0 }) {
    const rpcParams = {
      p_city: city || null,
      p_type: type || null,
      p_district_id: districtId || null,
      p_limit: limit,
      p_offset: offset
    };
    console.log("[TRACE] Repository findAll() RPC get_hospitals_with_gis Params:", rpcParams);
    
    const { data, error } = await db().rpc('get_hospitals_with_gis', rpcParams);

    if (error) {
      console.error("[TRACE] RPC get_hospitals_with_gis Error:", error);
      throw error;
    }
    
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

  async findByNameAndDistrict(name, district_id) {
    const { data, error } = await db().from('hospitals')
      .select('id')
      .ilike('name', name)
      .eq('district_id', district_id)
      .limit(1);
    if (error) throw error;
    return data.length > 0 ? data[0] : null;
  },

  async create({ name, address, city, district_id, longitude, latitude, capacity, phone, type, emergency_available }) {
    const location = (longitude && latitude)
      ? `POINT(${longitude} ${latitude})` : null;

    const { data, error } = await db().from('hospitals')
      .insert({ name, address, city, district_id, location, capacity, phone, type, emergency_available })
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

  async findNearby(longitude, latitude, radiusMeters = 10000, city = null, type = null, limit = 1000, requireBeds = false) {
    const rpcParams = {
      lat: latitude,
      lng: longitude,
      radius: radiusMeters,
      p_city: city || null,
      p_type: type || null,
      p_limit: limit,
      p_require_beds: requireBeds
    };
    console.log("[TRACE] Repository findNearby() RPC hospitals_within_radius Params:", rpcParams);

    const { data, error } = await db().rpc('hospitals_within_radius', rpcParams);

    if (error) {
      console.error("[TRACE] RPC hospitals_within_radius Error:", error);
      throw error;
    }
    
    return data.map(h => ({
      ...h,
      districts: h.district_id ? { id: h.district_id, name: h.district_name } : null
    }));
  },
};
