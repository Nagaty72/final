import { DiseaseRepository } from '../repositories/disease.repository.js';

export const DiseaseService = {
  getAll: (filters) => DiseaseRepository.findAll(filters),
  getById: (id) => DiseaseRepository.findById(id),
  create: (data) => DiseaseRepository.create(data),
  update: (id, data) => DiseaseRepository.update(id, data),
  delete: (id) => DiseaseRepository.delete(id),
};
