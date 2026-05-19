import { HospitalRepository } from '../repositories/hospital.repository.js';

export const HospitalService = {
  getAll: (filters) => HospitalRepository.findAll(filters),
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
  findNearby: (lng, lat, radius, city, type, limit) => HospitalRepository.findNearby(lng, lat, radius, city, type, limit),
};
