import { AuthService } from '../services/auth.service.js';

/**
 * AuthController — handles HTTP requests for authentication.
 */
export const AuthController = {
  /**
   * POST /api/v1/auth/register
   */
  async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/auth/check-email
   */
  async checkEmail(req, res, next) {
    try {
      const { email } = req.query;
      if (!email) return res.json({ success: true, data: { exists: false } });
      const exists = await AuthService.checkEmail(email);
      res.json({ success: true, data: { exists } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body);
      res.json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshAccessToken(refreshToken);
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await AuthService.logout(refreshToken);
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/auth/me
   * Requires authMiddleware to run first.
   */
  async getMe(req, res, next) {
    try {
      // Return the hydrated user directly from the middleware
      // This avoids a 404 if the user isn't fully synced in the db yet,
      // while still returning the correct role from the DB.
      res.json({
        success: true,
        data: req.user,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/auth/me
   */
  async updateMe(req, res, next) {
    try {
      const updatedUser = await AuthService.updateProfile(req.user.id, req.body);
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },
};
