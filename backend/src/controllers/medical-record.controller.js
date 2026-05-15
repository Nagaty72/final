import { MedicalRecordService } from '../services/medical-record.service.js';

export const MedicalRecordController = {
  async getAll(req, res, next) {
    try {
      const { patientId, hospitalId, diseaseId, dateFrom, dateTo, limit, offset } = req.query;
      const data = await MedicalRecordService.getAll({
        patientId, hospitalId, diseaseId, dateFrom, dateTo,
        limit: Number(limit) || 50, offset: Number(offset) || 0,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getById(req, res, next) {
    try {
      const data = await MedicalRecordService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const data = await MedicalRecordService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const data = await MedicalRecordService.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async delete(req, res, next) {
    try {
      await MedicalRecordService.delete(req.params.id);
      res.json({ success: true, message: 'Record deleted' });
    } catch (e) { next(e); }
  },
};
