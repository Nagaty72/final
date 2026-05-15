import { DistrictService } from '../services/district.service.js';

export const DistrictController = {
  async getAll(req, res, next) {
    try {
      const { city, limit, offset } = req.query;
      const data = await DistrictService.getAll({ city, limit: Number(limit) || 100, offset: Number(offset) || 0 });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getById(req, res, next) {
    try {
      const data = await DistrictService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const data = await DistrictService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const data = await DistrictService.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async delete(req, res, next) {
    try {
      await DistrictService.delete(req.params.id);
      res.json({ success: true, message: 'District deleted' });
    } catch (e) { next(e); }
  },
};
