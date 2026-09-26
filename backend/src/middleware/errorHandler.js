import logger from '../utils/logger.js';

/**
 * Centralized Express error handler.
 * Catches unhandled errors from route handlers and returns safe responses.
 * Never exposes stack traces or internal details to the client.
 */
export function errorHandler(err, req, res, _next) {
  logger.error('SERVER', `Unhandled error: ${err.message}`, {
    path: req.path,
    method: req.method,
  });

  // Don't expose internal details
  res.status(err.status || 500).json({
    error: err.status ? err.message : 'Internal server error',
  });
}
