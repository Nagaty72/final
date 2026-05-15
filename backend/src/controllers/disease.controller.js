import { DiseaseService } from '../services/disease.service.js';

export const DiseaseController = {
  async getAll(req, res, next) {
    try {
      const { category, isChronic, limit, offset } = req.query;
      const data = await DiseaseService.getAll({ category, isChronic: isChronic === 'true' ? true : isChronic === 'false' ? false : undefined, limit: Number(limit) || 50, offset: Number(offset) || 0 });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getById(req, res, next) {
    try {
      const data = await DiseaseService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const data = await DiseaseService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const data = await DiseaseService.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async delete(req, res, next) {
    try {
      await DiseaseService.delete(req.params.id);
      res.json({ success: true, message: 'Disease deleted' });
    } catch (e) { next(e); }
  },
};
