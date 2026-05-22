import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

// GET all notifications for the authenticated user
router.get('/', NotificationController.getAll);

// PATCH mark all as read
router.patch('/read-all', NotificationController.markAllAsRead);

// PATCH mark specific notification as read
router.patch('/:id/read', NotificationController.markAsRead);

// POST create a notification (Super Admin only)
router.post('/', authorize('super_admin'), NotificationController.create);

// DELETE a notification (Super Admin only)
router.delete('/:id', authorize('super_admin'), NotificationController.delete);

export default router;
