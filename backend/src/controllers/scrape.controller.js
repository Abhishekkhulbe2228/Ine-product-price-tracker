import { runScraper } from '../services/scraper.service.js';
import logger from '../utils/logger.js';

/**
 * Cron-triggered scrape endpoint.
 * Protected by authenticateCron middleware.
 */
export async function cronScrapeHandler(req, res, next) {
  try {
    logger.info('SCRAPE_API', 'Cron scrape triggered');
    const result = await runScraper('cron');
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Manual scrape endpoint (triggered from dashboard).
 */
export async function manualScrapeHandler(req, res, next) {
  try {
    logger.info('SCRAPE_API', 'Manual scrape triggered');
    const result = await runScraper('manual');
    res.json(result);
  } catch (err) {
    next(err);
  }
}
