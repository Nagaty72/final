import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (Super Admin only)
 * @access  Private (super_admin)
 */
router.get('/', authorize('super_admin'), UserController.getAll);

/**
 * @route   POST /api/v1/users
 * @desc    Create a new user (Super Admin only)
 * @access  Private (super_admin)
 */
router.post('/', authorize('super_admin'), UserController.create);

/**
 * @route   PATCH /api/v1/users/:id/role
 * @desc    Update user role (Super Admin only)
 * @access  Private (super_admin)
 */
router.patch('/:id/role', authorize('super_admin'), UserController.updateRole);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (Super Admin only)
 * @access  Private (super_admin)
 */
router.delete('/:id', authorize('super_admin'), UserController.delete);

export default router;
