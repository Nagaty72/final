import { HospitalRepository } from '../repositories/hospital.repository.js';
import { getSupabase } from '../config/supabase.js';

export const HospitalService = {
  getAll: (filters) => {
    console.log("[TRACE] Service getAll() filters:", filters);
    return HospitalRepository.findAll(filters);
  },
  getById: (id) => HospitalRepository.findById(id),
  create: async (data) => {
    // Idempotency: Check if the hospital already exists before creating
    if (data.name && data.district_id) {
      const existing = await HospitalRepository.findByNameAndDistrict(data.name, data.district_id);
      if (existing) {
        throw Object.assign(new Error('A facility with this exact name already exists in the selected district.'), { statusCode: 409 });
      }
    }
    return HospitalRepository.create(data);
  },
  update: (id, data) => HospitalRepository.update(id, data),
  delete: (id) => HospitalRepository.delete(id),
  findNearby: (lng, lat, radiusMeters, city, type, limit, requireBeds) => {
    console.log(`[TRACE] Service findNearby() - Lng:${lng}, Lat:${lat}, Radius:${radiusMeters}, City:${city}, Type:${type}, Limit:${limit}, RequireBeds:${requireBeds}`);
    return HospitalRepository.findNearby(lng, lat, radiusMeters, city, type, limit, requireBeds);
  },
};
