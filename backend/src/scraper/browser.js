import { chromium } from 'playwright';
import logger from '../utils/logger.js';

let browserInstance = null;

/**
 * Launch a shared browser instance. Reused across all products in a scrape run.
 * @param {boolean} headless - false for headed/debug mode
 */
export async function launchBrowser(headless = true) {
  if (browserInstance) {
    logger.warn('BROWSER', 'Browser already running, closing previous instance');
    await closeBrowser();
  }

  logger.info('BROWSER', `Launching browser (headless: ${headless})`);

  browserInstance = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  return browserInstance;
}

/**
 * Create a new browser context and page.
 * Each product gets its own context for isolation.
 */
export async function createPage() {
  if (!browserInstance) {
    throw new Error('Browser not launched. Call launchBrowser() first.');
  }

  const context = await browserInstance.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) INEPriceTracker/1.0',
  });

  const page = await context.newPage();

  // Set default timeouts
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);

  return { context, page };
}

/**
 * Close the shared browser instance.
 */
export async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
      logger.info('BROWSER', 'Browser closed');
    } catch (err) {
      logger.error('BROWSER', `Error closing browser: ${err.message}`);
    } finally {
      browserInstance = null;
    }
  }
}

export function isBrowserRunning() {
  return browserInstance !== null;
}
