import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateUserSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public routes (no auth required)
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refresh);
router.get('/check-email', AuthController.checkEmail);

// Protected routes
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/me', authMiddleware, AuthController.getMe);
router.put('/me', authMiddleware, validate(updateUserSchema), AuthController.updateMe);

export default router;
