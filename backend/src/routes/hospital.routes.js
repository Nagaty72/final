import { Router } from 'express';
import { HospitalController } from '../controllers/hospital.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

router.get('/', HospitalController.getAll);
router.get('/nearby', HospitalController.findNearby);
router.get('/:id', HospitalController.getById);
router.post('/', authorize('super_admin'), HospitalController.create);
router.put('/:id', authorize('super_admin'), HospitalController.update);
router.delete('/:id', authorize('super_admin'), HospitalController.delete);

export default router;
