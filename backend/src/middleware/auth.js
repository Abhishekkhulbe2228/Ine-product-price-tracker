import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Middleware to authenticate cron/scrape requests using Bearer token.
 * Only the /api/scrape/run endpoint should use this.
 */
export function authenticateCron(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('AUTH', 'Missing or malformed Authorization header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  if (token !== env.cronSecret) {
    logger.warn('AUTH', 'Invalid cron secret');
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}
