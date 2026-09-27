import { runScraper } from '../services/scraper.service.js';
import logger from '../utils/logger.js';

/**
 * Cron-triggered scrape endpoint.
 * Protected by authenticateCron middleware.
 * Returns 202 Accepted immediately and runs scraping in the background.
 */
export async function cronScrapeHandler(req, res, next) {
  try {
    logger.info('SCRAPE_API', 'Cron scrape triggered (async)');
    runScraper('cron').catch(err => {
      logger.error('SCRAPE_API', `Background cron scrape failed: ${err.message}`);
    });

    res.status(202).json({
      success: true,
      message: 'Scrape run accepted and started in background',
      status: 'accepted',
      trigger: 'cron',
    });
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
