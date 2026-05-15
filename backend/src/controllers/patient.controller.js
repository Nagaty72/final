import { PatientService } from '../services/patient.service.js';

export const PatientController = {
  async getAll(req, res, next) {
    try {
      const { city, districtId, gender, limit, offset } = req.query;
      const data = await PatientService.getAll({ city, districtId, gender, limit: Number(limit) || 50, offset: Number(offset) || 0 });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getById(req, res, next) {
    try {
      const data = await PatientService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const data = await PatientService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const data = await PatientService.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async delete(req, res, next) {
    try {
      await PatientService.delete(req.params.id);
      res.json({ success: true, message: 'Patient deleted' });
    } catch (e) { next(e); }
  },
};
