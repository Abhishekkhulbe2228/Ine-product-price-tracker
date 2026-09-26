import supabase from '../db/supabase.js';
import logger from '../utils/logger.js';

/**
 * Get price history for a tracked product.
 */
export async function getPriceHistory(trackedProductId, limit = 100) {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('tracked_product_id', trackedProductId)
    .order('scraped_at', { ascending: true })
    .limit(limit);

  if (error) {
    logger.error('HISTORY', `Failed to fetch price history: ${error.message}`);
    throw new Error(`Database error: ${error.message}`);
  }

  return data || [];
}

/**
 * Get scrape logs for a tracked product.
 */
export async function getScrapeLogs(trackedProductId, limit = 100) {
  const { data, error } = await supabase
    .from('scrape_logs')
    .select('*')
    .eq('tracked_product_id', trackedProductId)
    .order('attempted_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('HISTORY', `Failed to fetch scrape logs: ${error.message}`);
    throw new Error(`Database error: ${error.message}`);
  }

  return data || [];
}

/**
 * Insert a successful price snapshot.
 */
export async function insertPriceHistory(trackedProductId, price, stock, scrapedAt) {
  const { data, error } = await supabase
    .from('price_history')
    .insert({
      tracked_product_id: trackedProductId,
      price,
      stock,
      scraped_at: scrapedAt,
    })
    .select()
    .single();

  if (error) {
    logger.error('HISTORY', `Failed to insert price history: ${error.message}`);
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

/**
 * Insert a scrape log entry.
 */
export async function insertScrapeLog({
  trackedProductId,
  scrapeRunId,
  attemptNumber,
  outcome,
  price,
  stock,
  errorMessage,
  durationMs,
}) {
  const { data, error } = await supabase
    .from('scrape_logs')
    .insert({
      tracked_product_id: trackedProductId,
      scrape_run_id: scrapeRunId,
      attempt_number: attemptNumber,
      outcome,
      price: outcome === 'success' ? price : null,
      stock: outcome === 'success' ? stock : null,
      error_message: errorMessage,
      duration_ms: durationMs,
    })
    .select()
    .single();

  if (error) {
    logger.error('HISTORY', `Failed to insert scrape log: ${error.message}`);
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

/**
 * Create a scrape run record.
 */
export async function createScrapeRun(triggerType) {
  const { data, error } = await supabase
    .from('scrape_runs')
    .insert({ trigger_type: triggerType })
    .select()
    .single();

  if (error) {
    logger.error('HISTORY', `Failed to create scrape run: ${error.message}`);
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

/**
 * Complete a scrape run record.
 */
export async function completeScrapeRun(runId, { totalProducts, successful, failed, status }) {
  const { error } = await supabase
    .from('scrape_runs')
    .update({
      completed_at: new Date().toISOString(),
      total_products: totalProducts,
      successful,
      failed,
      status,
    })
    .eq('id', runId);

  if (error) {
    logger.error('HISTORY', `Failed to complete scrape run: ${error.message}`);
  }
}
