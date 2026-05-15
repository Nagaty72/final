import { MedicalRecordRepository } from '../repositories/medical-record.repository.js';

export const MedicalRecordService = {
  getAll: (filters) => MedicalRecordRepository.findAll(filters),
  getById: (id) => MedicalRecordRepository.findById(id),
  create: (data) => MedicalRecordRepository.create(data),
  update: (id, data) => MedicalRecordRepository.update(id, data),
  delete: (id) => MedicalRecordRepository.delete(id),
};
