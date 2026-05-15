import { Router } from 'express';
import { DiseaseController } from '../controllers/disease.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

router.get('/', DiseaseController.getAll);
router.get('/:id', DiseaseController.getById);
router.post('/', authorize('super_admin', 'decision_maker'), DiseaseController.create);
router.put('/:id', authorize('super_admin', 'decision_maker'), DiseaseController.update);
router.delete('/:id', authorize('super_admin'), DiseaseController.delete);

export default router;
