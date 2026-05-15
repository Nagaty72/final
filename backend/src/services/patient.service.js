import { PatientRepository } from '../repositories/patient.repository.js';

export const PatientService = {
  getAll: (filters) => PatientRepository.findAll(filters),
  getById: (id) => PatientRepository.findById(id),
  create: (data) => PatientRepository.create(data),
  update: (id, data) => PatientRepository.update(id, data),
  delete: (id) => PatientRepository.delete(id),
};
