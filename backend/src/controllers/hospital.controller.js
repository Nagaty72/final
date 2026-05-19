import { HospitalService } from '../services/hospital.service.js';

export const HospitalController = {
  async getAll(req, res, next) {
    try {
      const { city, type, districtId, limit, offset } = req.query;
      const data = await HospitalService.getAll({ 
        city, 
        type, 
        districtId, 
        limit: Number(limit) || 1000, 
        offset: Number(offset) || 0 
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getById(req, res, next) {
    try {
      const data = await HospitalService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const data = await HospitalService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const data = await HospitalService.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async delete(req, res, next) {
    try {
      await HospitalService.delete(req.params.id);
      res.json({ success: true, message: 'Hospital deleted' });
    } catch (e) { next(e); }
  },

  async findNearby(req, res, next) {
    try {
      const { longitude, latitude, radius, city, type, limit } = req.query;
      const data = await HospitalService.findNearby(
        Number(longitude), 
        Number(latitude), 
        Number(radius) || 10000,
        city,
        type,
        Number(limit) || 1000
      );
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
};
