import logger from '../utils/logger.js';
import { launchBrowser, closeBrowser } from '../scraper/browser.js';
import { scrapeProduct } from '../scraper/productScraper.js';
import { getActiveTrackedProducts } from './tracking.service.js';
import {
  createScrapeRun,
  completeScrapeRun,
  insertPriceHistory,
  insertScrapeLog,
} from './history.service.js';

let isScraping = false;

/**
 * Run the scraper for all active tracked products.
 * This is the main orchestrator called by the cron and manual endpoints.
 * 
 * @param {string} triggerType - 'cron', 'manual', or 'headed'
 * @returns {Object} Summary of the scrape run
 */
export async function runScraper(triggerType = 'manual') {
  if (isScraping) {
    logger.warn('SCRAPER', `Scrape run already in progress, skipping trigger: ${triggerType}`);
    return {
      success: false,
      message: 'Scrape run already in progress',
      timestamp: new Date().toISOString(),
    };
  }

  isScraping = true;
  try {
    logger.info('SCRAPER', `Starting scrape run (trigger: ${triggerType})`);

    // 1. Load active tracked products
    const products = await getActiveTrackedProducts();

    if (products.length === 0) {
      logger.info('SCRAPER', 'No active tracked products to scrape');
      return {
        success: true,
        processed: 0,
        successful: 0,
        failed: 0,
        timestamp: new Date().toISOString(),
      };
    }

  // 2. Create scrape run record
  const run = await createScrapeRun(triggerType);

  // 3. Launch browser
  const headless = triggerType !== 'headed';
  await launchBrowser(headless);

  let successCount = 0;
  let failCount = 0;

  try {
    // 4. Scrape each product sequentially
    for (const product of products) {
      try {
        const result = await scrapeProduct(product, async (attemptData) => {
          // Log every attempt to the database
          await insertScrapeLog({
            trackedProductId: product.id,
            scrapeRunId: run.id,
            attemptNumber: attemptData.attempt,
            outcome: attemptData.outcome,
            price: attemptData.price,
            stock: attemptData.stock,
            errorMessage: attemptData.errorMessage,
            durationMs: attemptData.durationMs,
          });
        });

        if (result.success) {
          // Save successful price snapshot
          await insertPriceHistory(
            product.id,
            result.price,
            result.stock,
            new Date().toISOString()
          );
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        // Failure isolation: one product failing doesn't stop the rest
        logger.error('SCRAPER', `Unexpected error scraping product ${product.id}: ${err.message}`);
        failCount++;

        // Still log the failure
        await insertScrapeLog({
          trackedProductId: product.id,
          scrapeRunId: run.id,
          attemptNumber: 1,
          outcome: 'failed',
          price: null,
          stock: null,
          errorMessage: `Unexpected: ${err.message}`,
          durationMs: 0,
        }).catch(() => {}); // Don't let logging failure stop the run
      }
    }
  } finally {
    // 5. Always close browser
    await closeBrowser();
  }

    // 6. Complete the scrape run record
    const status = failCount === products.length ? 'failed' : 'completed';
    await completeScrapeRun(run.id, {
      totalProducts: products.length,
      successful: successCount,
      failed: failCount,
      status,
    });

    const summary = {
      success: true,
      processed: products.length,
      successful: successCount,
      failed: failCount,
      runId: run.id,
      timestamp: new Date().toISOString(),
    };

    logger.info('SCRAPER', `Scrape run complete`, summary);
    return summary;
  } finally {
    isScraping = false;
  }
}
