/**
 * Manual scrape script.
 * Runs the scraper once for all active tracked products in headless mode.
 * Usage: npm run scrape:manual
 */
import '../config/env.js';
import { runScraper } from '../services/scraper.service.js';
import logger from '../utils/logger.js';

async function main() {
  logger.info('SCRIPT', 'Starting manual scrape...');

  try {
    const result = await runScraper('manual');
    logger.info('SCRIPT', 'Manual scrape complete', result);
    process.exit(0);
  } catch (err) {
    logger.error('SCRIPT', `Manual scrape failed: ${err.message}`);
    process.exit(1);
  }
}

main();
