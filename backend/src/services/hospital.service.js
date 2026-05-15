import { HospitalRepository } from '../repositories/hospital.repository.js';

export const HospitalService = {
  getAll: (filters) => HospitalRepository.findAll(filters),
  getById: (id) => HospitalRepository.findById(id),
  create: (data) => HospitalRepository.create(data),
  update: (id, data) => HospitalRepository.update(id, data),
  delete: (id) => HospitalRepository.delete(id),
  findNearby: (lng, lat, radius, city, type) => HospitalRepository.findNearby(lng, lat, radius, city, type),
};
