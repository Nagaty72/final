import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

router.get('/', PatientController.getAll);
router.get('/:id', PatientController.getById);
router.post('/', authorize('super_admin'), PatientController.create);
router.put('/:id', authorize('super_admin'), PatientController.update);
router.delete('/:id', authorize('super_admin'), PatientController.delete);

export default router;
