import { Router } from 'express';
import { MedicalRecordController } from '../controllers/medical-record.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

router.get('/', MedicalRecordController.getAll);
router.get('/:id', MedicalRecordController.getById);
router.post('/', authorize('super_admin', 'decision_maker', 'normal_user'), MedicalRecordController.create);
router.put('/:id', authorize('super_admin', 'decision_maker'), MedicalRecordController.update);
router.delete('/:id', authorize('super_admin'), MedicalRecordController.delete);

export default router;
