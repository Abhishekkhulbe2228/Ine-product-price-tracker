import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Product search service.
 * Fetches all products from the INE store API and caches them.
 * Since the store has no server-side search and returns random order,
 * we fetch the entire catalog and filter locally.
 */

let cachedProducts = [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let fetchInProgress = null;

/**
 * Fetch all products from the INE mock store API.
 * Paginates through all pages (48 pages x 20 = 960 products).
 */
async function fetchPageWithRetry(url, page, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Store API returned ${response.status} on page ${page}`);
      }
      return await response.json();
    } catch (err) {
      if (attempt >= maxRetries) throw err;
      const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      logger.warn('SEARCH', `Page ${page} attempt ${attempt} failed (${err.message}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function fetchAllProducts() {
  const allProducts = [];
  const limit = 20;
  let page = 1;
  let totalPages = 1;

  logger.info('SEARCH', 'Fetching full product catalog from store...');

  while (page <= totalPages) {
    const url = `${env.mockStoreUrl}/api/v2/listings?page=${page}&limit=${limit}`;
    const data = await fetchPageWithRetry(url, page);
    totalPages = data.totalPages;
    allProducts.push(...data.results);
    page++;
  }

  logger.info('SEARCH', `Fetched ${allProducts.length} products in ${totalPages} pages`);
  return allProducts;
}

/**
 * Get cached products, refreshing if stale.
 */
async function getCachedProducts() {
  const now = Date.now();

  if (cachedProducts.length > 0 && (now - lastFetchTime) < CACHE_TTL_MS) {
    return cachedProducts;
  }

  // Prevent concurrent fetches
  if (fetchInProgress) {
    return fetchInProgress;
  }

  fetchInProgress = fetchAllProducts()
    .then(products => {
      cachedProducts = products;
      lastFetchTime = Date.now();
      fetchInProgress = null;
      return products;
    })
    .catch(err => {
      fetchInProgress = null;
      logger.error('SEARCH', `Failed to fetch catalog: ${err.message}`);
      // Return stale cache if available
      if (cachedProducts.length > 0) {
        logger.warn('SEARCH', 'Returning stale cache');
        return cachedProducts;
      }
      throw err;
    });

  return fetchInProgress;
}

/**
 * Search products by query string.
 * Matches against name, brand, and category (case-insensitive).
 */
export async function searchProducts(query) {
  const products = await getCachedProducts();

  if (!query || query.trim() === '') {
    // Return first 20 products if no query
    return products.slice(0, 20);
  }

  const q = query.toLowerCase().trim();

  return products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.sku.toLowerCase().includes(q)
  );
}

/**
 * Fetch product details including options from the store API.
 */
export async function getProductDetails(productId) {
  const id = parseInt(productId, 10);
  if (isNaN(id) || id <= 0) {
    throw new Error('Invalid product ID');
  }

  const url = `${env.mockStoreUrl}/api/v2/items/${id}`;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url);

    if (response.ok) {
      return response.json();
    }

    if (response.status === 404) {
      return null;
    }

    // Retry on 429/503
    if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
      const delay = 1000 * Math.pow(2, attempt - 1);
      logger.warn('SEARCH', `Product ${id} details attempt ${attempt} got ${response.status}, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }

    throw new Error(`Store API returned ${response.status}`);
  }
}

/**
 * Force refresh the product cache.
 */
export async function refreshCache() {
  lastFetchTime = 0;
  return getCachedProducts();
}
