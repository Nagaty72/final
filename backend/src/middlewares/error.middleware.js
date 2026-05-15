import { ENV } from '../config/env.js';

/**
 * Global error handling middleware.
 * Catches all unhandled errors and returns a consistent JSON response.
 * In development mode, the full stack trace is included.
 */
export const errorHandler = (err, req, res, _next) => {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(ENV.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler for undefined routes.
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
};
