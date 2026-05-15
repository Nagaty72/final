import { DistrictRepository } from '../repositories/district.repository.js';

export const DistrictService = {
  getAll: (filters) => DistrictRepository.findAll(filters),
  getById: (id) => DistrictRepository.findById(id),
  create: (data) => DistrictRepository.create(data),
  update: (id, data) => DistrictRepository.update(id, data),
  delete: (id) => DistrictRepository.delete(id),
};
