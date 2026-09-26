import supabase from '../db/supabase.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

/**
 * Create a new tracked product entry.
 */
export async function createTrackedProduct({
  storeProductId,
  productName,
  optionAxis,
  selectedOptionId,
  selectedOptionLabel,
}) {
  const productUrl = `${env.mockStoreUrl}/item/${storeProductId}`;

  const { data, error } = await supabase
    .from('tracked_products')
    .insert({
      store_product_id: storeProductId,
      product_name: productName,
      product_url: productUrl,
      option_axis: optionAxis,
      selected_option_id: selectedOptionId,
      selected_option_label: selectedOptionLabel,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation (duplicate tracking)
    if (error.code === '23505') {
      throw Object.assign(new Error('This product + option is already being tracked'), { status: 409 });
    }
    logger.error('TRACKING', `Failed to create tracked product: ${error.message}`);
    throw new Error(`Database error: ${error.message}`);
  }

  logger.info('TRACKING', `Created tracked product: ${productName} (${selectedOptionLabel})`, {
    id: data.id,
  });

  return data;
}

/**
 * Get all tracked products with their latest price.
 */
export async function getTrackedProducts() {
  const { data: products, error } = await supabase
    .from('tracked_products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('TRACKING', `Failed to fetch tracked products: ${error.message}`);
    throw new Error(`Database error: ${error.message}`);
  }

  // For each product, get the latest price_history entry and latest scrape_log
  const enriched = await Promise.all(products.map(async (product) => {
    // Latest successful price
    const { data: latestPrice } = await supabase
      .from('price_history')
      .select('*')
      .eq('tracked_product_id', product.id)
      .order('scraped_at', { ascending: false })
      .limit(1)
      .single();

    // Latest scrape attempt
    const { data: latestLog } = await supabase
      .from('scrape_logs')
      .select('*')
      .eq('tracked_product_id', product.id)
      .order('attempted_at', { ascending: false })
      .limit(1)
      .single();

    return {
      ...product,
      latest_price: latestPrice || null,
      latest_scrape: latestLog || null,
    };
  }));

  return enriched;
}

/**
 * Get a single tracked product by ID with latest data.
 */
export async function getTrackedProductById(id) {
  const { data: product, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !product) return null;

  const { data: latestPrice } = await supabase
    .from('price_history')
    .select('*')
    .eq('tracked_product_id', id)
    .order('scraped_at', { ascending: false })
    .limit(1)
    .single();

  const { data: latestLog } = await supabase
    .from('scrape_logs')
    .select('*')
    .eq('tracked_product_id', id)
    .order('attempted_at', { ascending: false })
    .limit(1)
    .single();

  return {
    ...product,
    latest_price: latestPrice || null,
    latest_scrape: latestLog || null,
  };
}

/**
 * Get all active tracked products (for scraping).
 */
export async function getActiveTrackedProducts() {
  const { data, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('is_active', true);

  if (error) {
    logger.error('TRACKING', `Failed to fetch active products: ${error.message}`);
    throw new Error(`Database error: ${error.message}`);
  }

  return data || [];
}

/**
 * Deactivate tracking for a product (soft delete).
 */
export async function deactivateTracking(id) {
  const { data, error } = await supabase
    .from('tracked_products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('TRACKING', `Failed to deactivate: ${error.message}`);
    throw new Error(`Database error: ${error.message}`);
  }

  if (!data) return null;

  logger.info('TRACKING', `Deactivated tracking for product ${id}`);
  return data;
}
