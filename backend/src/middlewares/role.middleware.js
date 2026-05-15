/**
 * Role-based authorization middleware factory.
 *
 * Usage in routes:
 *   router.get('/admin-only', authorize('super_admin'), controller.method)
 *   router.get('/reports', authorize('super_admin', 'decision_maker'), controller.method)
 *
 * @param  {...string} allowedRoles - Roles that are permitted to access the route.
 * @returns {Function} Express middleware
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // authMiddleware must run before this — it sets req.user
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${userRole}.`,
      });
    }

    next();
  };
};
