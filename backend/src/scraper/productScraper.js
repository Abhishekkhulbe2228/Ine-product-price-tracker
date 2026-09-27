import env from '../config/env.js';
import logger from '../utils/logger.js';
import SELECTORS from './selectors.js';
import { validateScrapeResult } from './validator.js';
import { backoffSleep, isRetryableError } from './retry.js';
import { createPage } from './browser.js';

/**
 * Scrape price and stock for a single tracked product.
 * Implements retry logic with exponential backoff.
 * 
 * @param {Object} trackedProduct - The tracked product record from DB
 * @param {Function} onAttempt - Callback for each attempt (for logging to DB)
 * @returns {Object} { success, price, stock, attempts }
 */
export async function scrapeProduct(trackedProduct, onAttempt) {
  const {
    store_product_id,
    product_name,
    selected_option_id,
    selected_option_label,
  } = trackedProduct;

  const productUrl = `${env.mockStoreUrl}/item/${store_product_id}`;
  const maxRetries = env.maxRetries;

  logger.info('SCRAPE', `Starting product ${store_product_id} (${product_name})`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    let context = null;
    let page = null;

    try {
      logger.info('SCRAPE', `Attempt ${attempt}/${maxRetries} for product ${store_product_id}`);

      // Create isolated page for this attempt
      ({ context, page } = await createPage());

      // STAGE: PAGE_LOAD
      logger.info('SCRAPE', `Navigating to ${productUrl}`);
      await page.goto(productUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: env.scrapeTimeoutMs,
      });

      // Wait for the product page to render
      await page.waitForSelector(SELECTORS.productTitle, { timeout: 15000 });

      // STAGE: PRODUCT_VERIFICATION
      const pageTitle = await page.textContent(SELECTORS.productTitle);
      logger.info('SCRAPE', `Page title: "${pageTitle}"`);

      // Helper: dismiss cookie consent modal if it appears (handles multi-click behavior)
      const dismissConsentIfPresent = async () => {
        try {
          let scrim = await page.$(SELECTORS.consentScrim);
          if (!scrim) return false;

          let clicks = 0;
          while (clicks < 4) {
            const allowBtn = await page.$(SELECTORS.consentAllowButton);
            if (!allowBtn) break;

            await allowBtn.click({ timeout: 1000 }).catch(async () => {
              // Fallback: direct evaluate click if pointer event was intercepted
              await page.evaluate(() => {
                const btn = document.querySelector('.consent-box button');
                if (btn) btn.click();
              });
            });
            clicks++;

            // Wait for React to process state update or remove scrim
            await page.waitForSelector(SELECTORS.consentScrim, { state: 'detached', timeout: 150 }).catch(() => {});
            
            scrim = await page.$(SELECTORS.consentScrim);
            if (!scrim) break;
          }

          if (clicks > 0) {
            logger.info('SCRAPE', `Dismissed cookie consent banner (${clicks} click(s))`);
          }
          return true;
        } catch {
          return false;
        }
      };

      // Helper: click an element safely, handling consent scrim interruptions without 15s timeout
      const safeClick = async (element, timeoutMs = 3000) => {
        await dismissConsentIfPresent();
        try {
          await element.click({ timeout: timeoutMs });
        } catch (err) {
          if (err.message && err.message.includes('consent-scrim')) {
            logger.info('SCRAPE', 'Click intercepted by consent scrim; dismissing and retrying click...');
            await dismissConsentIfPresent();
            await element.click({ timeout: timeoutMs });
          } else {
            throw err;
          }
        }
      };

      await dismissConsentIfPresent();

      // STAGE: OPTION_SELECTION
      // Wait for option chips to be visible
      const optionChips = await page.$$(SELECTORS.optionChip);

      if (optionChips.length > 0) {
        // Find and click the target option
        let optionFound = false;
        for (const chip of optionChips) {
          const rawLabel = await chip.textContent();
          const cleanLabel = rawLabel.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
          const targetLabel = selected_option_label.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
          if (cleanLabel === targetLabel) {
            await safeClick(chip, 3000);
            optionFound = true;
            logger.info('SCRAPE', `Selected option: "${selected_option_label}"`);
            // Condition-based wait for option selection class to register
            await page.waitForSelector(SELECTORS.optionChipSelected, { timeout: 1500 }).catch(() => {});
            break;
          }
        }
        if (!optionFound) {
          throw new Error(`Option "${selected_option_label}" not found on page`);
        }
      }

      // STAGE: PRICE_TRIGGER
      await dismissConsentIfPresent();

      // Check if price area is locked (requires mouse movement/hover to unlock)
      const offerPanel = await page.$(SELECTORS.offerPanel);
      if (offerPanel) {
        const isLocked = await page.$(SELECTORS.offerLocked);
        if (isLocked) {
          logger.info('SCRAPE', 'Offer panel locked, simulating mouse movement to unlock...');
          const box = await offerPanel.boundingBox();
          if (box) {
            // Store's anti-bot requirement: >= 8 moves spaced >= 40ms, dwell >= 600ms
            for (let i = 0; i < 10; i++) {
              await page.mouse.move(box.x + 20 + i * 15, box.y + 20 + (i % 3) * 10);
              await page.waitForTimeout(45);
            }
          }
        }
      }

      await dismissConsentIfPresent();

      // Click "Check today's price" button
      const checkPriceBtn = await page.$(SELECTORS.checkPriceButton);
      if (!checkPriceBtn) {
        // Price might already be loaded (e.g., if offer-ready already visible)
        const alreadyReady = await page.$(SELECTORS.offerReady);
        if (!alreadyReady) {
          throw new Error('Check price button not found and price not loaded');
        }
      } else {
        // Wait for button to become enabled (condition-based wait replaces fixed 600ms sleep)
        // The store checks dwell >= 600ms on a 250ms interval
        await page.waitForFunction(
          (btnSelector) => {
            const btn = document.querySelector(btnSelector);
            return btn && !btn.disabled;
          },
          SELECTORS.checkPriceButton,
          { timeout: 2500 }
        ).catch(() => {
          logger.warn('SCRAPE', 'Button did not become enabled within condition timeout');
        });

        const isDisabled = await page.evaluate(el => el.disabled, checkPriceBtn);
        if (isDisabled) {
          throw new Error('Price loading failed: Offer button remained disabled');
        }

        await safeClick(checkPriceBtn, 3000);
        logger.info('SCRAPE', 'Clicked "Check today\'s price"');
      }

      // STAGE: PRICE_WAIT
      // Fast-fail if the store dropped the click (35% drop rate in mock store)
      // When accepted, quote loading starts immediately (< 300ms). If dropped, button remains idle.
      const quoteStarted = await Promise.race([
        page.waitForSelector(
          `${SELECTORS.offerLoading}, ${SELECTORS.offerReady}, ${SELECTORS.offerFailed}`,
          { timeout: 3500 }
        ).then(() => true).catch(() => false),
        page.waitForFunction(
          (btnSelector) => {
            const btn = document.querySelector(btnSelector);
            return !btn || btn.offsetParent === null;
          },
          SELECTORS.checkPriceButton,
          { timeout: 3500 }
        ).then(() => true).catch(() => false),
      ]);

      if (!quoteStarted) {
        const alreadyResolved = await page.$(`${SELECTORS.offerReady}, ${SELECTORS.offerFailed}`);
        if (!alreadyResolved) {
          throw new Error('Price loading failed: Click dropped by store (quote pipeline did not start)');
        }
      }

      // Quote pipeline started; wait for price to resolve (success or failure)
      await page.waitForSelector(
        `${SELECTORS.offerReady}, ${SELECTORS.offerFailed}`,
        { timeout: 15000 }
      );

      // Check if price loading failed
      const failedPanel = await page.$(SELECTORS.offerFailed);
      if (failedPanel) {
        const errorMsg = await page.textContent(SELECTORS.offerMessage).catch(() => 'Unknown error');
        throw new Error(`Price loading failed: ${errorMsg}`);
      }

      // STAGE: PRICE_EXTRACTION
      // Try multiple extraction strategies for price
      let rawPrice = null;

      // Strategy 1: hidden .price-value span
      const priceValueEl = await page.$(SELECTORS.priceValue);
      if (priceValueEl) {
        rawPrice = await priceValueEl.textContent();
      }

      // Strategy 2: span[data-price] if strategy 1 returned empty
      if (!rawPrice || rawPrice.trim() === '') {
        const dataPriceEl = await page.$(SELECTORS.priceDataSpan);
        if (dataPriceEl) {
          rawPrice = await dataPriceEl.textContent();
        }
      }

      // Strategy 3: find any strong/span with currency symbol inside offer-ready
      if (!rawPrice || rawPrice.trim() === '') {
        rawPrice = await page.evaluate(() => {
          const panel = document.querySelector('.offer-ready');
          if (!panel) return null;
          // Look for element containing ₹ symbol
          const allText = panel.querySelectorAll('strong, span');
          for (const el of allText) {
            const t = el.textContent.trim();
            if (/₹[\d,\s\u200B-\u200D\uFEFF]+/.test(t)) return t;
          }
          return null;
        });
      }

      logger.info('SCRAPE', `Raw price: "${rawPrice}"`);

      // STAGE: STOCK_EXTRACTION
      let rawStock = null;
      const stockEl = await page.$(SELECTORS.stockPill);
      if (stockEl) {
        rawStock = await stockEl.textContent();
      }

      // Fallback: check for sold out
      if (!rawStock) {
        const soldOut = await page.$(SELECTORS.stockSoldOut);
        if (soldOut) {
          rawStock = 'Sold out';
        }
      }

      logger.info('SCRAPE', `Raw stock: "${rawStock}"`);

      // STAGE: VALIDATION
      // Get the currently selected option text
      const selectedChip = await page.$(SELECTORS.optionChipSelected);
      const selectedOptionText = selectedChip
        ? (await selectedChip.textContent()).replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
        : selected_option_label; // fallback

      const validation = validateScrapeResult({
        rawPrice,
        rawStock,
        pageTitle,
        expectedName: product_name,
        selectedOptionText,
        expectedOptionLabel: selected_option_label,
      });

      const durationMs = Date.now() - startTime;

      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.reason}`);
      }

      // SUCCESS
      logger.info('SCRAPE', `Success - Price: ${validation.price}, Stock: ${validation.stock}`, {
        durationMs,
        attempt,
      });

      if (onAttempt) {
        await onAttempt({
          attempt,
          outcome: 'success',
          price: validation.price,
          stock: validation.stock,
          durationMs,
          errorMessage: null,
        });
      }

      return {
        success: true,
        price: validation.price,
        stock: validation.stock,
        attempts: attempt,
      };

    } catch (error) {
      const durationMs = Date.now() - startTime;
      const isLast = attempt >= maxRetries;
      const outcome = isLast ? 'failed' : 'retried';

      logger.warn('SCRAPE', `Attempt ${attempt}/${maxRetries} failed: ${error.message}`, {
        durationMs,
        outcome,
      });

      if (onAttempt) {
        await onAttempt({
          attempt,
          outcome,
          price: null,
          stock: null,
          durationMs,
          errorMessage: error.message,
        });
      }

      if (isLast) {
        logger.error('SCRAPE', `Failed after ${maxRetries} attempts for product ${store_product_id}`);
        return {
          success: false,
          price: null,
          stock: null,
          attempts: attempt,
          error: error.message,
        };
      }

      // Retry with backoff
      if (isRetryableError(error)) {
        await backoffSleep(attempt);
      } else {
        // Non-retryable errors still get remaining attempts in case of transient issue
        logger.warn('SCRAPE', `Non-standard error, retrying anyway: ${error.message}`);
        await backoffSleep(attempt);
      }

    } finally {
      // Clean up the page/context for this attempt
      if (context) {
        try {
          await context.close();
        } catch { /* ignore cleanup errors */ }
      }
    }
  }

  // Should not reach here, but safety net
  return { success: false, price: null, stock: null, attempts: env.maxRetries };
}
