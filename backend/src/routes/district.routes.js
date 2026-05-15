import { Router } from 'express';
import { DistrictController } from '../controllers/district.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

router.get('/', DistrictController.getAll);
router.get('/:id', DistrictController.getById);
router.post('/', authorize('super_admin'), DistrictController.create);
router.put('/:id', authorize('super_admin'), DistrictController.update);
router.delete('/:id', authorize('super_admin'), DistrictController.delete);

export default router;
