import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

// GET all notifications for the authenticated user
router.get('/', NotificationController.getAll);

// GET all notifications — admin view (Super Admin only)
router.get('/admin', authorize('super_admin'), NotificationController.getAllAdmin);

// PATCH mark all as read
router.patch('/read-all', NotificationController.markAllAsRead);

// PATCH mark specific notification as read
router.patch('/:id/read', NotificationController.markAsRead);

// POST create a notification (Super Admin only)
router.post('/', authorize('super_admin'), NotificationController.create);

// PATCH update a notification (Super Admin only)
router.patch('/:id', authorize('super_admin'), NotificationController.update);

// DELETE a notification (Super Admin only)
router.delete('/:id', authorize('super_admin'), NotificationController.delete);

export default router;
