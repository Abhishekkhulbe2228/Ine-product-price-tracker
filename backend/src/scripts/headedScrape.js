/**
 * Headed scrape script.
 * Runs the scraper with a visible browser window so behavior can be observed.
 * Usage: npm run scrape:headed
 * 
 * This is intended for:
 *   - Demonstrating scraper behavior to reviewers
 *   - Recording a screen capture of the scraping process
 *   - Debugging selector or timing issues
 */
import '../config/env.js';
import { runScraper } from '../services/scraper.service.js';
import logger from '../utils/logger.js';

async function main() {
  logger.info('SCRIPT', '=== HEADED SCRAPE MODE ===');
  logger.info('SCRIPT', 'Browser will open visibly. Watch the scraping process.');
  logger.info('SCRIPT', '');

  try {
    const result = await runScraper('headed');

    logger.info('SCRIPT', '');
    logger.info('SCRIPT', '=== HEADED SCRAPE RESULTS ===');
    logger.info('SCRIPT', `Products processed: ${result.processed}`);
    logger.info('SCRIPT', `Successful: ${result.successful}`);
    logger.info('SCRIPT', `Failed: ${result.failed}`);
    logger.info('SCRIPT', `Run ID: ${result.runId}`);

    // Keep process alive briefly so user can see final browser state
    await new Promise(resolve => setTimeout(resolve, 2000));
    process.exit(0);
  } catch (err) {
    logger.error('SCRIPT', `Headed scrape failed: ${err.message}`);
    process.exit(1);
  }
}

main();
